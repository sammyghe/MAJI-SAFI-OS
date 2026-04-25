-- Part 11: Business Plan as Living Config
-- The plan is stored in Supabase, not a static doc.
-- Each assumption links to the real data it comes from.

CREATE TABLE IF NOT EXISTS business_plan_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  version_label TEXT NOT NULL,  -- e.g. 'v1.0 — Pre-UNBS', 'v2.0 — Post-Launch'
  status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'draft',
  summary TEXT,
  created_by TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS business_plan_assumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES business_plan_versions(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'market', 'production', 'revenue', 'costs', 'team',
    'funding', 'milestones', 'risks', 'regulatory'
  )),
  label TEXT NOT NULL,
  assumption_text TEXT NOT NULL,
  -- Link to real data (optional): what table/metric validates this assumption
  source_table TEXT,
  source_metric TEXT,
  actual_value NUMERIC,
  target_value NUMERIC,
  unit TEXT,
  status TEXT NOT NULL CHECK (status IN ('on_track', 'at_risk', 'off_track', 'not_started', 'achieved')) DEFAULT 'not_started',
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE business_plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_plan_assumptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_bp_versions" ON business_plan_versions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_bp_versions" ON business_plan_versions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_bp_assumptions" ON business_plan_assumptions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_bp_assumptions" ON business_plan_assumptions FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed the initial business plan version
WITH v AS (
  INSERT INTO business_plan_versions (version_label, status, summary, created_by, activated_at)
  VALUES (
    'v1.0 — Pre-Launch (April 2026)',
    'active',
    'Business plan as at April 2026 — UNBS certification in progress, commercial launch post-May 20.',
    'founder',
    now()
  )
  RETURNING id
)
INSERT INTO business_plan_assumptions (version_id, category, label, assumption_text, source_table, source_metric, target_value, unit, status, sort_order)
SELECT v.id, a.category, a.label, a.assumption_text, a.source_table, a.source_metric, a.target_value, a.unit, a.status, a.sort_order
FROM v, (VALUES
  -- Market
  ('market', 'Pre-sold Day 1', '300 jars committed from distributors on Day 1', 'distributors', 'active_count', 10, 'distributors', 'not_started', 10),
  ('market', 'Year 1 Revenue', 'UGX 447.7M projected revenue in first 12 months', 'sales_ledger', 'annual_revenue', 447700000, 'UGX', 'not_started', 20),
  ('market', 'Year 1 Net Profit', 'UGX 255.8M net profit after all costs', NULL, NULL, 255800000, 'UGX', 'not_started', 30),
  -- Production
  ('production', 'Month 1 Target', '500 jars/day from Month 1', 'production_logs', 'daily_avg_jars', 500, 'jars/day', 'not_started', 10),
  ('production', 'Capacity', '6,000 LPH = 2,000 jars/day maximum', NULL, NULL, 2000, 'jars/day', 'not_started', 20),
  ('production', 'Break-even', '220–240 jars/day at T1 wholesale pricing', NULL, NULL, 230, 'jars/day', 'not_started', 30),
  -- Revenue
  ('revenue', 'T1 Refill Price', 'UGX 3,000 per 20L refill at T1 (pickup)', 'product_pricing', 't1_refill_price', 3000, 'UGX', 'not_started', 10),
  ('revenue', 'T2 Refill Price', 'UGX 4,000 per 20L refill at T2 (tuk-tuk)', 'product_pricing', 't2_refill_price', 4000, 'UGX', 'not_started', 20),
  -- Costs
  ('costs', 'COGS Target', 'COGS < 40% of revenue at scale', 'product_unit_economics', 'avg_cogs_pct', 40, '%', 'not_started', 10),
  ('costs', 'Monthly OpEx', 'Operating expenses < UGX 3M/month at launch', 'transactions', 'monthly_opex', 3000000, 'UGX', 'not_started', 20),
  -- Regulatory
  ('regulatory', 'UNBS Certification', 'UNBS inspection May 14, certification May 19-20 2026', NULL, NULL, NULL, NULL, 'not_started', 10),
  ('regulatory', 'Pre-money Valuation', 'UGX 800,000,000 (~$226,500 USD)', NULL, NULL, 800000000, 'UGX', 'not_started', 20),
  -- Funding
  ('funding', 'Mike Investment', '15% of Samuel''s shares — partial received', NULL, NULL, NULL, NULL, 'on_track', 10),
  ('funding', 'Amon Investment', '$25K for 10% of Samuel''s shares', NULL, NULL, 25000, 'USD', 'on_track', 20),
  -- Milestones
  ('milestones', 'Private Lab Testing', 'April 24-27 2026 — water quality pre-certification', NULL, NULL, NULL, NULL, 'on_track', 10),
  ('milestones', 'Commercial Launch', 'Post May 20 2026 after UNBS certification', NULL, NULL, NULL, NULL, 'not_started', 20),
  ('milestones', 'Location 2', 'Second location within 12 months of launch', NULL, NULL, NULL, NULL, 'not_started', 30)
) AS a(category, label, assumption_text, source_table, source_metric, target_value, unit, status, sort_order);
