-- Session 5A Part 1: Information Architecture
-- information_relationships: every cross-department data flow as a row

CREATE TABLE IF NOT EXISTS information_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_dept_slug TEXT NOT NULL,
  target_dept_slug TEXT NOT NULL,
  data_category TEXT NOT NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('summary','detail','alert','none')),
  entity_table TEXT,
  entity_filter JSONB DEFAULT '{}',
  refresh_frequency TEXT DEFAULT 'realtime' CHECK (refresh_frequency IN ('realtime','daily','weekly')),
  why_shared TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  created_by TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE information_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_info_rel" ON information_relationships FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS info_rel_source_idx ON information_relationships(source_dept_slug);
CREATE INDEX IF NOT EXISTS info_rel_target_idx ON information_relationships(target_dept_slug);

-- Seed the full cross-department flow matrix (~60 rows)
INSERT INTO information_relationships
  (source_dept_slug, target_dept_slug, data_category, share_type, entity_table, entity_filter, refresh_frequency, why_shared)
VALUES

-- ═══ PRODUCTION → others ═══
('production', 'quality',        'batch_created',     'detail',  'production_logs',  '{"status":"created"}',   'realtime', 'Quality must QC every new batch before dispatch can proceed'),
('production', 'inventory',      'raw_material_used',  'summary', 'production_logs',  '{}',                     'realtime', 'Each batch consumes jars, caps, labels, chemicals — inventory must decrement'),
('production', 'dispatch',       'batch_ready',        'summary', 'production_logs',  '{"status":"qc_passed"}', 'realtime', 'Dispatch can only pick up batches that have passed QC'),
('production', 'finance',        'cogs_daily',         'summary', 'production_logs',  '{}',                     'daily',    'Daily production volume drives COGS calculation for P&L'),
('production', 'founder-office', 'daily_jar_count',    'summary', 'production_logs',  '{}',                     'realtime', 'Founders track production vs 500-jar/day target in real time'),
('production', 'technology',     'system_events',      'summary', 'events',           '{"department":"production"}', 'realtime', 'Technology monitors for production halt events and system anomalies'),
('production', 'sales',          'capacity_available', 'summary', 'production_logs',  '{}',                     'daily',    'Sales must not over-promise orders beyond today''s available production'),
('production', 'compliance',     'batch_log_completeness', 'summary', 'production_logs', '{}',                  'daily',    'Compliance tracks that every production day has a corresponding batch log'),

-- ═══ QUALITY → others ═══
('quality', 'production',     'qc_result',         'alert',   'water_tests',   '{"result":"FAIL"}',         'realtime', 'QC FAIL immediately halts production — production must know within seconds'),
('quality', 'dispatch',       'batch_cleared',     'alert',   'water_tests',   '{"result":"PASS"}',         'realtime', 'Only QC-PASS batches may be dispatched — dispatch waits for this signal'),
('quality', 'compliance',     'daily_test_results', 'detail', 'water_tests',   '{}',                        'daily',    'UNBS requires 5 daily tests logged — compliance tracks completeness for audit'),
('quality', 'founder-office', 'qc_pass_rate',      'summary', 'water_tests',   '{}',                        'realtime', 'Founders monitor 100% pass-rate target; any fail triggers escalation'),
('quality', 'finance',        'retest_cost',       'summary', 'capa_records',  '{}',                        'daily',    'QC fails that require retest or batch discard create COGS variance'),
('quality', 'inventory',      'failed_batch_hold', 'alert',   'water_tests',   '{"result":"FAIL"}',         'realtime', 'Failed batch jars held in quarantine — inventory must not allocate them'),
('quality', 'technology',     'qc_anomaly_events', 'summary', 'events',        '{"department":"quality"}',  'realtime', 'Technology aggregates QC anomaly frequency for system health score'),

-- ═══ INVENTORY → others ═══
('inventory', 'production',     'stock_levels',       'detail',  'inventory_items', '{}',                   'realtime', 'Production needs current jar/cap/chemical stock to plan batch sizes'),
('inventory', 'dispatch',       'jar_availability',   'summary', 'inventory_items', '{"item_type":"jar"}',  'realtime', 'Dispatch checks available finished-goods count before confirming orders'),
('inventory', 'finance',        'stock_valuation',    'summary', 'inventory_items', '{}',                   'daily',    'Finance includes current inventory at cost in the balance sheet and COGS'),
('inventory', 'founder-office', 'reorder_alerts',     'alert',   'inventory_items', '{"below_threshold":true}', 'realtime', 'Founders see reorder alerts so procurement decisions can be made quickly'),
('inventory', 'compliance',     'chemical_log',       'summary', 'inventory_items', '{"item_type":"chemical"}', 'daily', 'UNBS requires chemical usage logs — compliance pulls from inventory records'),
('inventory', 'technology',     'stockout_risk',      'alert',   'inventory_items', '{}',                   'realtime', 'Technology flags stockout risk events to the morning brief system'),
('inventory', 'sales',          'product_availability','summary','inventory_items', '{}',                   'daily',    'Sales must know which SKUs are available before quoting delivery dates to distributors'),

-- ═══ DISPATCH → others ═══
('dispatch', 'sales',          'delivery_confirmed',  'detail',  'sales_ledger',   '{}',                  'realtime', 'Sales ledger records are completed at point of delivery — sales visibility needed'),
('dispatch', 'finance',        'cash_collected',      'detail',  'sales_ledger',   '{}',                  'realtime', 'Every sale creates a cash inflow that Finance must reconcile before EOD'),
('dispatch', 'inventory',      'jars_dispatched',     'summary', 'sales_ledger',   '{}',                  'realtime', 'Each dispatched order decrements finished-goods inventory in real time'),
('dispatch', 'founder-office', 'route_completion',    'summary', 'sales_ledger',   '{}',                  'realtime', 'Founders track % of daily orders delivered as an operational KPI'),
('dispatch', 'marketing',      'distributor_activity','summary', 'distributors',   '{"status":"active"}', 'daily',    'Marketing needs delivery activity per distributor to flag sleeping accounts'),
('dispatch', 'compliance',     'delivery_cash_log',   'summary', 'sales_ledger',   '{}',                  'daily',    'All cash collections must be logged; compliance verifies against EOD close'),
('dispatch', 'technology',     'delivery_events',     'summary', 'events',         '{"department":"dispatch"}', 'realtime', 'Technology tracks delivery event stream for morning brief generation'),

-- ═══ SALES → others ═══
('sales', 'production',     'demand_forecast',    'summary', 'distributors',  '{"status":"active"}', 'daily',    'Production plans daily jar count from confirmed distributor order pipeline'),
('sales', 'marketing',      'distributor_status', 'detail',  'distributors',  '{}',                  'daily',    'Marketing tracks which distributors are sleeping/churned to prioritise outreach'),
('sales', 'finance',        'revenue_pipeline',   'summary', 'sales_ledger',  '{}',                  'realtime', 'Finance P&L is driven by confirmed sales; revenue recognition flows from sales ledger'),
('sales', 'dispatch',       'order_queue',        'detail',  'distributors',  '{"status":"active"}', 'daily',    'Dispatch needs tomorrow''s confirmed orders to plan routes and loading'),
('sales', 'founder-office', 'revenue_mtd',        'summary', 'sales_ledger',  '{}',                  'realtime', 'Founders watch MTD revenue vs 300-jar/day Day-1 pre-sold target'),
('sales', 'technology',     'sales_events',       'summary', 'events',        '{"department":"sales"}', 'realtime', 'Technology aggregates sales events for morning brief and anomaly detection'),
('sales', 'inventory',      'sku_demand',         'summary', 'sales_ledger',  '{}',                  'daily',    'Inventory uses SKU demand patterns to maintain right product mix in stock'),

-- ═══ MARKETING → others ═══
('marketing', 'sales',          'prospect_pipeline',  'detail',  'distributors',  '{"status":"lead"}',  'daily',    'Qualified prospects from marketing pass to sales for contract closure'),
('marketing', 'founder-office', 'pipeline_summary',   'summary', 'distributors',  '{}',                 'weekly',   'Founders review pipeline health: 3 new T1 prospects/week is the target'),
('marketing', 'finance',        'campaign_spend',     'summary', 'transactions',  '{"category":"Marketing"}', 'daily', 'Finance tracks marketing budget burn rate; alerts when 80% spent'),
('marketing', 'technology',     'content_events',     'summary', 'events',        '{"department":"marketing"}', 'weekly', 'Technology logs when campaigns launch to correlate with sales spikes'),
('marketing', 'sales',          'churn_risk',         'alert',   'distributors',  '{"status":"sleeping"}', 'daily',  'Marketing flags sleeping distributors to sales for immediate follow-up'),
('marketing', 'compliance',     'brand_compliance',   'summary', 'distributors',  '{}',                  'weekly',   'Compliance ensures all marketing materials reference valid UNBS certification'),

-- ═══ FINANCE → others ═══
('finance', 'founder-office', 'pnl_summary',        'detail',  'transactions',  '{}',                    'daily',    'Founders review P&L daily — gross margin, OpEx by category, runway'),
('finance', 'founder-office', 'cash_position',      'detail',  'bank_accounts', '{}',                    'realtime', 'Founders need live cash-on-hand to make procurement and salary decisions'),
('finance', 'compliance',     'tax_obligations',    'summary', 'transactions',  '{}',                    'weekly',   'Compliance tracks VAT filing deadlines and NSSF payment dates from Finance data'),
('finance', 'technology',     'budget_variance',    'summary', 'budgets',       '{}',                    'weekly',   'Technology department has its own budget line; Finance shares variance against it'),
('finance', 'production',     'cogs_target',        'summary', 'product_unit_economics', '{}',           'weekly',   'Production must know COGS per jar to stay within unit economics targets'),
('finance', 'inventory',      'procurement_budget', 'summary', 'budgets',       '{"category":"inventory"}', 'weekly', 'Inventory procurement decisions must stay within Finance-approved budget envelope'),
('finance', 'sales',          'revenue_target',     'summary', 'business_plan_assumptions', '{"category":"revenue"}', 'weekly', 'Sales team sees the UGX 447.7M Year 1 revenue target from Finance'),
('finance', 'dispatch',       'cash_reconciliation','alert',   'transactions',  '{}',                    'daily',    'Finance flags any day where cash_counted ≠ cash_expected for dispatch review'),

-- ═══ COMPLIANCE → others ═══
('compliance', 'production',     'unbs_standards',    'detail',  'compliance_records', '{"category":"UNBS"}', 'weekly', 'Production must operate to current UNBS standards stored in compliance registry'),
('compliance', 'quality',        'test_requirements', 'detail',  'compliance_records', '{"category":"UNBS"}', 'weekly', 'Quality uses UNBS test requirements from compliance to configure daily test checklist'),
('compliance', 'founder-office', 'expiry_alerts',     'alert',   'compliance_records', '{}',               'daily',    'Founders need 30-day advance warning on any certification, permit, or license expiry'),
('compliance', 'finance',        'regulatory_fees',   'summary', 'compliance_records', '{}',               'monthly',  'UNBS renewal fees, business permit costs flow into Finance budget as compliance expenses'),
('compliance', 'technology',     'compliance_events', 'summary', 'events',             '{"department":"compliance"}', 'daily', 'Technology includes compliance alerts in the morning brief dashboard'),
('compliance', 'marketing',      'cert_status',       'summary', 'compliance_records', '{"category":"UNBS"}', 'weekly', 'Marketing must reference valid UNBS certification number in all brand materials'),
('compliance', 'dispatch',       'permit_status',     'alert',   'compliance_records', '{"category":"permit"}', 'weekly', 'Dispatch vehicles require valid operating permits — compliance flags any lapse'),

-- ═══ TECHNOLOGY → others ═══
('technology', 'founder-office', 'system_health',    'summary', 'events',     '{"event_type":"system"}',   'realtime', 'Founders see AI health, API uptime, and deployment status at a glance'),
('technology', 'founder-office', 'morning_brief',    'detail',  'events',     '{}',                        'daily',    'Technology delivers the 6AM morning brief aggregating all 9 departments'),
('technology', 'compliance',     'data_completeness','summary', 'events',     '{"event_type":"missing_log"}','daily',   'Compliance uses Technology''s 11PM log-check to identify missing records before audit'),
('technology', 'finance',        'api_costs',        'summary', 'transactions','{"category":"Technology"}', 'monthly',  'AI API costs (Groq/Gemini/Anthropic) are a technology budget line tracked in Finance'),

-- ═══ FOUNDER OFFICE ↔ all ═══
('founder-office', 'production',  'strategic_targets', 'summary', 'business_plan_assumptions', '{"category":"production"}', 'weekly', 'Production team sees strategic jar targets set by founders in the business plan'),
('founder-office', 'finance',     'investor_reporting','detail',  'business_plan_assumptions', '{}',                         'weekly', 'Finance prepares investor reports anchored to founders'' business plan assumptions'),
('founder-office', 'all',         'policy_decisions',  'summary', 'founder_decisions',         '{}',                         'daily',  'Policy decisions made by founders are broadcast to all departments for alignment');
