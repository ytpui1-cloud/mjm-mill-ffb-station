import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { router as employeesRouter } from './routes/employees.js';
import { router as payrollRouter } from './routes/payroll.js';
import { router as receptionRouter } from './routes/reception.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/employees', employeesRouter);
app.use('/api/payroll', payrollRouter);
app.use('/api/reception', receptionRouter);

app.get('/api/dashboard/summary', (req, res) => {
  const employeeCount = db.prepare("SELECT COUNT(*) AS c FROM employees WHERE status = 'active'").get().c;
  const pendingPayroll = db.prepare("SELECT COUNT(*) AS c FROM payroll_records WHERE status = 'pending'").get().c;
  const today = new Date().toISOString().slice(0, 10);
  const todayDeliveries = db.prepare('SELECT COUNT(*) AS c FROM ffb_receptions WHERE delivery_date = ?').get(today).c;
  const todayTonnage = db.prepare('SELECT COALESCE(SUM(net_weight_kg), 0) AS s FROM ffb_receptions WHERE delivery_date = ?').get(today).s;
  const monthPayout = db.prepare(`
    SELECT COALESCE(SUM(net_pay), 0) AS s FROM payroll_records
    WHERE strftime('%Y-%m', period_start) = strftime('%Y-%m', 'now')
  `).get().s;

  res.json({
    activeEmployees: employeeCount,
    pendingPayrollRecords: pendingPayroll,
    todayDeliveries,
    todayNetWeightKg: todayTonnage,
    thisMonthNetPay: monthPayout
  });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`MJM Mill FFB Reception Station API listening on port ${PORT}`);
});
