-- Session 4: CFO Platform — Products & Pricing Engine

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  category      TEXT,
  unit          TEXT NOT NULL,
  unit_type     TEXT,
  active        BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  metadata      JSONB DEFAULT '{}',
  created_by    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active, display_order);

CREATE TABLE IF NOT EXISTS product_pricing (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tier             TEXT NOT NULL,
  price_ugx        BIGINT NOT NULL,
  price_usd        NUMERIC,
  effective_from   DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to     DATE,
  delivery_included BOOLEAN DEFAULT false,
  delivery_method  TEXT,
  notes            TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_product_pricing_product ON product_pricing(product_id, tier, effective_from DESC);

CREATE TABLE IF NOT EXISTS product_unit_economics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  cost_component  TEXT NOT NULL,
  cost_ugx        BIGINT NOT NULL,
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to    DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unit_econ_product ON product_unit_economics(product_id, effective_from DESC);

CREATE TABLE IF NOT EXISTS product_targets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  target_type  TEXT NOT NULL,
  target_value NUMERIC NOT NULL,
  period       TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products               ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_pricing        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_unit_economics ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_targets        ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all_products"   ON products               FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_pricing"    ON product_pricing        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_unit_econ"  ON product_unit_economics FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all_targets"    ON product_targets        FOR ALL TO anon USING (true) WITH CHECK (true);
