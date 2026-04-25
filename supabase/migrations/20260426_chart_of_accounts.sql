-- Session 4: CFO Platform — Chart of Accounts

CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL,
  account_type     TEXT NOT NULL
                   CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  parent_account_id UUID REFERENCES chart_of_accounts(id),
  expense_phase    TEXT CHECK (expense_phase IN ('pre_unbs','post_unbs','ongoing')),
  product_id       UUID REFERENCES products(id),
  active           BOOLEAN DEFAULT true,
  description      TEXT,
  display_order    INT DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_type   ON chart_of_accounts(account_type);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all_coa" ON chart_of_accounts FOR ALL TO anon USING (true) WITH CHECK (true);

-- Seed the 5 root accounts only — user builds the tree under these via UI
INSERT INTO chart_of_accounts (code, name, account_type, display_order) VALUES
('1000', 'Assets',      'asset',     10),
('2000', 'Liabilities', 'liability', 20),
('3000', 'Equity',      'equity',    30),
('4000', 'Revenue',     'revenue',   40),
('5000', 'Expenses',    'expense',   50)
ON CONFLICT (code) DO NOTHING;

-- Add account_id to transactions (nullable — existing rows get NULL)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES chart_of_accounts(id);

-- Migrate existing rows to an "Uncategorized Expense" account
DO $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM chart_of_accounts WHERE code = '5000' LIMIT 1;
  IF v_id IS NOT NULL THEN
    UPDATE transactions SET account_id = v_id WHERE account_id IS NULL;
  END IF;
END $$;
