import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

await pool.query(`
  CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    position TEXT,
    department TEXT,
    phone TEXT,
    ic_no TEXT,
    join_date DATE,
    salary_type TEXT NOT NULL DEFAULT 'monthly',
    base_rate NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    days_worked NUMERIC NOT NULL DEFAULT 0,
    hours_worked NUMERIC NOT NULL DEFAULT 0,
    overtime_hours NUMERIC NOT NULL DEFAULT 0,
    gross_pay NUMERIC NOT NULL DEFAULT 0,
    deductions NUMERIC NOT NULL DEFAULT 0,
    net_pay NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS ffb_receptions (
    id SERIAL PRIMARY KEY,
    ticket_no TEXT UNIQUE NOT NULL,
    delivery_date DATE NOT NULL,
    supplier_name TEXT NOT NULL,
    vehicle_no TEXT,
    driver_name TEXT,
    gross_weight_kg NUMERIC NOT NULL DEFAULT 0,
    tare_weight_kg NUMERIC NOT NULL DEFAULT 0,
    net_weight_kg NUMERIC NOT NULL DEFAULT 0,
    grade TEXT,
    unripe_percent NUMERIC DEFAULT 0,
    rate_per_kg NUMERIC NOT NULL DEFAULT 0,
    deduction_amount NUMERIC NOT NULL DEFAULT 0,
    amount_payable NUMERIC NOT NULL DEFAULT 0,
    received_by TEXT,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`);
