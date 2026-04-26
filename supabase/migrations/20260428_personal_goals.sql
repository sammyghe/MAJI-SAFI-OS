-- Session 5C: Personal Goals

CREATE TABLE IF NOT EXISTS personal_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id),
  goal_text TEXT NOT NULL,
  metric TEXT,
  target_value NUMERIC,
  current_value NUMERIC DEFAULT 0,
  target_date DATE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','achieved','dropped')),
  set_by TEXT DEFAULT 'self' CHECK (set_by IN ('self','manager','founder')),
  location_id TEXT DEFAULT 'buziga',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE personal_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all_personal_goals ON personal_goals FOR ALL TO anon USING (true) WITH CHECK (true);
