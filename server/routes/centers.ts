import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Get all service centers with services count and current waiting count
router.get('/', (req, res: Response): void => {
  try {
    const includeInactive = req.query.includeInactive === 'true';

    let centersQuery = `
      SELECT sc.*,
        (SELECT COUNT(*) FROM services s WHERE s.center_id = sc.id AND (s.is_active = 1 OR ? = 1)) as service_count,
        (SELECT COUNT(*) FROM queue_tokens qt WHERE qt.center_id = sc.id AND qt.status = 'waiting') as total_waiting
      FROM service_centers sc
    `;

    if (!includeInactive) {
      centersQuery += ' WHERE sc.is_active = 1';
    }

    centersQuery += ' ORDER BY sc.name ASC';

    const centers = db.prepare(centersQuery).all(includeInactive ? 1 : 0);

    // Also fetch services for each center
    const servicesStmt = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'waiting') as waiting_count,
        (SELECT token_number FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'now_serving' ORDER BY qt.called_at DESC LIMIT 1) as currently_serving
      FROM services s
      WHERE s.center_id = ? AND (s.is_active = 1 OR ? = 1)
      ORDER BY s.name ASC
    `);

    const centersWithServices = centers.map((c: any) => {
      const services = servicesStmt.all(c.id, includeInactive ? 1 : 0);
      return {
        ...c,
        is_active: Boolean(c.is_active),
        services
      };
    });

    res.json({ centers: centersWithServices });
  } catch (error) {
    console.error('Error fetching centers:', error);
    res.status(500).json({ error: 'Failed to retrieve service centers.' });
  }
});

// Get single service center by ID
router.get('/:id', (req, res: Response): void => {
  try {
    const centerId = Number(req.params.id);
    const center = db.prepare('SELECT * FROM service_centers WHERE id = ?').get(centerId) as any;

    if (!center) {
      res.status(404).json({ error: 'Service center not found.' });
      return;
    }

    const services = db.prepare(`
      SELECT s.*,
        (SELECT COUNT(*) FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'waiting') as waiting_count,
        (SELECT token_number FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'now_serving' ORDER BY qt.called_at DESC LIMIT 1) as currently_serving
      FROM services s
      WHERE s.center_id = ?
      ORDER BY s.name ASC
    `).all(centerId);

    res.json({
      center: {
        ...center,
        is_active: Boolean(center.is_active),
        services
      }
    });
  } catch (error) {
    console.error('Error fetching center details:', error);
    res.status(500).json({ error: 'Failed to retrieve service center details.' });
  }
});

// Admin: Create new service center
router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const { name, code, category, address, phone, operating_hours, is_active } = req.body;

    if (!name || !code || !category || !address) {
      res.status(400).json({ error: 'Center name, unique code, category, and address are required.' });
      return;
    }

    const cleanCode = code.trim().toUpperCase();
    const existingCode = db.prepare('SELECT id FROM service_centers WHERE code = ?').get(cleanCode);
    if (existingCode) {
      res.status(409).json({ error: 'A service center with this code already exists.' });
      return;
    }

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO service_centers (name, code, category, address, phone, operating_hours, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      name.trim(),
      cleanCode,
      category.trim(),
      address.trim(),
      phone?.trim() || null,
      operating_hours?.trim() || 'Mon - Fri: 9:00 AM - 5:00 PM',
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      now,
      now
    );

    const newCenter = db.prepare('SELECT * FROM service_centers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ center: newCenter });
  } catch (error) {
    console.error('Error creating center:', error);
    res.status(500).json({ error: 'Failed to create service center.' });
  }
});

// Admin: Update service center
router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const centerId = Number(req.params.id);
    const { name, code, category, address, phone, operating_hours, is_active } = req.body;

    const center = db.prepare('SELECT id FROM service_centers WHERE id = ?').get(centerId);
    if (!center) {
      res.status(404).json({ error: 'Service center not found.' });
      return;
    }

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      const existing = db.prepare('SELECT id FROM service_centers WHERE code = ? AND id != ?').get(cleanCode, centerId);
      if (existing) {
        res.status(409).json({ error: 'Another service center is already using this code.' });
        return;
      }
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE service_centers
      SET name = COALESCE(?, name),
          code = COALESCE(?, code),
          category = COALESCE(?, category),
          address = COALESCE(?, address),
          phone = COALESCE(?, phone),
          operating_hours = COALESCE(?, operating_hours),
          is_active = COALESCE(?, is_active),
          updated_at = ?
      WHERE id = ?
    `).run(
      name?.trim() || null,
      code?.trim().toUpperCase() || null,
      category?.trim() || null,
      address?.trim() || null,
      phone !== undefined ? phone.trim() : null,
      operating_hours !== undefined ? operating_hours.trim() : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      now,
      centerId
    );

    const updated = db.prepare('SELECT * FROM service_centers WHERE id = ?').get(centerId);
    res.json({ center: updated });
  } catch (error) {
    console.error('Error updating center:', error);
    res.status(500).json({ error: 'Failed to update service center.' });
  }
});

// Admin: Delete service center
router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const centerId = Number(req.params.id);
    const center = db.prepare('SELECT id FROM service_centers WHERE id = ?').get(centerId);
    if (!center) {
      res.status(404).json({ error: 'Service center not found.' });
      return;
    }

    db.prepare('DELETE FROM service_centers WHERE id = ?').run(centerId);
    res.json({ message: 'Service center deleted successfully.' });
  } catch (error) {
    console.error('Error deleting center:', error);
    res.status(500).json({ error: 'Failed to delete service center.' });
  }
});

export default router;
