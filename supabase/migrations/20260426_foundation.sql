-- Session 4: CFO Platform — Foundation Tables
-- fx_rates, user_activity, user_sessions

-- ============ FX RATES ============
CREATE TABLE IF NOT EXISTS fx_rates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_currency TEXT NOT NULL,
  to_currency   TEXT NOT NULL,
  rate          NUMERIC NOT NULL,
  effective_from DATE NOT NULL,
  effective_to   DATE,
  source        TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fx_from_to ON fx_rates(from_currency, to_currency, effective_from DESC);

ALTER TABLE fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_fx" ON fx_rates FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_fx" ON fx_rates FOR INSERT TO anon WITH CHECK (true);

-- Seed initial rate UGX→USD (user can update via UI)
INSERT INTO fx_rates (from_currency, to_currency, rate, effective_from, source)
VALUES ('UGX', 'USD', 0.000271, '2026-04-26', 'manual_seed')
ON CONFLICT DO NOTHING;

-- ============ USER ACTIVITY ============
CREATE TABLE IF NOT EXISTS user_activity (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES team_members(id),
  activity_type    TEXT NOT NULL,
  entity_type      TEXT NOT NULL,
  entity_id        UUID,
  entity_name      TEXT,
  description      TEXT,
  metadata         JSONB DEFAULT '{}',
  read_by          JSONB DEFAULT '[]',
  visibility       TEXT NOT NULL DEFAULT 'all'
                   CHECK (visibility IN ('all','department','role','private')),
  visibility_target TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_user    ON user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_entity  ON user_activity(entity_type, entity_id);

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_activity" ON user_activity FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============ USER SESSIONS ============
CREATE TABLE IF NOT EXISTS user_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES team_members(id),
  login_at         TIMESTAMPTZ DEFAULT NOW(),
  logout_at        TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address       TEXT,
  user_agent       TEXT
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, login_at DESC);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_sessions" ON user_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
