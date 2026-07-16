import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../middleware/auth.js';

export const router = Router();

const CAN_VIEW = requireRole('assistant_station_head', 'station_head', 'manager');
const CAN_MANAGE = requireRole('station_head', 'manager');

router.get('/', CAN_VIEW, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM employees ORDER BY name');
  res.json(rows);
});

router.get('/:id', CAN_VIEW, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Employee not found' });
  res.json(rows[0]);
});

router.post('/', CAN_MANAGE, async (req, res) => {
  const { employee_no, name, position, department, phone, ic_no, join_date, salary_type, base_rate, status } = req.body;
  if (!employee_no || !name) {
    return res.status(400).json({ error: 'employee_no and name are required' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO employees (employee_no, name, position, department, phone, ic_no, join_date, salary_type, base_rate, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [employee_no, name, position ?? null, department ?? null, phone ?? null, ic_no ?? null,
       join_date || null, salary_type ?? 'monthly', base_rate ?? 0, status ?? 'active']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', CAN_MANAGE, async (req, res) => {
  const { rows: existingRows } = await pool.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
  const existing = existingRows[0];
  if (!existing) return res.status(404).json({ error: 'Employee not found' });
  const merged = { ...existing, ...req.body };
  const { rows } = await pool.query(
    `UPDATE employees SET employee_no = $1, name = $2, position = $3, department = $4, phone = $5, ic_no = $6,
       join_date = $7, salary_type = $8, base_rate = $9, status = $10 WHERE id = $11
     RETURNING *`,
    [merged.employee_no, merged.name, merged.position, merged.department, merged.phone, merged.ic_no,
     merged.join_date || null, merged.salary_type, merged.base_rate, merged.status, req.params.id]
  );
  res.json(rows[0]);
});

router.delete('/:id', CAN_MANAGE, async (req, res) => {
  await pool.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
