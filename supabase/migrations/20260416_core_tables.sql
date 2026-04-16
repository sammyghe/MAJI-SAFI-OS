-- Session 2 Core Tables Migration
-- Supporting the 9-department structure and QC fail propagation

-- ============ PRODUCTION LOGS ============
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  batch_id TEXT NOT NULL UNIQUE,
  jar_count INT NOT NULL,
  product_type TEXT NOT NULL,
  operator_name TEXT,
  status TEXT DEFAULT 'created' CHECK (status IN ('created', 'halted', 'dispatched')),
  production_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  
  CONSTRAINT fk_location FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_production_logs_location_date 
  ON production_logs(location_id, production_date);

-- ============ WATER TESTS (Quality) ============
CREATE TABLE IF NOT EXISTS water_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  batch_id TEXT NOT NULL,
  test_type TEXT NOT NULL,
  reading NUMERIC,
  result TEXT CHECK (result IN ('PASS', 'FAIL')),
  tested_at TIMESTAMPTZ DEFAULT NOW(),
  tested_by TEXT,
  notes TEXT,
  
  CONSTRAINT fk_batch FOREIGN KEY (batch_id) REFERENCES production_logs(batch_id),
  CONSTRAINT fk_location_qt FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_water_tests_location_batch 
  ON water_tests(location_id, batch_id);

-- ============ EVENTS ============
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  event_type TEXT NOT NULL,
  department TEXT,
  batch_id TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_events FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_events_location_type 
  ON events(location_id, event_type);

-- ============ INVENTORY ============
CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  batch_id TEXT,
  product_type TEXT NOT NULL,
  zone TEXT DEFAULT 'filled_stock' CHECK (zone IN ('filled_stock', 'zone_2_quarantine', 'empty_stock')),
  jar_count INT NOT NULL,
  counted_by TEXT,
  counted_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_inv FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_location_zone 
  ON inventory(location_id, zone);

-- ============ COMPLIANCE & CAPA ============
CREATE TABLE IF NOT EXISTS capa_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL DEFAULT 'buziga',
  triggered_by TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'closed')),
  root_cause TEXT,
  action_plan TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fk_location_capa FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- ============ LOCATIONS ============
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default location
INSERT INTO locations (id, name, city) VALUES ('buziga', 'Buziga', 'Kampala')
ON CONFLICT DO NOTHING;

-- ============ QC FAIL EVENT HANDLER TRIGGER ============
-- When QC test FAIL is inserted, propagate events
CREATE OR REPLACE FUNCTION handle_qc_fail()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.result = 'FAIL' THEN
    -- 1. Update production logs batch to halted
    UPDATE production_logs 
    SET status = 'halted' 
    WHERE batch_id = NEW.batch_id AND location_id = NEW.location_id;
    
    -- 2. Insert event
    INSERT INTO events (location_id, event_type, department, batch_id, severity, payload)
    VALUES (
      NEW.location_id,
      'qc_fail',
      'quality',
      NEW.batch_id,
      'critical',
      jsonb_build_object(
        'test_type', NEW.test_type,
        'reading', NEW.reading,
        'threshold_exceed', true
      )
    );
    
    -- 3. Move inventory to quarantine
    UPDATE inventory 
    SET zone = 'zone_2_quarantine'
    WHERE batch_id = NEW.batch_id AND location_id = NEW.location_id;
    
    -- 4. Insert CAPA log
    INSERT INTO capa_log (location_id, triggered_by, description)
    VALUES (
      NEW.location_id,
      'QC_AUTO',
      'QC FAIL - ' || NEW.test_type || ' failed with reading ' || COALESCE(NEW.reading::text, 'null')
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS qc_fail_trigger ON water_tests;
CREATE TRIGGER qc_fail_trigger
AFTER INSERT ON water_tests
FOR EACH ROW
EXECUTE FUNCTION handle_qc_fail();
