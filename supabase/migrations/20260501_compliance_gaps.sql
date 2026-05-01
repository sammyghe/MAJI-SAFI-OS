-- Compliance gaps tracking for UNBS audit preparation
CREATE TABLE IF NOT EXISTS compliance_gaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT DEFAULT 'buziga' NOT NULL,
  source TEXT NOT NULL,
  gap_description TEXT NOT NULL,
  severity TEXT DEFAULT 'major' CHECK (severity IN ('critical','major','minor')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  due_date DATE,
  owner uuid REFERENCES team_members(id) ON DELETE SET NULL,
  evidence_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_by uuid REFERENCES team_members(id) ON DELETE SET NULL
);

ALTER TABLE compliance_gaps ENABLE ROW LEVEL SECURITY;
CREATE POLICY anon_all_gaps ON compliance_gaps FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed Richard's known UNBS gaps from audit
INSERT INTO compliance_gaps (location_id, source, gap_description, severity, due_date, status) VALUES
('buziga', 'UNBS Audit Item 9', 'Wash hand basin missing for staff in production area', 'critical', '2026-05-13', 'open'),
('buziga', 'UNBS Audit Item 10', 'PPE missing — coats, sandals, hair/beard nets for operators', 'critical', '2026-05-13', 'open')
ON CONFLICT DO NOTHING;
