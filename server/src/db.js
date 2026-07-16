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

  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    claimed_role TEXT NOT NULL,
    role TEXT,
    account_status TEXT NOT NULL DEFAULT 'pending'
      CHECK (account_status IN ('pending', 'approved', 'rejected')),
    employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS stations (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    unit_label TEXT NOT NULL DEFAULT 'unit',
    monthly_budget NUMERIC,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS piece_rates (
    id SERIAL PRIMARY KEY,
    station_id INTEGER UNIQUE NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    rate_per_unit NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS work_entries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    station_id INTEGER NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    rate_per_unit NUMERIC NOT NULL DEFAULT 0,
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'submitted'
      CHECK (status IN ('submitted', 'station_approved', 'final_approved', 'rejected')),
    self_submitted BOOLEAN NOT NULL DEFAULT false,
    submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    station_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    station_approved_at TIMESTAMPTZ,
    final_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    final_approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS salary_rules (
    id INTEGER PRIMARY KEY DEFAULT 1,
    overtime_multiplier NUMERIC NOT NULL DEFAULT 1.5,
    standard_deduction_percent NUMERIC NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (id = 1)
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

// One-time migration: users used to sign up with email; now they sign up with phone.
await pool.query(`
  ALTER TABLE users DROP COLUMN IF EXISTS email;
  ALTER TABLE users ALTER COLUMN phone SET NOT NULL;
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_unique'
    ) THEN
      ALTER TABLE users ADD CONSTRAINT users_phone_unique UNIQUE (phone);
    END IF;
  END $$;
`);

// Piece-rate system: assign each employee to a station.
await pool.query(`
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS station_id INTEGER REFERENCES stations(id) ON DELETE SET NULL;
  ALTER TABLE work_entries ADD COLUMN IF NOT EXISTS self_submitted BOOLEAN NOT NULL DEFAULT false;
`);

// Seed the mill's processing stations (idempotent).
await pool.query(`
  INSERT INTO stations (name, unit_label, sort_order) VALUES
    ('FFB Reception', 'kg', 0),
    ('Ramp', 'cages', 1),
    ('Sterilizer', 'tonnes', 2),
    ('Tippler', 'tonnes', 3),
    ('Press', 'tonnes', 4),
    ('Kernel', 'tonnes', 5)
  ON CONFLICT (name) DO NOTHING;

  INSERT INTO piece_rates (station_id, rate_per_unit)
  SELECT id, 0 FROM stations
  ON CONFLICT (station_id) DO NOTHING;

  INSERT INTO salary_rules (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
`);
