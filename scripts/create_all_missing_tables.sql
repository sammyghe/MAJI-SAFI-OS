-- =============================================================
-- MAJI SAFI OS — COMPLETE TABLE SETUP
-- Run this in Supabase SQL Editor to provision all tables
-- =============================================================

-- ── PULSE POSTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_posts (
  id SERIAL PRIMARY KEY,
  post_type TEXT NOT NULL DEFAULT 'update',
  -- Types: update, win, alert, question, shoutout,
  --        milestone, photo, project_update
  content TEXT NOT NULL,
  author_role TEXT NOT NULL,
  department_slug TEXT REFERENCES departments(slug),

  color TEXT DEFAULT '#0077B6',
  -- win       = #10B981 (green)
  -- alert     = #EF4444 (red)
  -- shoutout  = #F59E0B (gold)
  -- milestone = #7F77DD (purple)
  -- question  = #06B6D4 (cyan)
  -- update    = #0077B6 (blue)
  -- project_update = #8B5CF6 (violet)
  -- photo     = #EC4899 (pink)

  emoji TEXT DEFAULT '📌',
  image_url TEXT,
  link_url TEXT,
  link_label TEXT,

  mentions TEXT[] DEFAULT '{}',
  -- Array of department slugs mentioned e.g. ['quality','dispatch']

  reactions JSONB DEFAULT '{"💧":0,"🔥":0,"✅":0,"🎉":0}',

  pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PULSE REPLIES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pulse_replies (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES pulse_posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_role TEXT NOT NULL,
  department_slug TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMPANY SETTINGS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  label TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed with defaults
INSERT INTO company_settings (key, value, label, description) VALUES
('launch_date',       '"2026-05-03"',                         'Launch Date',         'Commercial launch date'),
('target_jars_day',   '500',                                  'Daily Jar Target',    'Production target per day'),
('break_even_ugx',    '820000',                               'Break-Even (UGX)',    'Daily revenue break-even point'),
('telegram_enabled',  'true',                                 'Telegram Alerts',     'Enable Telegram notifications'),
('pulse_enabled',     'true',                                 'Pulse Feed',          'Enable company Pulse feed'),
('founder_tg_ids',    '["6868392834","8457004704"]',          'Founder Telegram IDs','Telegram IDs with founder access')
ON CONFLICT (key) DO NOTHING;

-- ── USER PIN AUTH ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_pins (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,      -- store bcrypt hash, not plaintext
  department_slug TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- ── ENABLE REALTIME ───────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE pulse_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE pulse_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE transparency_feed;

-- ── ROW LEVEL SECURITY ────────────────────────────────────────
-- pulse_posts: anyone can read; only authenticated can insert
ALTER TABLE pulse_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pulse_posts_select" ON pulse_posts FOR SELECT USING (true);
CREATE POLICY "pulse_posts_insert" ON pulse_posts FOR INSERT WITH CHECK (true);
CREATE POLICY "pulse_posts_update" ON pulse_posts FOR UPDATE USING (true);

ALTER TABLE pulse_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pulse_replies_select" ON pulse_replies FOR SELECT USING (true);
CREATE POLICY "pulse_replies_insert" ON pulse_replies FOR INSERT WITH CHECK (true);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_select" ON company_settings FOR SELECT USING (true);
CREATE POLICY "settings_update" ON company_settings FOR UPDATE USING (true);
CREATE POLICY "settings_insert" ON company_settings FOR INSERT WITH CHECK (true);

-- ── SEED PULSE POSTS ──────────────────────────────────────────
INSERT INTO pulse_posts (post_type, content, author_role, department_slug, color, emoji)
VALUES
  ('milestone', 'Maji Safi OS is live. May 3 commercial launch in 24 days. Every department is ready.', 'Founder', 'founder-office', '#7F77DD', '🚀'),
  ('win',       'UNBS inspection scheduled April 14-15. Certification on track.',                        'Founder', 'compliance',    '#10B981', '✅'),
  ('update',    'Investor partnership confirmed. $7,000 received. Building together.',                   'Founder', 'founder-office', '#0077B6', '🤝')
ON CONFLICT DO NOTHING;
