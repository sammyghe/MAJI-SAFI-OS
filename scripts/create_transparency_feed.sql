CREATE TABLE IF NOT EXISTS transparency_feed (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  department_from TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('info','warning','critical'))
    DEFAULT 'info',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER PUBLICATION supabase_realtime ADD TABLE transparency_feed;
