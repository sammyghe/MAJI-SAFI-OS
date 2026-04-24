-- LOGIN AUDIT TABLE
-- Permanent record of every login attempt (success and failure).

CREATE TABLE IF NOT EXISTS login_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NULL,
  user_name    text NULL,
  ip_address   text,
  user_agent   text,
  success      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Index for founder security dashboard queries
CREATE INDEX IF NOT EXISTS idx_login_audit_created
  ON login_audit (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_audit_ip
  ON login_audit (ip_address, created_at DESC);

-- Enable RLS
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;

-- Service role manages all rows
CREATE POLICY service_manage_login_audit ON login_audit
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anon insert from API route
CREATE POLICY anon_insert_login_audit ON login_audit
  FOR INSERT WITH CHECK (true);
