import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../middleware/auth.js';

export const router = Router();

const CAN_MANAGE = requireRole('manager');

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.id, s.name, s.unit_label, s.monthly_budget, s.sort_order,
           COALESCE(pr.rate_per_unit, 0) AS rate_per_unit,
           (SELECT COUNT(*) FROM employees e WHERE e.station_id = s.id AND e.status = 'active') AS worker_count
    FROM stations s
    LEFT JOIN piece_rates pr ON pr.station_id = s.id
    ORDER BY s.sort_order, s.name
  `);
  res.json(rows);
});

router.post('/', CAN_MANAGE, async (req, res) => {
  const { name, unit_label, monthly_budget } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO stations (name, unit_label, monthly_budget, sort_order)
       VALUES ($1, $2, $3, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM stations))
       RETURNING *`,
      [name, unit_label || 'unit', monthly_budget ?? null]
    );
    await pool.query('INSERT INTO piece_rates (station_id, rate_per_unit) VALUES ($1, 0)', [rows[0].id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A station with this name already exists' });
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', CAN_MANAGE, async (req, res) => {
  const { name, unit_label, monthly_budget } = req.body;
  const { rows } = await pool.query(
    `UPDATE stations SET name = COALESCE($1, name), unit_label = COALESCE($2, unit_label), monthly_budget = $3
     WHERE id = $4 RETURNING *`,
    [name ?? null, unit_label ?? null, monthly_budget ?? null, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Station not found' });
  res.json(rows[0]);
});

router.put('/:id/piece-rate', CAN_MANAGE, async (req, res) => {
  const { rate_per_unit } = req.body;
  if (rate_per_unit == null || rate_per_unit < 0) {
    return res.status(400).json({ error: 'A valid rate_per_unit is required' });
  }
  const { rows } = await pool.query(
    `UPDATE piece_rates SET rate_per_unit = $1, updated_at = now() WHERE station_id = $2 RETURNING *`,
    [rate_per_unit, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Station not found' });
  res.json(rows[0]);
});

router.delete('/:id', CAN_MANAGE, async (req, res) => {
  await pool.query('DELETE FROM stations WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
