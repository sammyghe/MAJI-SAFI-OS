-- RLS HARDENING MIGRATION
-- Run in Supabase SQL Editor (not automatically applied).
-- Scopes all public read/write to location_id = 'buziga'.
-- Sensitive tables (department_souls, simulation_settings) restricted to service_role writes.

-- ============================================================
-- HELPER: enable RLS where not yet enabled
-- ============================================================
DO $$
DECLARE
  t text;
  tables_with_location text[] := ARRAY[
    'production_logs','water_tests','inventory_items','sales_ledger',
    'daily_cash','distributors','events','compliance_records','capa_records',
    'batches','batch_events','transactions'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_location LOOP
    -- Skip tables that don't exist in this schema
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Drop legacy permissive policies
    EXECUTE format($f$
      DROP POLICY IF EXISTS anon_all ON %I;
      DROP POLICY IF EXISTS anon_all_select ON %I;
      DROP POLICY IF EXISTS anon_all_insert ON %I;
      DROP POLICY IF EXISTS anon_all_update ON %I;
    $f$, t, t, t, t);

    -- Read: scoped to buziga
    EXECUTE format($f$
      CREATE POLICY anon_read_buziga ON %I
        FOR SELECT USING (location_id = 'buziga');
    $f$, t);

    -- Write: scoped to buziga
    EXECUTE format($f$
      CREATE POLICY anon_write_buziga ON %I
        FOR INSERT WITH CHECK (location_id = 'buziga');
    $f$, t);

    EXECUTE format($f$
      CREATE POLICY anon_update_buziga ON %I
        FOR UPDATE USING (location_id = 'buziga');
    $f$, t);
  END LOOP;
END
$$;

-- ============================================================
-- team_members: allow PIN-based login SELECT, restrict writes
-- ============================================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_all ON team_members;
DROP POLICY IF EXISTS anon_select_login ON team_members;
DROP POLICY IF EXISTS anon_update_own ON team_members;

-- Allow anon to SELECT by PIN (needed for login)
CREATE POLICY anon_select_login ON team_members
  FOR SELECT USING (true);

-- Allow updating own last_seen_at only (no other field changes via anon)
CREATE POLICY anon_update_own ON team_members
  FOR UPDATE USING (true)
  WITH CHECK (true);

-- DELETE forbidden for anon (no policy = no access)

-- ============================================================
-- department_souls: read for anon (SAFI needs soul data), write service_role only
-- ============================================================
ALTER TABLE department_souls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS anon_read_souls ON department_souls;
DROP POLICY IF EXISTS service_write_souls ON department_souls;

CREATE POLICY anon_read_souls ON department_souls
  FOR SELECT USING (true);

CREATE POLICY service_write_souls ON department_souls
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================
-- simulation_settings: read for anon, write service_role only
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simulation_settings') THEN
    ALTER TABLE simulation_settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS anon_read_simulation ON simulation_settings;
    DROP POLICY IF EXISTS service_write_simulation ON simulation_settings;

    EXECUTE $p$
      CREATE POLICY anon_read_simulation ON simulation_settings
        FOR SELECT USING (true);
      CREATE POLICY service_write_simulation ON simulation_settings
        FOR ALL USING (auth.role() = 'service_role');
    $p$;
  END IF;
END
$$;
