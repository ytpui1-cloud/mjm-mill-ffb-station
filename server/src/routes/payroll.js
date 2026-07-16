import { Router } from 'express';
import { pool } from '../db.js';
import { requireRole } from '../middleware/auth.js';

export const router = Router();

const CAN_VIEW_ALL = requireRole('assistant_station_head', 'station_head', 'manager');
const CAN_MANAGE = requireRole('station_head', 'manager');

const PAYROLL_SELECT = `
  SELECT p.*, e.name AS employee_name, e.employee_no, e.department
  FROM payroll_records p
  JOIN employees e ON e.id = p.employee_id
`;

router.get('/', CAN_VIEW_ALL, async (req, res) => {
  const { rows } = await pool.query(`${PAYROLL_SELECT} ORDER BY p.period_start DESC, e.name`);
  res.json(rows);
});

router.get('/mine', async (req, res) => {
  if (!req.user.employee_id) return res.json([]);
  const { rows } = await pool.query(
    `${PAYROLL_SELECT} WHERE p.employee_id = $1 ORDER BY p.period_start DESC`,
    [req.user.employee_id]
  );
  res.json(rows);
});

router.post('/', CAN_MANAGE, async (req, res) => {
  const {
    employee_id, period_start, period_end, days_worked, hours_worked,
    overtime_hours, deductions, notes, status
  } = req.body;

  const { rows: employeeRows } = await pool.query('SELECT * FROM employees WHERE id = $1', [employee_id]);
  const employee = employeeRows[0];
  if (!employee) return res.status(400).json({ error: 'Unknown employee_id' });
  if (!period_start || !period_end) {
    return res.status(400).json({ error: 'period_start and period_end are required' });
  }

  const baseRate = Number(employee.base_rate);
  const overtimeRate = (baseRate / (employee.salary_type === 'monthly' ? 26 * 8 : 1)) * 1.5;
  let grossPay = 0;
  if (employee.salary_type === 'monthly') {
    grossPay = baseRate * ((days_worked ?? 0) / 26);
  } else if (employee.salary_type === 'daily') {
    grossPay = baseRate * (days_worked ?? 0);
  } else {
    grossPay = baseRate * (hours_worked ?? 0);
  }
  const overtimePay = employee.salary_type === 'monthly' ? overtimeRate * (overtime_hours ?? 0) : 0;
  grossPay += overtimePay;
  const netPay = grossPay - (deductions ?? 0);

  const { rows } = await pool.query(
    `INSERT INTO payroll_records
       (employee_id, period_start, period_end, days_worked, hours_worked, overtime_hours, gross_pay, deductions, net_pay, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [employee_id, period_start, period_end, days_worked ?? 0, hours_worked ?? 0, overtime_hours ?? 0,
     grossPay, deductions ?? 0, netPay, status ?? 'pending', notes ?? null]
  );

  const { rows: fullRows } = await pool.query(`${PAYROLL_SELECT} WHERE p.id = $1`, [rows[0].id]);
  res.status(201).json(fullRows[0]);
});

router.put('/:id/status', CAN_MANAGE, async (req, res) => {
  const { status } = req.body;
  await pool.query('UPDATE payroll_records SET status = $1 WHERE id = $2', [status, req.params.id]);
  const { rows } = await pool.query(`${PAYROLL_SELECT} WHERE p.id = $1`, [req.params.id]);
  if (!rows[0]) return res.status(404).json({ error: 'Payroll record not found' });
  res.json(rows[0]);
});

router.delete('/:id', CAN_MANAGE, async (req, res) => {
  await pool.query('DELETE FROM payroll_records WHERE id = $1', [req.params.id]);
  res.status(204).end();
});
