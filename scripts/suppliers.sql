-- Major Table: suppliers
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  product_type TEXT,
  lead_time_days INT,
  min_order_quantity INT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for status lookups
CREATE INDEX idx_suppliers_status ON suppliers(status);
