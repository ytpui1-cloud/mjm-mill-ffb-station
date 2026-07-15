import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM employees ORDER BY name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Employee not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { employee_no, name, position, department, phone, ic_no, join_date, salary_type, base_rate, status } = req.body;
  if (!employee_no || !name) {
    return res.status(400).json({ error: 'employee_no and name are required' });
  }
  try {
    const result = db.prepare(`
      INSERT INTO employees (employee_no, name, position, department, phone, ic_no, join_date, salary_type, base_rate, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employee_no, name, position ?? null, department ?? null, phone ?? null, ic_no ?? null,
      join_date ?? null, salary_type ?? 'monthly', base_rate ?? 0, status ?? 'active'
    );
    const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });
  const merged = { ...existing, ...req.body };
  db.prepare(`
    UPDATE employees SET employee_no = ?, name = ?, position = ?, department = ?, phone = ?, ic_no = ?,
      join_date = ?, salary_type = ?, base_rate = ?, status = ? WHERE id = ?
  `).run(
    merged.employee_no, merged.name, merged.position, merged.department, merged.phone, merged.ic_no,
    merged.join_date, merged.salary_type, merged.base_rate, merged.status, req.params.id
  );
  const row = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
