-- Session 5C: Recognition + Achievements

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  trigger_rule JSONB NOT NULL DEFAULT '{}',
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common','uncommon','rare','legendary')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS worker_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID REFERENCES team_members(id),
  achievement_definition_id UUID REFERENCES achievement_definitions(id),
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  context JSONB DEFAULT '{}',
  acknowledged_at TIMESTAMPTZ
);

ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_all_achievement_definitions ON achievement_definitions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY anon_all_worker_achievements ON worker_achievements FOR ALL TO anon USING (true) WITH CHECK (true);

INSERT INTO achievement_definitions (slug, name, description, icon, trigger_rule, rarity) VALUES
  ('first_batch', 'First Batch', 'Logged your very first production batch', '🏭', '{"type":"milestone","metric":"batches","threshold":1}', 'common'),
  ('perfect_qc_week', 'QC Champion', '7 consecutive days with 100% QC pass rate', '⭐', '{"type":"streak","metric":"qc_pass_rate","threshold":7,"window":"7d"}', 'uncommon'),
  ('century', 'Century Club', 'Logged 100 production batches lifetime', '💯', '{"type":"milestone","metric":"batches","threshold":100}', 'rare'),
  ('attendance_30', 'Iron Attendance', '30 days of perfect shift attendance', '🎯', '{"type":"streak","metric":"attendance","threshold":30}', 'uncommon'),
  ('top_operator_month', 'Top Operator', 'Highest output in your department this month', '🥇', '{"type":"ranking","metric":"jars_produced","window":"month","rank":1}', 'rare'),
  ('streak_master', 'Streak Master', '30-day perfect QC pass streak', '🔥', '{"type":"streak","metric":"qc_pass_rate","threshold":30}', 'legendary'),
  ('customer_hero', 'Customer Hero', '10 positive customer interactions recorded', '❤️', '{"type":"milestone","metric":"positive_feedback","threshold":10}', 'rare'),
  ('on_time_legend', 'On-Time Legend', '100% on-time delivery for 30 consecutive days', '⚡', '{"type":"streak","metric":"on_time_delivery","threshold":30}', 'legendary')
ON CONFLICT (slug) DO NOTHING;
