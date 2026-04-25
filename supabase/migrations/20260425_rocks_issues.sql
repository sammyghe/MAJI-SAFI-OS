-- Session 3: Operating Rhythm — Rocks + Issues tables

-- ============ ROCKS (Quarterly Priorities) ============
CREATE TABLE IF NOT EXISTS rocks (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   TEXT    NOT NULL DEFAULT 'buziga',
  title         TEXT    NOT NULL,
  description   TEXT,
  owner_name    TEXT    NOT NULL,
  owner_dept    TEXT    NOT NULL,
  quarter       TEXT    NOT NULL,  -- e.g. '2026-Q2'
  category      TEXT    NOT NULL DEFAULT 'execution'
                CHECK (category IN ('foundation','execution','scaling')),
  status        TEXT    NOT NULL DEFAULT 'on_track'
                CHECK (status IN ('on_track','at_risk','off_track','complete')),
  progress_pct  INT     NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  due_date      DATE,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rocks_quarter
  ON rocks(location_id, quarter, category, status);

-- ============ ISSUES (IDS Method: Identify → Discuss → Solve) ============
CREATE TABLE IF NOT EXISTS issues (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   TEXT    NOT NULL DEFAULT 'buziga',
  title         TEXT    NOT NULL,
  description   TEXT,
  raised_by     TEXT    NOT NULL,
  owner_dept    TEXT,
  stage         TEXT    NOT NULL DEFAULT 'identified'
                CHECK (stage IN ('identified','discussing','solving','resolved')),
  priority      TEXT    NOT NULL DEFAULT 'medium'
                CHECK (priority IN ('low','medium','high','critical')),
  resolution    TEXT,
  resolved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_issues_stage
  ON issues(location_id, stage, priority);
CREATE INDEX IF NOT EXISTS idx_issues_created
  ON issues(location_id, created_at DESC);

-- ============ MEETINGS ============
CREATE TABLE IF NOT EXISTS meetings (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id   TEXT    NOT NULL DEFAULT 'buziga',
  meeting_type  TEXT    NOT NULL DEFAULT 'level10'
                CHECK (meeting_type IN ('level10','biweekly','monthly','adhoc')),
  title         TEXT    NOT NULL DEFAULT 'Level 10 Meeting',
  scheduled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  facilitator   TEXT,
  attendees     TEXT[],
  rating        INT     CHECK (rating BETWEEN 1 AND 10),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meetings_type_date
  ON meetings(location_id, meeting_type, scheduled_at DESC);

-- ============ ROUNDTABLE ENTRIES (per-meeting per-person) ============
CREATE TABLE IF NOT EXISTS roundtable_entries (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id  UUID    NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  person_name TEXT    NOT NULL,
  entry_type  TEXT    NOT NULL DEFAULT 'status'
              CHECK (entry_type IN ('status','headline','todo','issue')),
  content     TEXT    NOT NULL,
  is_done     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roundtable_meeting
  ON roundtable_entries(meeting_id, entry_type);
