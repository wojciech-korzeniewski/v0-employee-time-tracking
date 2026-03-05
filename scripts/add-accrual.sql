-- Add accrual support for leave types and allowances (run on existing DBs)
ALTER TABLE leave_types
  ADD COLUMN IF NOT EXISTS accrual_type VARCHAR(20) NOT NULL DEFAULT 'upfront';
ALTER TABLE leave_types
  DROP CONSTRAINT IF EXISTS leave_types_accrual_type_check;
ALTER TABLE leave_types
  ADD CONSTRAINT leave_types_accrual_type_check CHECK (accrual_type IN ('upfront', 'monthly'));

ALTER TABLE leave_allowances
  ADD COLUMN IF NOT EXISTS annual_days NUMERIC(5,2) DEFAULT NULL;

-- Set default for "Urlop wypoczynkowy" to monthly
UPDATE leave_types SET accrual_type = 'monthly' WHERE name = 'Urlop wypoczynkowy' AND accrual_type = 'upfront';
