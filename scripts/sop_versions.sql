CREATE TABLE IF NOT EXISTS sop_versions (
  id SERIAL PRIMARY KEY,
  department TEXT,
  title TEXT,
  content TEXT,
  version INT,
  effective_date DATE,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster department-specific lookups
CREATE INDEX IF NOT EXISTS idx_sop_dept ON sop_versions(department);
