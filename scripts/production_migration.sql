-- Maji Safi OS: Production Migration Script
-- Run this in your Supabase SQL Editor to initialize the new modules.

-- 1. Suppliers Tracking Table
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  product_type TEXT,
  lead_time_days INT DEFAULT 7,
  min_order_quantity INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Team Recognitions (Shout-outs)
CREATE TABLE IF NOT EXISTS recognitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL,
  department TEXT NOT NULL,
  given_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. SOP Versioning
CREATE TABLE IF NOT EXISTS sop_versions (
  id SERIAL PRIMARY KEY,
  department TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  version INT DEFAULT 1,
  effective_date DATE DEFAULT CURRENT_DATE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE recognitions;
ALTER PUBLICATION supabase_realtime ADD TABLE sop_versions;

-- 5. Seed initial raw categories (Optional)
-- These are managed in the UI, but initial rows help test the layout.
INSERT INTO suppliers (name, product_type, contact_person, status) 
VALUES ('Regional Logistics', 'Empty Bottle', 'Logistics Dispatch', 'active')
ON CONFLICT DO NOTHING;
