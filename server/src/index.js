import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pool } from './db.js';
import { authenticate } from './middleware/auth.js';
import { router as authRouter } from './routes/auth.js';
import { router as usersRouter } from './routes/users.js';
import { router as employeesRouter } from './routes/employees.js';
import { router as payrollRouter } from './routes/payroll.js';
import { router as receptionRouter } from './routes/reception.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.use('/api/employees', authenticate, employeesRouter);
app.use('/api/payroll', authenticate, payrollRouter);
app.use('/api/reception', authenticate, receptionRouter);

app.get('/api/dashboard/summary', authenticate, async (req, res) => {
  const [employeeCount, pendingPayroll, todayDeliveries, todayTonnage, monthPayout] = await Promise.all([
    pool.query("SELECT COUNT(*) AS c FROM employees WHERE status = 'active'"),
    pool.query("SELECT COUNT(*) AS c FROM payroll_records WHERE status = 'pending'"),
    pool.query('SELECT COUNT(*) AS c FROM ffb_receptions WHERE delivery_date = CURRENT_DATE'),
    pool.query('SELECT COALESCE(SUM(net_weight_kg), 0) AS s FROM ffb_receptions WHERE delivery_date = CURRENT_DATE'),
    pool.query(`
      SELECT COALESCE(SUM(net_pay), 0) AS s FROM payroll_records
      WHERE to_char(period_start, 'YYYY-MM') = to_char(CURRENT_DATE, 'YYYY-MM')
    `)
  ]);

  res.json({
    activeEmployees: Number(employeeCount.rows[0].c),
    pendingPayrollRecords: Number(pendingPayroll.rows[0].c),
    todayDeliveries: Number(todayDeliveries.rows[0].c),
    todayNetWeightKg: Number(todayTonnage.rows[0].s),
    thisMonthNetPay: Number(monthPayout.rows[0].s)
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`MJM Mill FFB Reception Station API listening on port ${PORT}`);
});
