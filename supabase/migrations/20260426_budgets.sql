-- Session 4: CFO Platform — Budgets Engine

CREATE TABLE IF NOT EXISTS budgets (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id           UUID NOT NULL REFERENCES chart_of_accounts(id),
  period               TEXT NOT NULL,
  budgeted_amount_ugx  BIGINT NOT NULL,
  actual_amount_ugx    BIGINT DEFAULT 0,
  alert_threshold_pct  INT DEFAULT 80,
  alert_critical_pct   INT DEFAULT 100,
  expense_phase        TEXT CHECK (expense_phase IN ('pre_unbs','post_unbs','ongoing')),
  notes                TEXT,
  created_by           TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_id, period)
);
CREATE INDEX IF NOT EXISTS idx_budgets_period ON budgets(period, account_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_budgets" ON budgets FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============ BANK ACCOUNTS ============
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  currency            TEXT NOT NULL DEFAULT 'UGX',
  current_balance     BIGINT NOT NULL DEFAULT 0,
  last_reconciled_at  TIMESTAMPTZ,
  provider            TEXT,
  account_number_masked TEXT,
  active              BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_bank" ON bank_accounts FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============ SUPPLIERS ============
CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  contact      TEXT,
  phone        TEXT,
  category     TEXT,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_suppliers" ON suppliers FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============ SUPPLIER INVOICES ============
CREATE TABLE IF NOT EXISTS supplier_invoices (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id  UUID REFERENCES suppliers(id),
  amount       BIGINT NOT NULL,
  currency     TEXT DEFAULT 'UGX',
  due_date     DATE,
  paid_at      TIMESTAMPTZ,
  status       TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid','overdue','cancelled')),
  description  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON supplier_invoices(status, due_date);

ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_invoices" ON supplier_invoices FOR ALL TO anon USING (true) WITH CHECK (true);
