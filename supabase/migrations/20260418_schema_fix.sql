-- =============================================================
-- MAJI SAFI OS — Schema Fix Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- This NON-DESTRUCTIVELY adds missing columns and renames tables
-- to match what the app code expects.
-- =============================================================

-- ============ FIX production_logs ============
-- Add missing columns (old table had: jars_produced, quality_passed, issues, timestamp)
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'buziga';
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS jar_count INT;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS product_type TEXT;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS operator_name TEXT;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'created';
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS production_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS created_by TEXT;

-- ============ FIX water_tests ============
-- Add missing columns (old table had: ph, turbidity, tds, chlorine, ecoli, passed, timestamp)
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS location_id TEXT DEFAULT 'buziga';
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS test_type TEXT;
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS reading NUMERIC;
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS tested_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS tested_by TEXT;
ALTER TABLE water_tests ADD COLUMN IF NOT EXISTS notes TEXT;

-- ============ CREATE sales_ledger (app uses this name) ============
CREATE TABLE IF NOT EXISTS sales_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  distributor TEXT NOT NULL,
  jars_sold INT NOT NULL,
  amount_ugx INT NOT NULL,
  product_type TEXT DEFAULT '20L Refill',
  sale_date DATE DEFAULT CURRENT_DATE,
  logged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CREATE inventory_items (app uses this name) ============
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  item_name TEXT NOT NULL,
  category TEXT,
  quantity INT NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'units',
  reorder_threshold INT DEFAULT 50,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CREATE compliance_records (app uses this name) ============
CREATE TABLE IF NOT EXISTS compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  document_name TEXT NOT NULL,
  category TEXT,
  status TEXT DEFAULT 'missing',
  expiry_date DATE,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ CREATE finance_overrides (EOD force-close audit) ============
CREATE TABLE IF NOT EXISTS finance_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  user_id TEXT,
  reason TEXT NOT NULL,
  cash_counted BIGINT,
  cash_expected BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ SEED compliance_records with the 15 UNBS docs ============
INSERT INTO compliance_records (location_id, document_name, category, status, expiry_date)
VALUES
  ('buziga', 'UNBS Product Certification', 'regulatory', 'missing', '2026-12-31'),
  ('buziga', 'NWSC Water Use Permit', 'regulatory', 'missing', '2026-09-30'),
  ('buziga', 'NEMA Environmental Compliance', 'regulatory', 'missing', '2026-06-30'),
  ('buziga', 'KCCA Business Licence', 'regulatory', 'missing', '2026-12-31'),
  ('buziga', 'Uganda Registration Services Bureau Certificate', 'regulatory', 'missing', '2027-01-01'),
  ('buziga', 'NSSF Registration Certificate', 'hr', 'missing', '2099-01-01'),
  ('buziga', 'PAYE Registration (URA)', 'hr', 'missing', '2099-01-01'),
  ('buziga', 'Employment Contracts — All Staff', 'hr', 'missing', '2099-01-01'),
  ('buziga', 'Health & Safety Policy', 'hr', 'missing', '2099-01-01'),
  ('buziga', 'Fire Safety Certificate', 'regulatory', 'missing', '2026-12-31'),
  ('buziga', 'Food Handler Medical Certificates', 'hr', 'missing', '2026-10-01'),
  ('buziga', 'UNBS Calibration Certificate — TDS Meter', 'quality', 'missing', '2026-08-01'),
  ('buziga', 'UNBS Calibration Certificate — pH Meter', 'quality', 'missing', '2026-08-01'),
  ('buziga', 'Occupational Safety Inspection', 'regulatory', 'missing', '2026-12-31'),
  ('buziga', 'Water Quality Lab Report (Quarterly)', 'quality', 'missing', '2026-06-30')
ON CONFLICT DO NOTHING;

-- ============ SEED inventory_items with initial stock ============
INSERT INTO inventory_items (location_id, item_name, category, quantity, unit, reorder_threshold)
VALUES
  ('buziga', '20L Jars', 'packaging', 500, 'units', 100),
  ('buziga', 'Caps', 'packaging', 2000, 'units', 500),
  ('buziga', 'Labels', 'packaging', 2000, 'units', 500),
  ('buziga', 'Chlorine (kg)', 'chemicals', 25, 'kg', 5),
  ('buziga', 'Filter Media', 'chemicals', 10, 'bags', 2),
  ('buziga', 'Shrink Wrap', 'packaging', 50, 'rolls', 10)
ON CONFLICT DO NOTHING;

-- ============ ENABLE RLS (allow anon reads + writes for now) ============
ALTER TABLE sales_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "anon_all_sales_ledger" ON sales_ledger FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_inventory_items" ON inventory_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_compliance_records" ON compliance_records FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "anon_all_finance_overrides" ON finance_overrides FOR ALL TO anon USING (true) WITH CHECK (true);
