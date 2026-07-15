import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data', 'mjm-mill.db');

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    department TEXT,
    phone TEXT,
    ic_no TEXT,
    join_date TEXT,
    salary_type TEXT NOT NULL DEFAULT 'monthly',
    base_rate REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS payroll_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    days_worked REAL NOT NULL DEFAULT 0,
    hours_worked REAL NOT NULL DEFAULT 0,
    overtime_hours REAL NOT NULL DEFAULT 0,
    gross_pay REAL NOT NULL DEFAULT 0,
    deductions REAL NOT NULL DEFAULT 0,
    net_pay REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ffb_receptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_no TEXT UNIQUE NOT NULL,
    delivery_date TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    vehicle_no TEXT,
    driver_name TEXT,
    gross_weight_kg REAL NOT NULL DEFAULT 0,
    tare_weight_kg REAL NOT NULL DEFAULT 0,
    net_weight_kg REAL NOT NULL DEFAULT 0,
    grade TEXT,
    unripe_percent REAL DEFAULT 0,
    rate_per_kg REAL NOT NULL DEFAULT 0,
    deduction_amount REAL NOT NULL DEFAULT 0,
    amount_payable REAL NOT NULL DEFAULT 0,
    received_by TEXT,
    remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
