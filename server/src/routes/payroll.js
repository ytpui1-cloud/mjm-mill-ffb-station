import { Router } from 'express';
import { db } from '../db.js';

export const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, e.name AS employee_name, e.employee_no, e.department
    FROM payroll_records p
    JOIN employees e ON e.id = p.employee_id
    ORDER BY p.period_start DESC, e.name
  `).all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const {
    employee_id, period_start, period_end, days_worked, hours_worked,
    overtime_hours, deductions, notes, status
  } = req.body;

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employee_id);
  if (!employee) return res.status(400).json({ error: 'Unknown employee_id' });
  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'period_start and period_end are required' });
  }

  const overtimeRate = (employee.base_rate / (employee.salary_type === 'monthly' ? 26 * 8 : 1)) * 1.5;
  let grossPay = 0;
  if (employee.salary_type === 'monthly') {
    grossPay = employee.base_rate * ((days_worked ?? 0) / 26);
  } else if (employee.salary_type === 'daily') {
    grossPay = employee.base_rate * (days_worked ?? 0);
  } else {
    grossPay = employee.base_rate * (hours_worked ?? 0);
  }
  const overtimePay = employee.salary_type === 'monthly' ? overtimeRate * (overtime_hours ?? 0) : 0;
  grossPay += overtimePay;
  const netPay = grossPay - (deductions ?? 0);

  const result = db.prepare(`
    INSERT INTO payroll_records
      (employee_id, period_start, period_end, days_worked, hours_worked, overtime_hours, gross_pay, deductions, net_pay, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    employee_id, period_start, period_end, days_worked ?? 0, hours_worked ?? 0, overtime_hours ?? 0,
    grossPay, deductions ?? 0, netPay, status ?? 'pending', notes ?? null
  );

  const row = db.prepare(`
    SELECT p.*, e.name AS employee_name, e.employee_no, e.department
    FROM payroll_records p JOIN employees e ON e.id = p.employee_id
    WHERE p.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id/status', (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE payroll_records SET status = ? WHERE id = ?').run(status, req.params.id);
  const row = db.prepare(`
    SELECT p.*, e.name AS employee_name, e.employee_no, e.department
    FROM payroll_records p JOIN employees e ON e.id = p.employee_id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Payroll record not found' });
  res.json(row);
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM payroll_records WHERE id = ?').run(req.params.id);
  res.status(204).end();
});
