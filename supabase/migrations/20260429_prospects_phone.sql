-- Add missing columns to prospects table
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE prospects ADD COLUMN IF NOT EXISTS source TEXT;

-- Helper function to reload PostgREST schema cache
-- Call via: SELECT reload_pgrst_schema();
CREATE OR REPLACE FUNCTION reload_pgrst_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

GRANT EXECUTE ON FUNCTION reload_pgrst_schema() TO service_role;
GRANT EXECUTE ON FUNCTION reload_pgrst_schema() TO anon;
GRANT EXECUTE ON FUNCTION reload_pgrst_schema() TO authenticated;

-- Trigger the reload immediately on migration run
SELECT reload_pgrst_schema();
