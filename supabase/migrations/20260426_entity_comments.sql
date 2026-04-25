-- Part 9: Entity comments — threads attached to any record
CREATE TABLE IF NOT EXISTS entity_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,  -- 'issue', 'rock', 'product', 'transaction', 'batch', etc.
  entity_id TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_role TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS entity_comments_entity_idx ON entity_comments(entity_type, entity_id, created_at DESC);

ALTER TABLE entity_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_comments" ON entity_comments FOR SELECT TO anon USING (true);
CREATE POLICY "anon_write_comments" ON entity_comments FOR INSERT TO anon WITH CHECK (true);
