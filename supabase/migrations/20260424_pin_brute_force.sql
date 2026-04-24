-- PIN BRUTE FORCE PROTECTION
-- Creates pin_attempts table for rate-limiting login attempts.

CREATE TABLE IF NOT EXISTS pin_attempts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address   text NOT NULL,
  success      boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lockout queries (ip + time window + failure filter)
CREATE INDEX IF NOT EXISTS idx_pin_attempts_ip_time
  ON pin_attempts (ip_address, attempted_at DESC)
  WHERE success = false;

-- Enable RLS (rate-limit table is written by service_role from API route)
ALTER TABLE pin_attempts ENABLE ROW LEVEL SECURITY;

-- Service role writes allowed (API route uses service_role key)
CREATE POLICY service_manage_pin_attempts ON pin_attempts
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anon insert from API route (route uses anon key fallback if no service key)
CREATE POLICY anon_insert_pin_attempts ON pin_attempts
  FOR INSERT WITH CHECK (true);

-- Auto-cleanup rows older than 24 hours (keep table lean)
-- Run this as a Supabase cron job or pg_cron extension:
-- SELECT cron.schedule('cleanup-pin-attempts', '0 4 * * *',
--   $$DELETE FROM pin_attempts WHERE attempted_at < now() - interval '24 hours'$$);
