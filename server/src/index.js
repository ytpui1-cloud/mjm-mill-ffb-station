import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authenticate } from './middleware/auth.js';
import { router as authRouter } from './routes/auth.js';
import { router as usersRouter } from './routes/users.js';
import { router as employeesRouter } from './routes/employees.js';
import { router as payrollRouter } from './routes/payroll.js';
import { router as receptionRouter } from './routes/reception.js';
import { router as stationsRouter } from './routes/stations.js';
import { router as workEntriesRouter } from './routes/workEntries.js';
import { router as salaryRulesRouter } from './routes/salaryRules.js';
import { router as dashboardRouter } from './routes/dashboard.js';

// Safety net: one failing request should never take the whole API down.
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

app.use('/api/employees', authenticate, employeesRouter);
app.use('/api/payroll', authenticate, payrollRouter);
app.use('/api/reception', authenticate, receptionRouter);
app.use('/api/stations', authenticate, stationsRouter);
app.use('/api/work-entries', authenticate, workEntriesRouter);
app.use('/api/salary-rules', authenticate, salaryRulesRouter);
app.use('/api/dashboard', authenticate, dashboardRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
  console.log(`MJM Mill FFB Reception Station API listening on port ${PORT}`);
});
