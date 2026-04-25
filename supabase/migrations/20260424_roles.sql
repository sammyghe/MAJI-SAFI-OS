-- ROLES TABLE + SEEDED ROLES
-- Paste in Supabase SQL Editor to apply.
-- Each role controls landing_page, sidebar_items, ui_density, and permissions JSONB.

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  landing_page TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  sidebar_items JSONB NOT NULL DEFAULT '[]',
  ui_density TEXT DEFAULT 'normal',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (slug, name, description, landing_page, permissions, sidebar_items, ui_density) VALUES
('founder', 'Founder', 'Full access. Owns strategy, approvals, cap table.', '/home/founder',
  '{"all": true}'::jsonb,
  '["home","founder-office","production","quality","inventory","dispatch","sales","marketing","finance","compliance","technology","investor","settings"]'::jsonb,
  'normal'),
('operations_manager', 'Operations Manager', 'Runs the plant. Owns daily KPIs, team, plant SOPs.', '/home/manager',
  '{"departments": ["production","quality","inventory","dispatch","sales"], "view_payroll": false, "view_cap_table": false, "approve_expenses": false, "edit_team_in_dept": true}'::jsonb,
  '["home","production","quality","inventory","dispatch","sales","compliance","settings"]'::jsonb,
  'normal'),
('lead_operator', 'Lead Machine Operator', 'Operates UF system. Logs batches, runs QC, maintenance.', '/home/operator',
  '{"departments":["production","quality"], "scope":"own_shift"}'::jsonb,
  '["home","production","quality"]'::jsonb,
  'large'),
('production_assistant', 'Production Assistant', 'Jar handling, cleaning, hygiene support.', '/home/operator',
  '{"departments":["production","inventory"], "scope":"own_tasks"}'::jsonb,
  '["home","production","inventory"]'::jsonb,
  'large'),
('delivery_field', 'Delivery & Field', 'Routes, returns, customer collection.', '/home/delivery',
  '{"departments":["dispatch"], "scope":"own_route"}'::jsonb,
  '["home","dispatch"]'::jsonb,
  'large'),
('marketing', 'Marketing', 'Prospect pipeline, campaigns, content.', '/home/marketing',
  '{"departments":["marketing","sales"], "edit_prospects": true}'::jsonb,
  '["home","marketing","sales"]'::jsonb,
  'normal'),
('compliance', 'Compliance', 'UNBS, NEMA, URSB, audits.', '/home/compliance',
  '{"departments":["compliance"], "view_documents": true}'::jsonb,
  '["home","compliance","documents"]'::jsonb,
  'normal')
ON CONFLICT (slug) DO NOTHING;

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS anon_read_roles ON roles;
CREATE POLICY anon_read_roles ON roles FOR SELECT TO anon USING (true);

-- Add role_id FK to team_members
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role_id);
