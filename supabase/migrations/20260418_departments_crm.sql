-- ============================================================
-- Session 8-9: departments table, distributors CRM, onboarding
-- ============================================================

-- 1. departments table (sidebar is DB-driven from now on)
CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  purpose TEXT,
  daily_target TEXT,
  owner TEXT,
  icon TEXT DEFAULT 'Zap',
  location_id TEXT DEFAULT 'buziga',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the 9 locked departments from CLAUDE.md section 3
INSERT INTO departments (slug, name, purpose, daily_target, owner, icon) VALUES
  ('founder-office', 'Founder Office', 'Strategy, phase decisions, investor relations', 'Review all dept signals', 'Samuel + Ema', 'Users'),
  ('production',     'Production',     'Fill jars, log batches, machine uptime', '500 jars/day Month 1', 'Bosco', 'Factory'),
  ('quality',        'Quality',        '5 daily UNBS tests, halt authority', '100% pass rate', 'Bosco', 'CheckCircle2'),
  ('inventory',      'Inventory',      'Jars, caps, labels, chemicals — stock levels', 'Zero stockouts', 'Bosco', 'Package'),
  ('dispatch',       'Dispatch',       'Sales logging, cash collection, distributor tracking', 'Cash = system match', 'Bosco', 'Truck'),
  ('marketing',      'Marketing',      'Distributor pipeline, brand, content', '3 T1 prospects/week', 'TBD', 'TrendingUp'),
  ('finance',        'Finance',        'Daily P&L, break-even, cash, investor reporting', 'Cash reconciled daily', 'Samuel + Ema', 'DollarSign'),
  ('compliance',     'Compliance',     'UNBS, HR, legal, document registry', 'All deadlines tracked', 'TBD', 'Shield'),
  ('technology',     'Technology',     'System health, integrations, morning brief delivery', '99% uptime', 'TBD', 'Zap')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_departments" ON departments;
CREATE POLICY "anon_all_departments" ON departments FOR ALL TO anon USING (true) WITH CHECK (true);

-- 2. distributors table (Sales CRM)
CREATE TABLE IF NOT EXISTS distributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT DEFAULT 'buziga',
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  zone TEXT,
  tier TEXT DEFAULT 'T1',
  status TEXT DEFAULT 'active',
  total_orders INT DEFAULT 0,
  total_revenue_ugx BIGINT DEFAULT 0,
  last_order_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE distributors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_distributors" ON distributors;
CREATE POLICY "anon_all_distributors" ON distributors FOR ALL TO anon USING (true) WITH CHECK (true);

-- 3. Onboarding checklist on team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB DEFAULT
  '{"contract_signed": false, "medical_cert": false, "nssf_registered": false, "sop_training": false}';

-- 4. Fix access_level for founders (Samuel + Ema/Amanuel)
UPDATE team_members
SET access_level = 'founder'
WHERE LOWER(name) LIKE '%samuel%'
   OR LOWER(name) LIKE '%amanuel%'
   OR LOWER(name) LIKE '%ema%';

-- 5. Fix access_level for Bosco (manager)
UPDATE team_members
SET access_level = 'manager',
    departments  = ARRAY['production','quality','inventory','dispatch']
WHERE LOWER(name) LIKE '%bosco%';

-- 6. CAPA table (corrective actions from QC fails)
CREATE TABLE IF NOT EXISTS capa_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT DEFAULT 'buziga',
  event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  batch_id TEXT,
  test_type TEXT,
  reading NUMERIC,
  status TEXT DEFAULT 'open',
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE capa_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon_all_capa" ON capa_records;
CREATE POLICY "anon_all_capa" ON capa_records FOR ALL TO anon USING (true) WITH CHECK (true);
