-- Missing Tables for Dispatch & Finance Modules
-- Run this in Supabase SQL Editor to fix "table not found" errors

-- ============ SALES LEDGER (Dispatch EOD Reconciliation) ============
CREATE TABLE IF NOT EXISTS sales_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  sale_date DATE DEFAULT CURRENT_DATE,
  distributor TEXT NOT NULL,
  jars_sold INT NOT NULL,
  amount_ugx INT NOT NULL,
  logged_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_sales FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_ledger_location_date 
  ON sales_ledger(location_id, sale_date);

-- ============ FINANCE OVERRIDES (Founder Force-Close Audit) ============
CREATE TABLE IF NOT EXISTS finance_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  reason TEXT NOT NULL,
  user_id TEXT,
  override_type TEXT DEFAULT 'eod_force_close',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_overrides FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_finance_overrides_location_date 
  ON finance_overrides(location_id, created_at);

-- ============ TRANSACTIONS (Finance Ledger) ============
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  transaction_date DATE DEFAULT CURRENT_DATE,
  category TEXT NOT NULL,
  description TEXT,
  amount_ugx NUMERIC NOT NULL,
  transaction_type TEXT CHECK (transaction_type IN ('expense', 'revenue')),
  recorded_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_transactions FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_location_date 
  ON transactions(location_id, transaction_date);

-- ============ COMPLIANCE FLAGS (Alerts for missing logs) ============
CREATE TABLE IF NOT EXISTS compliance_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  department TEXT NOT NULL,
  flag_type TEXT NOT NULL,
  description TEXT,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_flags FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_compliance_flags_location_dept 
  ON compliance_flags(location_id, department, resolved_at);
