-- Feature Toggles: per-department feature flags that hide/show UI sections
CREATE TABLE IF NOT EXISTS feature_toggles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_slug TEXT UNIQUE NOT NULL,
  feature_name TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  category TEXT,
  affects TEXT[],
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed all toggleable features across the OS
INSERT INTO feature_toggles (feature_slug, feature_name, description, enabled, category, affects) VALUES
-- Inventory
('inventory.chemicals',       'Chemical Inventory Tracking', 'Track chlorine and other treatment chemicals. Disable if not using chemical treatment.', true,  'inventory',   ARRAY['/inventory']),
('inventory.bottles_5l',      '5L Bottle SKU',               '5-litre single-use bottle product line.', true,  'inventory',   ARRAY['/inventory', '/production', '/dispatch']),
('inventory.bottles_1l',      '1L Premium Bottle SKU',       '1-litre premium bottle — future product line.', false, 'inventory',   ARRAY['/inventory', '/production', '/dispatch']),
('inventory.raw_materials',   'Raw Materials Incoming Inspection', 'Log and inspect incoming raw materials before use.', true,  'inventory',   ARRAY['/inventory']),
-- Production
('production.cip_log',        'Clean-In-Place (CIP) Tracking', 'Log CIP cleaning cycles after each production run.', true,  'production',  ARRAY['/production']),
('production.batch_photos',   'Batch Photo Capture',         'Allow operators to photograph batches on log.', true,  'production',  ARRAY['/production']),
('production.voice_input',    'Voice Input on Batch Forms',  'Use speech recognition to fill batch notes.', true,  'production',  ARRAY['/production']),
-- Quality
('quality.uv_monitoring',     'UV System Monitoring',        'Log UV output readings and lamp hours.', true,  'quality',     ARRAY['/quality']),
('quality.ph_calibration',    'pH Meter Calibration Log',    'Record pH meter calibration checks.', true,  'quality',     ARRAY['/quality']),
('quality.non_conforming',    'Non-Conforming Materials Log','Track and quarantine materials that fail inspection.', true,  'quality',     ARRAY['/quality']),
('quality.raw_water_analysis','Raw Water Analysis Form',     'Log raw (incoming) water quality tests.', true,  'quality',     ARRAY['/quality']),
-- Finance
('finance.scenarios',         'What-If Scenario Planning',   'Financial scenario builder for projections.', true,  'finance',     ARRAY['/finance']),
('finance.audit_log',         'Finance Audit Trail',         'Full audit log of every financial entry change.', true,  'finance',     ARRAY['/finance']),
('finance.investor_view',     'Investor Reporting View',     'Investor-facing financial summary and cap table.', true,  'finance',     ARRAY['/finance']),
-- Dispatch / Sales
('dispatch.maps',             'Delivery Route Maps',         'Show route maps for delivery field staff.', true,  'dispatch',    ARRAY['/dispatch']),
('dispatch.cash_collection',  'Cash Collection Tracking',   'Log and reconcile cash collected per delivery.', true,  'dispatch',    ARRAY['/dispatch']),
('sales.distributor_crm',     'Distributor CRM',            'Full CRM pipeline for distributor management.', true,  'sales',       ARRAY['/dispatch/crm', '/sales']),
('sales.commission_tracking', 'Commission Tracking',         'Track agent and delivery commissions.', false, 'sales',       ARRAY['/sales']),
-- Marketing
('marketing.prospect_pipeline','Prospect Pipeline (Kanban)', 'Kanban board for tracking distributor prospects.', true,  'marketing',   ARRAY['/marketing']),
('marketing.content_calendar','Content Calendar',            'Social media and content planning calendar.', true,  'marketing',   ARRAY['/marketing']),
-- Compliance
('compliance.capa',           'CAPA Tracking (Corrective Action)', 'Track corrective and preventive actions.', true,  'compliance',  ARRAY['/compliance']),
('compliance.unbs_checklist', 'UNBS Audit Checklist',        'UNBS installation and audit readiness checklist.', true,  'compliance',  ARRAY['/compliance']),
('compliance.document_registry','Document Registry',         'Central registry for all regulatory documents.', true,  'compliance',  ARRAY['/compliance']),
-- Technology
('technology.simulation_mode','Simulation Mode',             'Run the OS with simulated data (testing only).', false, 'technology',  ARRAY['/technology']),
('technology.ai_health',      'AI Health Dashboard',         'Monitor Groq / Gemini / Claude API health.', true,  'technology',  ARRAY['/technology']),
-- Worker experience
('worker.achievements',       'Worker Achievements & Streaks', 'Gamified achievements and streak tracking for operators.', true,  'worker',      ARRAY['/my-work']),
('worker.personal_goals',     'Personal Production Goals',   'Operators set and track personal daily targets.', true,  'worker',      ARRAY['/my-work']),
-- QMS / Documents
('qms.drive_integration',     'QMS Drive Integration',       'Show Richard\'s QMS documents linked to each dept page.', true,  'qms',         ARRAY['/qms', '/production', '/quality', '/inventory', '/compliance'])
ON CONFLICT (feature_slug) DO NOTHING;
