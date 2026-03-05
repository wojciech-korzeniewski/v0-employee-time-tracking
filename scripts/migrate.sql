-- ============================================================
-- HR Management App - Full Schema
-- ============================================================

-- Users table (employees, managers, hr)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('employee', 'manager', 'hr')),
  full_name VARCHAR(200) NOT NULL,
  email VARCHAR(200),
  phone VARCHAR(50),
  address TEXT,
  birth_date DATE,
  pesel VARCHAR(11),
  nip VARCHAR(10),
  bank_account VARCHAR(34),
  manager_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contract_type VARCHAR(30) NOT NULL CHECK (contract_type IN ('UoP', 'B2B', 'UoZ', 'Zlecenie')),
  salary_type VARCHAR(20) NOT NULL CHECK (salary_type IN ('hourly', 'monthly')),
  salary_amount NUMERIC(10,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leave types configuration (set by HR/admin)
CREATE TABLE IF NOT EXISTS leave_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_paid BOOLEAN DEFAULT TRUE,
  days_per_year INTEGER,
  carries_over BOOLEAN DEFAULT FALSE,
  max_carryover_days INTEGER DEFAULT 0,
  accrual_type VARCHAR(20) NOT NULL DEFAULT 'upfront' CHECK (accrual_type IN ('upfront', 'monthly')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee leave allowances (how many days each employee gets per leave type)
CREATE TABLE IF NOT EXISTS leave_allowances (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  total_days INTEGER NOT NULL DEFAULT 0,
  used_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  carried_over_days NUMERIC(5,1) NOT NULL DEFAULT 0,
  annual_days NUMERIC(5,2) DEFAULT NULL,
  UNIQUE(user_id, leave_type_id, year)
);

-- Leave requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  leave_type_id INTEGER NOT NULL REFERENCES leave_types(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days_count NUMERIC(5,1) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  manager_note TEXT,
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work schedule entries (planned hours per day per week)
CREATE TABLE IF NOT EXISTS schedule_entries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_minutes INTEGER DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, work_date)
);

-- Slack settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default leave types
INSERT INTO leave_types (name, is_paid, days_per_year, carries_over, max_carryover_days, accrual_type) VALUES
  ('Urlop wypoczynkowy', TRUE, 26, TRUE, 10, 'monthly'),
  ('Urlop bezpłatny', FALSE, NULL, FALSE, 0, 'upfront'),
  ('Urlop na żądanie', TRUE, 4, FALSE, 0, 'upfront'),
  ('Zwolnienie lekarskie', TRUE, NULL, FALSE, 0, 'upfront')
ON CONFLICT DO NOTHING;

-- Seed default settings
INSERT INTO settings (key, value) VALUES
  ('slack_webhook_url', NULL),
  ('slack_daily_time', '08:00'),
  ('company_name', 'Moja Firma')
ON CONFLICT (key) DO NOTHING;

-- Seed a default HR/admin user (login: admin, password: admin123)
-- password_hash is SHA-256 hex (64 chars) of "admin123"
INSERT INTO users (login, password_hash, role, full_name, email) VALUES
  ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'hr', 'Administrator HR', 'admin@firma.pl')
ON CONFLICT (login) DO NOTHING;
