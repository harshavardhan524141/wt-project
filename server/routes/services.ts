import { Router, Response } from 'express';
import { db } from '../db/database.ts';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// Get services, optionally filtered by center_id
router.get('/', (req, res: Response): void => {
  try {
    const centerId = req.query.centerId ? Number(req.query.centerId) : null;
    const includeInactive = req.query.includeInactive === 'true';

    let query = `
      SELECT s.*,
        sc.name as center_name,
        sc.code as center_code,
        sc.category as center_category,
        sc.address as center_address,
        (SELECT COUNT(*) FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'waiting') as waiting_count,
        (SELECT token_number FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'now_serving' ORDER BY qt.called_at DESC LIMIT 1) as currently_serving,
        (SELECT counter_desk FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'now_serving' ORDER BY qt.called_at DESC LIMIT 1) as currently_serving_counter
      FROM services s
      JOIN service_centers sc ON s.center_id = sc.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (!includeInactive) {
      query += ' AND s.is_active = 1 AND sc.is_active = 1';
    }

    if (centerId) {
      query += ' AND s.center_id = ?';
      params.push(centerId);
    }

    query += ' ORDER BY sc.name ASC, s.name ASC';

    const services = db.prepare(query).all(...params).map((s: any) => ({
      ...s,
      is_active: Boolean(s.is_active)
    }));

    res.json({ services });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to retrieve services.' });
  }
});

// Get single service by ID
router.get('/:id', (req, res: Response): void => {
  try {
    const serviceId = Number(req.params.id);
    const service = db.prepare(`
      SELECT s.*,
        sc.name as center_name,
        sc.code as center_code,
        sc.category as center_category,
        sc.address as center_address,
        sc.operating_hours as center_operating_hours,
        (SELECT COUNT(*) FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'waiting') as waiting_count,
        (SELECT token_number FROM queue_tokens qt WHERE qt.service_id = s.id AND qt.status = 'now_serving' ORDER BY qt.called_at DESC LIMIT 1) as currently_serving
      FROM services s
      JOIN service_centers sc ON s.center_id = sc.id
      WHERE s.id = ?
    `).get(serviceId) as any;

    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    res.json({
      service: {
        ...service,
        is_active: Boolean(service.is_active)
      }
    });
  } catch (error) {
    console.error('Error fetching service:', error);
    res.status(500).json({ error: 'Failed to retrieve service.' });
  }
});

// Admin: Create service
router.post('/', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const { center_id, name, prefix, description, avg_service_time_mins, is_active } = req.body;

    if (!center_id || !name || !prefix) {
      res.status(400).json({ error: 'Center ID, service name, and token prefix are required.' });
      return;
    }

    const center = db.prepare('SELECT id FROM service_centers WHERE id = ?').get(center_id);
    if (!center) {
      res.status(404).json({ error: 'Selected service center does not exist.' });
      return;
    }

    const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanPrefix) {
      res.status(400).json({ error: 'Prefix must contain letters or digits (e.g. DL, DOC, MED).' });
      return;
    }

    const now = new Date().toISOString();
    const insert = db.prepare(`
      INSERT INTO services (center_id, name, prefix, description, avg_service_time_mins, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      center_id,
      name.trim(),
      cleanPrefix,
      description?.trim() || null,
      Math.max(1, Number(avg_service_time_mins) || 10),
      is_active !== undefined ? (is_active ? 1 : 0) : 1,
      now,
      now
    );

    const newService = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ service: newService });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service.' });
  }
});

// Admin: Update service
router.put('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const serviceId = Number(req.params.id);
    const { name, prefix, description, avg_service_time_mins, is_active, center_id } = req.body;

    const service = db.prepare('SELECT id FROM services WHERE id = ?').get(serviceId);
    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    const now = new Date().toISOString();
    db.prepare(`
      UPDATE services
      SET name = COALESCE(?, name),
          prefix = COALESCE(?, prefix),
          description = COALESCE(?, description),
          avg_service_time_mins = COALESCE(?, avg_service_time_mins),
          is_active = COALESCE(?, is_active),
          center_id = COALESCE(?, center_id),
          updated_at = ?
      WHERE id = ?
    `).run(
      name?.trim() || null,
      prefix?.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') || null,
      description !== undefined ? description?.trim() || null : null,
      avg_service_time_mins ? Math.max(1, Number(avg_service_time_mins)) : null,
      is_active !== undefined ? (is_active ? 1 : 0) : null,
      center_id ? Number(center_id) : null,
      now,
      serviceId
    );

    const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
    res.json({ service: updated });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service.' });
  }
});

// Admin: Delete service
router.delete('/:id', authenticateToken, requireAdmin, (req: AuthRequest, res: Response): void => {
  try {
    const serviceId = Number(req.params.id);
    const service = db.prepare('SELECT id FROM services WHERE id = ?').get(serviceId);
    if (!service) {
      res.status(404).json({ error: 'Service not found.' });
      return;
    }

    db.prepare('DELETE FROM services WHERE id = ?').run(serviceId);
    res.json({ message: 'Service deleted successfully.' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ error: 'Failed to delete service.' });
  }
});

export default router;
