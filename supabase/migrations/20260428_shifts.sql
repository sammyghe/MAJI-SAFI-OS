-- Session 5C: Shifts Engine

CREATE TABLE IF NOT EXISTS shift_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_slug TEXT NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  days_of_week TEXT[] DEFAULT ARRAY['mon','tue','wed','thu','fri','sat'],
  active BOOLEAN DEFAULT true,
  location_id TEXT DEFAULT 'buziga',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id),
  shift_definition_id UUID REFERENCES shift_definitions(id),
  shift_date DATE NOT NULL,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','ended','missed','cancelled')),
  notes TEXT,
  location_id TEXT DEFAULT 'buziga',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shift_handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_shift_id UUID REFERENCES shifts(id),
  to_shift_id UUID REFERENCES shifts(id),
  status_summary TEXT,
  what_running TEXT,
  what_needs_attention TEXT,
  who_to_call TEXT,
  photos JSONB DEFAULT '[]',
  voice_notes_urls JSONB DEFAULT '[]',
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES team_members(id),
  location_id TEXT DEFAULT 'buziga',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shift_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_all_shift_definitions ON shift_definitions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_all_shifts ON shifts FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_all_shift_handovers ON shift_handovers FOR ALL TO anon USING (true) WITH CHECK (true);
