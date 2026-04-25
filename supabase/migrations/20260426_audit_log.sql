-- Part 7: Universal Audit Trail
-- Postgres triggers write every meaningful mutation to audit_log

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  row_id TEXT,                    -- cast to TEXT so any PK type works
  changed_by TEXT,                -- user name from app layer (best-effort)
  old_data JSONB,
  new_data JSONB,
  diff JSONB,                     -- keys that changed: {col: {from, to}}
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_table_idx ON audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_row_idx ON audit_log(table_name, row_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log(created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_audit" ON audit_log FOR SELECT TO anon USING (true);
-- writes are done via service role from triggers, not anon

-- Generic trigger function — works on any table
CREATE OR REPLACE FUNCTION audit_trigger_fn() RETURNS TRIGGER AS $$
DECLARE
  diff_json JSONB := '{}';
  k TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    FOR k IN SELECT key FROM jsonb_object_keys(to_jsonb(NEW)) AS key LOOP
      IF (to_jsonb(OLD) -> k) IS DISTINCT FROM (to_jsonb(NEW) -> k) THEN
        diff_json := diff_json || jsonb_build_object(k, jsonb_build_object('from', to_jsonb(OLD) -> k, 'to', to_jsonb(NEW) -> k));
      END IF;
    END LOOP;
    INSERT INTO audit_log(table_name, operation, row_id, old_data, new_data, diff)
      VALUES(TG_TABLE_NAME, TG_OP, (to_jsonb(NEW) ->> 'id'), to_jsonb(OLD), to_jsonb(NEW), diff_json);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, operation, row_id, new_data)
      VALUES(TG_TABLE_NAME, TG_OP, (to_jsonb(NEW) ->> 'id'), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, operation, row_id, old_data)
      VALUES(TG_TABLE_NAME, TG_OP, (to_jsonb(OLD) ->> 'id'), to_jsonb(OLD));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to high-value tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'products', 'product_pricing', 'product_unit_economics', 'product_targets',
    'chart_of_accounts', 'budgets', 'bank_accounts',
    'transactions', 'sales_ledger',
    'scenarios', 'scenario_overrides',
    'kpi_definitions', 'rocks', 'issues',
    'team_members'
  ] LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS audit_%1$s ON %1$s;
      CREATE TRIGGER audit_%1$s
        AFTER INSERT OR UPDATE OR DELETE ON %1$s
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_fn();
    $f$, tbl);
  END LOOP;
END;
$$;
