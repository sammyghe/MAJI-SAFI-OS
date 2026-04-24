-- Simulation Mode Migration
-- Run this in Supabase SQL Editor

-- Add is_simulated flag to all main tables
ALTER TABLE production_logs   ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE water_tests        ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE sales_ledger       ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE inventory_items    ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE daily_cash         ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE transactions       ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE distributors       ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE events             ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;
ALTER TABLE capa_records       ADD COLUMN IF NOT EXISTS is_simulated BOOLEAN DEFAULT false;

-- Create indexes for fast cleanup
CREATE INDEX IF NOT EXISTS idx_production_logs_simulated   ON production_logs   (is_simulated) WHERE is_simulated = true;
CREATE INDEX IF NOT EXISTS idx_water_tests_simulated       ON water_tests        (is_simulated) WHERE is_simulated = true;
CREATE INDEX IF NOT EXISTS idx_sales_ledger_simulated      ON sales_ledger       (is_simulated) WHERE is_simulated = true;
CREATE INDEX IF NOT EXISTS idx_daily_cash_simulated        ON daily_cash         (is_simulated) WHERE is_simulated = true;
CREATE INDEX IF NOT EXISTS idx_events_simulated            ON events             (is_simulated) WHERE is_simulated = true;
CREATE INDEX IF NOT EXISTS idx_capa_records_simulated      ON capa_records        (is_simulated) WHERE is_simulated = true;

-- Simulation settings: one row per location
CREATE TABLE IF NOT EXISTS simulation_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   TEXT NOT NULL UNIQUE,
  is_active     BOOLEAN DEFAULT false,
  activated_by  TEXT,
  activated_at  TIMESTAMPTZ,
  deactivated_at TIMESTAMPTZ,
  row_counts    JSONB DEFAULT '{}'
);

-- Seed buziga row
INSERT INTO simulation_settings (location_id, is_active)
VALUES ('buziga', false)
ON CONFLICT (location_id) DO NOTHING;
