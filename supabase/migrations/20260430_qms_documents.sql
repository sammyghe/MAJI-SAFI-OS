-- QMS Documents: Richard's Google Drive Quality Management System linked to the OS
CREATE TABLE IF NOT EXISTS qms_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  drive_file_id TEXT NOT NULL,
  drive_url TEXT NOT NULL,
  category TEXT,
  owner_role TEXT,
  unbs_required BOOLEAN DEFAULT false,
  related_os_page TEXT,
  related_db_table TEXT,
  last_reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed all QMS documents from Richard's Drive folder
-- Drive folder: /15X6NHxGDPSd404oaUSGsfbPKWqcVMXNI
INSERT INTO qms_documents (doc_slug, title, drive_file_id, drive_url, category, owner_role, unbs_required, related_os_page, related_db_table) VALUES
('process-flow-chart',       'Process Flow Chart',                    '1BCzSqfzpyOXiTAqwzBgsTDmya69CpShZuwYSDWiHnwc', 'https://docs.google.com/document/d/1BCzSqfzpyOXiTAqwzBgsTDmya69CpShZuwYSDWiHnwc/edit', 'production',  'production_assistant', true,  '/production', 'production_logs'),
('production-inventory',     'Production Inventory Form',             '109HKP8uvLnF2JfDtpiKtAg7Derz9RB_Y6HlhdzueQ08', 'https://docs.google.com/document/d/109HKP8uvLnF2JfDtpiKtAg7Derz9RB_Y6HlhdzueQ08/edit', 'production',  'lead_operator',        true,  '/production', 'production_logs'),
('raw-water-analysis',       'Raw Water Analysis Form',               '1yglGbZhQH0TJ93ul89sU8JK5GxivWI51e_gnLQaz_4w', 'https://docs.google.com/document/d/1yglGbZhQH0TJ93ul89sU8JK5GxivWI51e_gnLQaz_4w/edit', 'quality',     'quality',              true,  '/quality',    'water_tests'),
('treated-water-analysis',   'Treated Water Analysis Form',           '1padGrXFmOWrVrMqyxdDpZYT14wzDSoiD28HwkermAKk', 'https://docs.google.com/document/d/1padGrXFmOWrVrMqyxdDpZYT14wzDSoiD28HwkermAKk/edit', 'quality',     'quality',              true,  '/quality',    'water_tests'),
('hygiene-checklist',        'Hygiene Checklist',                     '1kJAjPexAwWplT9W3WzLRASKn3kp-_dNPF23ZhUxIKEc', 'https://docs.google.com/document/d/1kJAjPexAwWplT9W3WzLRASKn3kp-_dNPF23ZhUxIKEc/edit', 'production',  'production_assistant', true,  '/production', null),
('cip-form',                 'Clean-In-Place (CIP) Form',             '1ae5-brylWBg_G01ZaBjax3Z3WDSWw60s-Ji2LSPEuIc', 'https://docs.google.com/document/d/1ae5-brylWBg_G01ZaBjax3Z3WDSWw60s-Ji2LSPEuIc/edit', 'production',  'production_assistant', true,  '/production', null),
('ph-calibration',           'pH Meter Calibration Form',             '19F2WDeEWjvKCUr73GWkzDykHfD5rbRrcqBUS7CvxQ8k', 'https://docs.google.com/document/d/19F2WDeEWjvKCUr73GWkzDykHfD5rbRrcqBUS7CvxQ8k/edit', 'quality',     'quality',              true,  '/quality',    null),
('uv-monitoring',            'UV Monitoring Form',                    '1j9Y5BGaYGkf9hBm75QVyStMT9UTOcZtEGPXk5-UXi9I', 'https://docs.google.com/document/d/1j9Y5BGaYGkf9hBm75QVyStMT9UTOcZtEGPXk5-UXi9I/edit', 'quality',     'quality',              true,  '/quality',    null),
('raw-materials-inspection', 'Raw Materials Incoming Inspection',     '14xv1e4oDtykiods1K_KsxFKwM2cA0_pf6NijdBoa9Ek', 'https://docs.google.com/document/d/14xv1e4oDtykiods1K_KsxFKwM2cA0_pf6NijdBoa9Ek/edit', 'inventory',   'inventory',            true,  '/inventory',  'inventory_items'),
('stores-inventory',         'Stores Inventory Form',                 '1fXSyICmkROXclwNd959GuhNGjNbw1BG-uSiUESh8Ckg', 'https://docs.google.com/document/d/1fXSyICmkROXclwNd959GuhNGjNbw1BG-uSiUESh8Ckg/edit', 'inventory',   'inventory',            true,  '/inventory',  'inventory_items'),
('non-conforming-materials', 'Non-Conforming Materials Form',         '1JUd_C0JyJuo9mQUYVsPYb7gxN0rDq3rUR87SSMv2AyM', 'https://docs.google.com/document/d/1JUd_C0JyJuo9mQUYVsPYb7gxN0rDq3rUR87SSMv2AyM/edit', 'quality',     'quality',              true,  '/quality',    null),
('packaging-bottle-cleaning','Cleaning Procedure — Packaging Bottles','1ySGMPTqfiADZIJEOr8Iy9neslK1dOTOF8MrEK6lAfL0', 'https://docs.google.com/document/d/1ySGMPTqfiADZIJEOr8Iy9neslK1dOTOF8MrEK6lAfL0/edit', 'production',  'production_assistant', true,  '/production', null),
('car-form',                 'Corrective Action Request (CAR) Form',  '1nfQBuONTHKdV19H0BtYcY25sBIao_r3XZiA_HKrGxXg', 'https://docs.google.com/document/d/1nfQBuONTHKdV19H0BtYcY25sBIao_r3XZiA_HKrGxXg/edit', 'compliance',  'compliance',           true,  '/compliance', null),
('unbs-audit-checklist',     'UNBS Installation & Audit Checklist',   '1B2UTt3hDywDD-RHrJNTK8JlltZPWbsfOMNqOaZcFKfE', 'https://docs.google.com/document/d/1B2UTt3hDywDD-RHrJNTK8JlltZPWbsfOMNqOaZcFKfE/edit', 'compliance',  'compliance',           true,  '/compliance', null)
ON CONFLICT (doc_slug) DO NOTHING;
