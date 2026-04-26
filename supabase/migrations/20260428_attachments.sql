-- Session 5C: Add attachments JSONB column to worker-facing tables

ALTER TABLE production_logs ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE water_tests      ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE sales_ledger     ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
ALTER TABLE events           ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';
