-- Session 3: Operating Rhythm — Scorecard Engine
-- Tables: kpi_definitions (config), scorecard_snapshots (computed results)
-- Seeded with 18 real Maji Safi KPIs across all 10 departments

-- ============ KPI DEFINITIONS ============
CREATE TABLE IF NOT EXISTS kpi_definitions (
  id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id      TEXT    NOT NULL DEFAULT 'buziga',
  slug             TEXT    NOT NULL UNIQUE,
  name             TEXT    NOT NULL,
  department_slug  TEXT    NOT NULL,
  unit             TEXT    NOT NULL DEFAULT 'count',  -- count | ugx | pct | days | text
  target_value     NUMERIC,
  warning_threshold  NUMERIC,   -- value at or below this → amber
  critical_threshold NUMERIC,   -- value at or below this → red (for min-better KPIs, reversed)
  higher_is_better   BOOLEAN NOT NULL DEFAULT true,
  source_table     TEXT    NOT NULL,
  source_query     JSONB   NOT NULL DEFAULT '{}',
  cadence          TEXT    NOT NULL DEFAULT 'daily'
                   CHECK (cadence IN ('daily','weekly','monthly','quarterly')),
  display_format   TEXT    NOT NULL DEFAULT 'number'
                   CHECK (display_format IN ('number','currency','percent','days','text')),
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INT     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_defs_dept
  ON kpi_definitions(department_slug, sort_order);

-- ============ SCORECARD SNAPSHOTS ============
CREATE TABLE IF NOT EXISTS scorecard_snapshots (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id  TEXT    NOT NULL DEFAULT 'buziga',
  kpi_slug     TEXT    NOT NULL REFERENCES kpi_definitions(slug) ON DELETE CASCADE,
  period_date  DATE    NOT NULL,
  period_type  TEXT    NOT NULL DEFAULT 'daily'
               CHECK (period_type IN ('daily','weekly','monthly','quarterly')),
  actual_value NUMERIC,
  target_value NUMERIC,
  status       TEXT    CHECK (status IN ('on_track','at_risk','off_track','no_data')),
  computed_at  TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT,
  UNIQUE (location_id, kpi_slug, period_date, period_type)
);

CREATE INDEX IF NOT EXISTS idx_scorecard_snapshots_period
  ON scorecard_snapshots(location_id, period_date DESC, kpi_slug);

-- ============ SEED: 18 KPI DEFINITIONS ============

INSERT INTO kpi_definitions
  (slug, name, department_slug, unit, target_value, warning_threshold, critical_threshold,
   higher_is_better, source_table, source_query, cadence, display_format, sort_order)
VALUES

-- ── PRODUCTION (3 KPIs) ──────────────────────────────────────────────────────
(
  'jars_produced_today',
  'Jars Produced Today',
  'production', 'count', 500, 350, 200, true,
  'production_logs',
  '{"agg": "sum", "field": "jar_count", "filter": {"status": ["created","dispatched"]}}',
  'daily', 'number', 10
),
(
  'machine_uptime_pct',
  'Machine Uptime %',
  'production', 'pct', 95, 85, 70, true,
  'production_logs',
  '{"agg": "uptime_calc", "notes_field": "notes", "downtime_keyword": "downtime"}',
  'daily', 'percent', 20
),
(
  'batches_run_today',
  'Batches Run Today',
  'production', 'count', 3, 2, 1, true,
  'production_logs',
  '{"agg": "count"}',
  'daily', 'number', 30
),

-- ── QUALITY (2 KPIs) ─────────────────────────────────────────────────────────
(
  'qc_pass_rate_today',
  'QC Pass Rate Today',
  'quality', 'pct', 100, 90, 80, true,
  'water_tests',
  '{"agg": "pass_rate", "pass_value": "PASS", "result_field": "result"}',
  'daily', 'percent', 10
),
(
  'qc_pass_rate_7d',
  'QC Pass Rate 7-Day Rolling',
  'quality', 'pct', 98, 90, 80, true,
  'water_tests',
  '{"agg": "pass_rate", "pass_value": "PASS", "result_field": "result", "days_back": 7}',
  'daily', 'percent', 20
),

-- ── INVENTORY (2 KPIs) ───────────────────────────────────────────────────────
(
  'jar_stock_level',
  'Jar Stock On Hand',
  'inventory', 'count', 1000, 300, 150, true,
  'inventory_items',
  '{"agg": "sum", "field": "quantity", "filter": {"category": "jars", "status": "available"}}',
  'daily', 'number', 10
),
(
  'chemical_stock_days',
  'Chemical Stock (Days Remaining)',
  'inventory', 'days', 14, 7, 3, true,
  'inventory_items',
  '{"agg": "days_remaining_calc", "filter": {"category": "chemicals"}}',
  'daily', 'days', 20
),

-- ── DISPATCH (2 KPIs) ────────────────────────────────────────────────────────
(
  'cash_reconciled_today',
  'Cash Reconciled Today',
  'dispatch', 'pct', 100, 100, 95, true,
  'cash_reconciliation',
  '{"agg": "recon_pct", "cash_counted_field": "cash_counted", "expected_field": "cash_expected"}',
  'daily', 'percent', 10
),
(
  'deliveries_completed_today',
  'Deliveries Completed Today',
  'dispatch', 'count', 10, 7, 4, true,
  'transactions',
  '{"agg": "count", "filter": {"transaction_type": "dispatch", "status": "completed"}}',
  'daily', 'number', 20
),

-- ── SALES (2 KPIs) ───────────────────────────────────────────────────────────
(
  'revenue_today',
  'Revenue Today (UGX)',
  'sales', 'ugx', 1500000, 900000, 500000, true,
  'sales_ledger',
  '{"agg": "sum", "field": "amount"}',
  'daily', 'currency', 10
),
(
  'jars_sold_today',
  'Jars Sold Today',
  'sales', 'count', 50, 30, 15, true,
  'sales_ledger',
  '{"agg": "sum", "field": "quantity"}',
  'daily', 'number', 20
),

-- ── MARKETING (2 KPIs) ───────────────────────────────────────────────────────
(
  'active_distributors',
  'Active Distributors',
  'marketing', 'count', 20, 10, 5, true,
  'distributors',
  '{"agg": "count", "filter": {"status": "active"}}',
  'weekly', 'number', 10
),
(
  'new_leads_this_week',
  'New Leads This Week',
  'marketing', 'count', 3, 2, 0, true,
  'distributors',
  '{"agg": "count", "filter": {"status": "lead"}, "days_back": 7}',
  'weekly', 'number', 20
),

-- ── FINANCE (2 KPIs) ─────────────────────────────────────────────────────────
(
  'daily_pnl_ugx',
  'Daily P&L (UGX)',
  'finance', 'ugx', 200000, 0, -100000, true,
  'transactions',
  '{"agg": "pnl_calc", "revenue_types": ["sale","dispatch"], "cost_types": ["purchase","expense"]}',
  'daily', 'currency', 10
),
(
  'break_even_progress_pct',
  'Break-Even Progress %',
  'finance', 'pct', 100, 70, 40, true,
  'production_logs',
  '{"agg": "break_even_pct", "break_even_jars": 230, "target_field": "jar_count"}',
  'daily', 'percent', 20
),

-- ── COMPLIANCE (2 KPIs) ──────────────────────────────────────────────────────
(
  'docs_expiring_30d',
  'Documents Expiring in 30 Days',
  'compliance', 'count', 0, 2, 5, false,  -- lower is better
  'compliance_records',
  '{"agg": "count", "filter": {"status": "active"}, "expiry_field": "due_date", "days_ahead": 30}',
  'weekly', 'number', 10
),
(
  'open_capas',
  'Open CAPAs',
  'compliance', 'count', 0, 2, 5, false,  -- lower is better
  'capa_records',
  '{"agg": "count", "filter": {"status": "open"}}',
  'daily', 'number', 20
),

-- ── TECHNOLOGY (1 KPI) ───────────────────────────────────────────────────────
(
  'system_uptime_pct',
  'System Uptime %',
  'technology', 'pct', 99, 95, 90, true,
  'events',
  '{"agg": "uptime_pct", "filter": {"event_type": "system_down"}}',
  'daily', 'percent', 10
)

ON CONFLICT (slug) DO NOTHING;
