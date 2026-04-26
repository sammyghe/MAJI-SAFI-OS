-- Session 5A Part 2: Realtime broadcast triggers
-- Uses Supabase realtime.broadcast_changes() to push row-level changes
-- to subscribed clients without polling.

-- Grant realtime schema usage to anon/authenticated roles
-- (Supabase handles this automatically in managed instances,
--  but explicit grant ensures it works across plan tiers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'realtime'
  ) THEN
    -- realtime schema not yet set up (local dev) — skip trigger creation
    RAISE NOTICE 'realtime schema not found — skipping broadcast trigger setup';
    RETURN;
  END IF;
END;
$$;

-- Generic broadcast trigger function
-- Fires after every INSERT/UPDATE/DELETE on watched tables
-- Broadcasts on two channels:
--   1. '<table>:<row_id>'   — per-row subscription (for detail views)
--   2. 'dept:<dept_slug>'   — department-level subscription (for list views)
CREATE OR REPLACE FUNCTION broadcast_table_change() RETURNS TRIGGER AS $$
DECLARE
  payload JSONB;
  row_id TEXT;
  dept_slug TEXT;
  channel_row TEXT;
  channel_dept TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    payload := jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME, 'old', to_jsonb(OLD));
    row_id := (to_jsonb(OLD) ->> 'id');
    dept_slug := COALESCE(to_jsonb(OLD) ->> 'department', to_jsonb(OLD) ->> 'location_id', 'buziga');
  ELSE
    payload := jsonb_build_object('op', TG_OP, 'table', TG_TABLE_NAME, 'new', to_jsonb(NEW));
    row_id := (to_jsonb(NEW) ->> 'id');
    dept_slug := COALESCE(to_jsonb(NEW) ->> 'department', to_jsonb(NEW) ->> 'location_id', 'buziga');
    IF TG_OP = 'UPDATE' THEN
      payload := payload || jsonb_build_object('old', to_jsonb(OLD));
    END IF;
  END IF;

  channel_row := TG_TABLE_NAME || ':' || COALESCE(row_id, 'unknown');
  channel_dept := 'dept:' || dept_slug;

  -- Broadcast per-row change (private: false so anon clients can subscribe)
  PERFORM pg_notify('realtime', json_build_object(
    'topic', channel_row,
    'event', TG_OP,
    'payload', payload
  )::text);

  -- Broadcast department-level change
  PERFORM pg_notify('realtime', json_build_object(
    'topic', channel_dept,
    'event', TG_TABLE_NAME || ':' || TG_OP,
    'payload', payload
  )::text);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach broadcast trigger to all operational tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'production_logs',
    'water_tests',
    'sales_ledger',
    'inventory_items',
    'transactions',
    'rocks',
    'issues',
    'kpi_definitions',
    'scorecard_snapshots',
    'products',
    'distributors'
  ] LOOP
    -- Check table exists before attaching trigger
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format($f$
        DROP TRIGGER IF EXISTS broadcast_%1$s ON %1$s;
        CREATE TRIGGER broadcast_%1$s
          AFTER INSERT OR UPDATE OR DELETE ON %1$s
          FOR EACH ROW EXECUTE FUNCTION broadcast_table_change();
      $f$, tbl);
    END IF;
  END LOOP;
END;
$$;

-- Enable Supabase Realtime publication for these tables
-- (adds them to the supabase_realtime publication so clients
--  can use .channel().on('postgres_changes',...) pattern)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'production_logs',
    'water_tests',
    'sales_ledger',
    'inventory_items',
    'transactions',
    'rocks',
    'issues',
    'scorecard_snapshots',
    'products',
    'distributors',
    'information_relationships',
    'entity_comments',
    'user_activity'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      BEGIN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
      EXCEPTION WHEN duplicate_object THEN
        NULL; -- already in publication
      WHEN undefined_object THEN
        NULL; -- publication doesn't exist yet (local dev)
      END;
    END IF;
  END LOOP;
END;
$$;
