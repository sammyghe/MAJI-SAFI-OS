-- Session 5C: Worker Action Rules Engine

CREATE TABLE IF NOT EXISTS worker_action_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug TEXT NOT NULL,
  role_slug TEXT NOT NULL,
  rule_name TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  action_label TEXT NOT NULL,
  action_url TEXT NOT NULL,
  action_icon TEXT,
  priority INT DEFAULT 100,
  active BOOLEAN DEFAULT true,
  created_by TEXT,
  location_id TEXT DEFAULT 'buziga',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE worker_action_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all_worker_action_rules ON worker_action_rules FOR ALL TO anon USING (true) WITH CHECK (true);
