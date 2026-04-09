-- ============================================================================
-- Enable Supabase Realtime on all MajiSafi OS tables
-- Run this in the Supabase SQL Editor (Dashboard → SQL → New Query)
-- ============================================================================

-- Core tables
ALTER PUBLICATION supabase_realtime ADD TABLE maji_daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE maji_quality_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE maji_inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE maji_projects;
ALTER PUBLICATION supabase_realtime ADD TABLE maji_phase;
ALTER PUBLICATION supabase_realtime ADD TABLE maji_clients;
ALTER PUBLICATION supabase_realtime ADD TABLE maji_compliance;

-- Auth / Identity
ALTER PUBLICATION supabase_realtime ADD TABLE users;

-- New operational tables
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE recognitions;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_records;

-- ============================================================================
-- Create the 'recognitions' table if it doesn't exist yet
-- ============================================================================
CREATE TABLE IF NOT EXISTS recognitions (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message    TEXT NOT NULL,
  department TEXT NOT NULL,
  given_by   TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (row-level security) with a permissive policy for now
ALTER TABLE recognitions ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated + anon reads and inserts
CREATE POLICY IF NOT EXISTS "Allow all reads on recognitions"
  ON recognitions FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow all inserts on recognitions"
  ON recognitions FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Create the 'tasks' table if it doesn't exist yet
-- ============================================================================
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  assigned_to TEXT,
  department  TEXT,
  status      TEXT DEFAULT 'pending',
  priority    TEXT DEFAULT 'medium',
  due_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow all reads on tasks"
  ON tasks FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow all inserts on tasks"
  ON tasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all updates on tasks"
  ON tasks FOR UPDATE
  USING (true);

-- ============================================================================
-- Verify: list all tables in the realtime publication
-- ============================================================================
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
