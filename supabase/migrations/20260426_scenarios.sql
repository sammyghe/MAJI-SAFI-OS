-- Part 6: What-if Scenarios Engine
-- Lets founders model alternative assumptions without touching real data

CREATE TABLE IF NOT EXISTS scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  name TEXT NOT NULL,
  description TEXT,
  base_period TEXT NOT NULL, -- 'YYYY-MM'
  created_by TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each row overrides one assumption in the base period data
CREATE TABLE IF NOT EXISTS scenario_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  override_type TEXT NOT NULL CHECK (override_type IN (
    'jars_per_day',       -- daily production volume
    'price_t2_ugx',       -- T2 price for a product
    'cogs_ugx',           -- COGS for a product
    'opex_category_ugx',  -- monthly OpEx for a category
    'revenue_pct_change', -- % change applied to actual revenue
    'opex_pct_change'     -- % change applied to actual OpEx
  )),
  product_id UUID REFERENCES products(id),   -- nullable, for product-level overrides
  category TEXT,                              -- for opex_category_ugx
  override_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_scenarios" ON scenarios FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_scenarios" ON scenarios FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_read_overrides" ON scenario_overrides FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_overrides" ON scenario_overrides FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed one example scenario
INSERT INTO scenarios (name, description, base_period, created_by) VALUES
  ('Double Volume — Month 1', 'What if we hit 1,000 jars/day instead of 500?', to_char(now(), 'YYYY-MM'), 'founder')
ON CONFLICT DO NOTHING;
