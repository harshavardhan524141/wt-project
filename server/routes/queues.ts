import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Helper to calculate queue position and estimated wait
function getQueuePosition(serviceId: number, tokenId: number): { position: number; waitingAhead: number } {
  const currentToken = db.prepare('SELECT id, joined_at, status FROM queue_tokens WHERE id = ?').get(tokenId) as { id: number; joined_at: string; status: string } | undefined;
  if (!currentToken || currentToken.status !== 'waiting') {
    return { position: 0, waitingAhead: 0 };
  }

  const ahead = db.prepare(`
    SELECT COUNT(*) as count 
    FROM queue_tokens 
    WHERE service_id = ? 
      AND status = 'waiting' 
      AND (joined_at < ? OR (joined_at = ? AND id <= ?))
  `).get(serviceId, currentToken.joined_at, currentToken.joined_at, currentToken.id) as { count: number };

  const position = ahead ? ahead.count : 1;
  return { position, waitingAhead: Math.max(0, position - 1) };
}

// ----------------------------------------------------
// CUSTOMER PORTAL QUEUE ENDPOINTS
// ----------------------------------------------------

// Join a service queue (Apply for token)
router.post('/join', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const {
      service_id,
      notes,
      customer_name,
      customer_phone,
      customer_email,
      verification_method
    } = req.body;

    if (!service_id) {
      res.status(400).json({ error: 'Service queue selection is required.' });
      return;
    }

    const service = db.prepare(`
      SELECT s.*, sc.id as center_id, sc.name as center_name, sc.is_active as center_active, sc.category as center_category
      FROM services s
      JOIN service_centers sc ON s.center_id = sc.id
      WHERE s.id = ?
    `).get(Number(service_id)) as any;

    if (!service) {
      res.status(404).json({ error: 'Selected service could not be found.' });
      return;
    }

    if (!service.is_active || !service.center_active) {
      res.status(400).json({ error: 'This location/service counter is currently closed.' });
      return;
    }

    // Check if customer already has an active token in this service
    const existingActive = db.prepare(`
      SELECT id, token_number, status 
      FROM queue_tokens 
      WHERE user_id = ? AND service_id = ? AND status IN ('waiting', 'now_serving')
    `).get(userId, service.id) as { id: number; token_number: string; status: string } | undefined;

    if (existingActive) {
      res.status(400).json({
        error: `You already hold active Token ${existingActive.token_number} for ${service.name}. Track your token or wait until called.`,
        activeTokenId: existingActive.id
      });
      return;
    }

    const name = customer_name?.trim() || req.user!.name;
    const phone = customer_phone?.trim() || '';
    const email = customer_email?.trim() || req.user!.email;

    // Atomic transaction: sequence generation & insertion
    const joinTransaction = db.transaction(() => {
      const maxSeqRow = db.prepare(`
        SELECT COALESCE(MAX(sequence_number), 100) as max_seq 
        FROM queue_tokens 
        WHERE service_id = ?
      `).get(service.id) as { max_seq: number };

      const nextSequence = Number(maxSeqRow.max_seq) + 1;
      const tokenNumber = `${service.prefix}-${nextSequence}`;
      const now = new Date().toISOString();

      // Count people currently waiting
      const waitingCountRow = db.prepare(`
        SELECT COUNT(*) as count FROM queue_tokens WHERE service_id = ? AND status = 'waiting'
      `).get(service.id) as { count: number };

      const estimatedWaitMins = (waitingCountRow.count + 1) * service.avg_service_time_mins;

      const insertTokenStmt = db.prepare(`
        INSERT INTO queue_tokens (
          service_id, center_id, user_id, customer_name, customer_phone, customer_email,
          token_number, sequence_number, status, notes, verification_method, joined_at, estimated_wait_mins
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting', ?, ?, ?, ?)
      `);

      const tokenResult = insertTokenStmt.run(
        service.id,
        service.center_id,
        userId,
        name,
        phone,
        email,
        tokenNumber,
        nextSequence,
        notes?.trim() || service.name,
        verification_method || 'Verified Customer',
        now,
        estimatedWaitMins
      );

      const tokenId = Number(tokenResult.lastInsertRowid);

      // Audit log
      db.prepare(`
        INSERT INTO queue_history_logs (token_id, previous_status, new_status, changed_by, note, created_at)
        VALUES (?, NULL, 'waiting', ?, 'Token generated in Customer Portal', ?)
      `).run(tokenId, userId, now);

      return { tokenId, tokenNumber, nextSequence, estimatedWaitMins };
    });

    const result = joinTransaction();

    // Fetch complete token info
    const fullToken = db.prepare(`
      SELECT qt.*, s.name as service_name, s.prefix as service_prefix, s.avg_service_time_mins,
             sc.name as center_name, sc.address as center_address, sc.category as center_category
      FROM queue_tokens qt
      JOIN services s ON qt.service_id = s.id
      JOIN service_centers sc ON qt.center_id = sc.id
      WHERE qt.id = ?
    `).get(result.tokenId) as any;

    const { position, waitingAhead } = getQueuePosition(service.id, result.tokenId);

    res.status(201).json({
      message: 'Token issued successfully',
      token: {
        ...fullToken,
        position,
        waiting_ahead: waitingAhead
      }
    });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to issue token. Please try again.' });
  }
});

// Get user's active tokens
router.get('/my-active', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;

    const activeTokens = db.prepare(`
      SELECT qt.*, 
             s.name as service_name, 
             s.prefix as service_prefix, 
             s.avg_service_time_mins,
             sc.name as center_name, 
             sc.address as center_address,
             sc.category as center_category,
             (SELECT token_number FROM queue_tokens WHERE service_id = qt.service_id AND status = 'now_serving' ORDER BY called_at DESC LIMIT 1) as currently_serving,
             (SELECT counter_desk FROM queue_tokens WHERE service_id = qt.service_id AND status = 'now_serving' ORDER BY called_at DESC LIMIT 1) as currently_serving_counter
      FROM queue_tokens qt
      JOIN services s ON qt.service_id = s.id
      JOIN service_centers sc ON qt.center_id = sc.id
      WHERE qt.user_id = ? AND qt.status IN ('waiting', 'now_serving')
      ORDER BY qt.joined_at DESC
    `).all(userId) as any[];

    const enriched = activeTokens.map((t) => {
      const { position, waitingAhead } = getQueuePosition(t.service_id, t.id);
      return {
        ...t,
        position,
        waiting_ahead: waitingAhead
      };
    });

    res.json({ tokens: enriched });
  } catch (error) {
    console.error('Error fetching active tokens:', error);
    res.status(500).json({ error: 'Failed to retrieve active tokens.' });
  }
});

// Get user's queue history
router.get('/my-history', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const userId = req.user!.id;

    const history = db.prepare(`
      SELECT qt.*, 
             s.name as service_name, 
             s.prefix as service_prefix, 
             sc.name as center_name, 
             sc.address as center_address,
             sc.category as center_category
      FROM queue_tokens qt
      JOIN services s ON qt.service_id = s.id
      JOIN service_centers sc ON qt.center_id = sc.id
      WHERE qt.user_id = ?
      ORDER BY qt.joined_at DESC
    `).all(userId);

    res.json({ history });
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to retrieve history.' });
  }
});

// Get single token live status
router.get('/status/:id', (req, res: Response): void => {
  try {
    const tokenId = Number(req.params.id);

    const token = db.prepare(`
      SELECT qt.*, 
             s.name as service_name, 
             s.prefix as service_prefix, 
             s.avg_service_time_mins,
             sc.name as center_name, 
             sc.address as center_address, 
             sc.phone as center_phone,
             sc.category as center_category,
             u.name as user_name,
             u.email as user_email,
             (SELECT token_number FROM queue_tokens WHERE service_id = qt.service_id AND status = 'now_serving' ORDER BY called_at DESC LIMIT 1) as currently_serving,
             (SELECT counter_desk FROM queue_tokens WHERE service_id = qt.service_id AND status = 'now_serving' ORDER BY called_at DESC LIMIT 1) as currently_serving_counter,
             (SELECT COUNT(*) FROM queue_tokens WHERE service_id = qt.service_id AND status = 'waiting') as total_waiting_in_service
      FROM queue_tokens qt
      JOIN services s ON qt.service_id = s.id
      JOIN service_centers sc ON qt.center_id = sc.id
      JOIN users u ON qt.user_id = u.id
      WHERE qt.id = ?
    `).get(tokenId) as any;

    if (!token) {
      res.status(404).json({ error: 'Token not found.' });
      return;
    }

    const { position, waitingAhead } = getQueuePosition(token.service_id, token.id);

    const logs = db.prepare(`
      SELECT qhl.*, u.name as changed_by_name
      FROM queue_history_logs qhl
      LEFT JOIN users u ON qhl.changed_by = u.id
      WHERE qhl.token_id = ?
      ORDER BY qhl.created_at ASC
    `).all(tokenId);

    res.json({
      token: {
        ...token,
        position,
        waiting_ahead: waitingAhead,
        logs
      }
    });
  } catch (error) {
    console.error('Error fetching token status:', error);
    res.status(500).json({ error: 'Failed to retrieve status.' });
  }
});

// Cancel waiting token
router.post('/cancel/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const tokenId = Number(req.params.id);
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const token = db.prepare('SELECT * FROM queue_tokens WHERE id = ?').get(tokenId) as any;
    if (!token) {
      res.status(404).json({ error: 'Token not found.' });
      return;
    }

    if (!isAdmin && token.user_id !== userId) {
      res.status(403).json({ error: 'You are not authorized to cancel this token.' });
      return;
    }

    if (token.status !== 'waiting') {
      res.status(400).json({
        error: `Cannot cancel token in '${token.status}' state. Only waiting tokens can be cancelled.`
      });
      return;
    }

    const now = new Date().toISOString();

    const cancelTx = db.transaction(() => {
      db.prepare(`
        UPDATE queue_tokens 
        SET status = 'cancelled', completed_at = ?
        WHERE id = ?
      `).run(now, tokenId);

      db.prepare(`
        INSERT INTO queue_history_logs (token_id, previous_status, new_status, changed_by, note, created_at)
        VALUES (?, 'waiting', 'cancelled', ?, 'Cancelled by customer', ?)
      `).run(tokenId, userId, now);
    });

    cancelTx();

    res.json({ message: 'Token cancelled successfully.', status: 'cancelled' });
  } catch (error) {
    console.error('Error cancelling token:', error);
    res.status(500).json({ error: 'Failed to cancel token.' });
  }
});

// ----------------------------------------------------
// ADMIN PORTAL OPERATOR ENDPOINTS
// ----------------------------------------------------

// Admin Queue Stats and Overview
router.get('/admin/overview', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(CASE WHEN status = 'waiting' THEN 1 END) as waiting_count,
        COUNT(CASE WHEN status = 'now_serving' THEN 1 END) as serving_count,
        COUNT(CASE WHEN status = 'served' THEN 1 END) as served_count,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        COUNT(*) as total_tokens
      FROM queue_tokens
    `).get() as any;

    const serviceStats = db.prepare(`
      SELECT s.id, s.name, s.prefix, sc.name as center_name, sc.category as center_category,
        COUNT(CASE WHEN qt.status = 'waiting' THEN 1 END) as waiting,
        COUNT(CASE WHEN qt.status = 'now_serving' THEN 1 END) as now_serving,
        COUNT(CASE WHEN qt.status = 'served' THEN 1 END) as served,
        COUNT(CASE WHEN qt.status = 'skipped' THEN 1 END) as skipped
      FROM services s
      JOIN service_centers sc ON s.center_id = sc.id
      LEFT JOIN queue_tokens qt ON s.id = qt.service_id
      GROUP BY s.id
      ORDER BY waiting DESC, s.name ASC
    `).all();

    res.json({ stats, serviceStats });
  } catch (error) {
    console.error('Error fetching admin overview:', error);
    res.status(500).json({ error: 'Failed to retrieve overview metrics.' });
  }
});

// Admin: Get live tokens for a specific service
router.get('/admin/service/:serviceId', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const serviceId = Number(req.params.serviceId);

    const service = db.prepare(`
      SELECT s.*, sc.name as center_name, sc.category as center_category
      FROM services s
      JOIN service_centers sc ON s.center_id = sc.id
      WHERE s.id = ?
    `).get(serviceId);

    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    const waitingTokens = db.prepare(`
      SELECT qt.*, 
             COALESCE(qt.customer_name, u.name) as user_name, 
             COALESCE(qt.customer_email, u.email) as user_email, 
             COALESCE(qt.customer_phone, u.phone) as user_phone
      FROM queue_tokens qt
      JOIN users u ON qt.user_id = u.id
      WHERE qt.service_id = ? AND qt.status = 'waiting'
      ORDER BY qt.joined_at ASC
    `).all(serviceId);

    const servingTokens = db.prepare(`
      SELECT qt.*, 
             COALESCE(qt.customer_name, u.name) as user_name, 
             COALESCE(qt.customer_email, u.email) as user_email, 
             COALESCE(qt.customer_phone, u.phone) as user_phone
      FROM queue_tokens qt
      JOIN users u ON qt.user_id = u.id
      WHERE qt.service_id = ? AND qt.status = 'now_serving'
      ORDER BY qt.called_at DESC
    `).all(serviceId);

    const completedTokens = db.prepare(`
      SELECT qt.*, 
             COALESCE(qt.customer_name, u.name) as user_name
      FROM queue_tokens qt
      JOIN users u ON qt.user_id = u.id
      WHERE qt.service_id = ? AND qt.status IN ('served', 'skipped', 'cancelled')
      ORDER BY COALESCE(qt.completed_at, qt.joined_at) DESC
      LIMIT 15
    `).all(serviceId);

    res.json({
      service,
      waiting: waitingTokens,
      serving: servingTokens,
      completed: completedTokens
    });
  } catch (error) {
    console.error('Error fetching service queue details:', error);
    res.status(500).json({ error: 'Failed to retrieve queue details.' });
  }
});

// Admin: Call Next Token
router.post('/admin/call-next', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const adminId = req.user!.id;
    const { service_id, counter_desk } = req.body;

    if (!service_id) {
      res.status(400).json({ error: 'Service ID is required.' });
      return;
    }

    const desk = counter_desk?.trim() || 'Counter 1';
    const now = new Date().toISOString();

    const callTx = db.transaction(() => {
      const nextToken = db.prepare(`
        SELECT * FROM queue_tokens
        WHERE service_id = ? AND status = 'waiting'
        ORDER BY joined_at ASC
        LIMIT 1
      `).get(Number(service_id)) as any;

      if (!nextToken) {
        return null;
      }

      db.prepare(`
        UPDATE queue_tokens
        SET status = 'now_serving',
            counter_desk = ?,
            called_at = ?
        WHERE id = ?
      `).run(desk, now, nextToken.id);

      db.prepare(`
        INSERT INTO queue_history_logs (token_id, previous_status, new_status, changed_by, note, created_at)
        VALUES (?, 'waiting', 'now_serving', ?, ?, ?)
      `).run(nextToken.id, adminId, `Called to ${desk}`, now);

      return nextToken.id;
    });

    const calledTokenId = callTx();

    if (!calledTokenId) {
      res.status(404).json({ error: 'No waiting tokens in this queue.' });
      return;
    }

    const token = db.prepare(`
      SELECT qt.*, 
             COALESCE(qt.customer_name, u.name) as user_name, 
             COALESCE(qt.customer_phone, u.phone) as user_phone, 
             s.name as service_name
      FROM queue_tokens qt
      JOIN users u ON qt.user_id = u.id
      JOIN services s ON qt.service_id = s.id
      WHERE qt.id = ?
    `).get(calledTokenId);

    res.json({
      message: 'Next token called successfully.',
      token
    });
  } catch (error) {
    console.error('Error calling next token:', error);
    res.status(500).json({ error: 'Failed to call next token.' });
  }
});

// Admin: Mark token as served
router.post('/admin/serve/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const tokenId = Number(req.params.id);
    const adminId = req.user!.id;
    const { notes } = req.body;

    const token = db.prepare('SELECT * FROM queue_tokens WHERE id = ?').get(tokenId) as any;
    if (!token) {
      res.status(404).json({ error: 'Token not found.' });
      return;
    }

    const now = new Date().toISOString();

    const serveTx = db.transaction(() => {
      db.prepare(`
        UPDATE queue_tokens
        SET status = 'served',
            completed_at = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(now, notes?.trim() || null, tokenId);

      db.prepare(`
        INSERT INTO queue_history_logs (token_id, previous_status, new_status, changed_by, note, created_at)
        VALUES (?, ?, 'served', ?, ?, ?)
      `).run(tokenId, token.status, adminId, notes?.trim() || 'Service completed', now);
    });

    serveTx();

    res.json({ message: 'Token marked as served.', tokenId });
  } catch (error) {
    console.error('Error marking served:', error);
    res.status(500).json({ error: 'Failed to mark served.' });
  }
});

// Admin: Skip token
router.post('/admin/skip/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const tokenId = Number(req.params.id);
    const adminId = req.user!.id;
    const { reason } = req.body;

    const token = db.prepare('SELECT * FROM queue_tokens WHERE id = ?').get(tokenId) as any;
    if (!token) {
      res.status(404).json({ error: 'Token not found.' });
      return;
    }

    const now = new Date().toISOString();

    const skipTx = db.transaction(() => {
      db.prepare(`
        UPDATE queue_tokens
        SET status = 'skipped',
            completed_at = ?,
            notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(now, reason ? `Skipped: ${reason.trim()}` : 'Skipped - no show', tokenId);

      db.prepare(`
        INSERT INTO queue_history_logs (token_id, previous_status, new_status, changed_by, note, created_at)
        VALUES (?, ?, 'skipped', ?, ?, ?)
      `).run(tokenId, token.status, adminId, reason ? `Skipped: ${reason.trim()}` : 'Customer skipped by operator', now);
    });

    skipTx();

    res.json({ message: 'Token skipped.', tokenId });
  } catch (error) {
    console.error('Error skipping token:', error);
    res.status(500).json({ error: 'Failed to skip token.' });
  }
});

// Admin: Recall token
router.post('/admin/recall/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const tokenId = Number(req.params.id);
    const adminId = req.user!.id;
    const { counter_desk } = req.body;

    const token = db.prepare('SELECT * FROM queue_tokens WHERE id = ?').get(tokenId) as any;
    if (!token) {
      res.status(404).json({ error: 'Token not found.' });
      return;
    }

    const desk = counter_desk?.trim() || token.counter_desk || 'Counter 1';
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE queue_tokens
      SET counter_desk = ?,
          called_at = ?
      WHERE id = ?
    `).run(desk, now, tokenId);

    db.prepare(`
      INSERT INTO queue_history_logs (token_id, previous_status, new_status, changed_by, note, created_at)
      VALUES (?, ?, 'now_serving', ?, ?, ?)
    `).run(tokenId, token.status, adminId, `Recalled to ${desk}`, now);

    res.json({ message: `Token ${token.token_number} recalled to ${desk}.` });
  } catch (error) {
    console.error('Error recalling token:', error);
    res.status(500).json({ error: 'Failed to recall token.' });
  }
});

export default router;
