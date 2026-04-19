-- Session 10: last_seen_at for online presence tracking
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Index for fast "online now" queries
CREATE INDEX IF NOT EXISTS idx_team_members_last_seen_at ON team_members (last_seen_at DESC);
