'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { motion } from 'framer-motion';
import {
  Target, Star, Calendar, Infinity as InfinityIcon,
  Plus, Trophy, Flame, CheckCircle, Clock, TrendingUp,
} from 'lucide-react';

type Tab = 'today' | 'week' | 'month' | 'alltime';

interface Goal {
  id: string;
  goal_text: string;
  target_value: number | null;
  current_value: number;
  target_date: string | null;
  status: string;
  set_by: string;
}

interface Achievement {
  id: string;
  earned_at: string;
  achievement_definitions: {
    name: string;
    description: string;
    icon: string;
    rarity: string;
  };
}

const RARITY_COLOR: Record<string, string> = {
  common: '#64748b', uncommon: '#0077B6', rare: '#8b5cf6', legendary: '#f59e0b',
};

const TAB_CONFIG = [
  { id: 'today',   label: 'Today',     icon: Clock },
  { id: 'week',    label: 'This Week', icon: Calendar },
  { id: 'month',   label: 'This Month',icon: TrendingUp },
  { id: 'alltime', label: 'All Time',  icon: InfinityIcon },
] as const;

export default function MyWorkPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('today');
  const [loading, setLoading] = useState(true);

  // Today stats
  const [jarsToday, setJarsToday] = useState(0);
  const [testsToday, setTestsToday] = useState(0);
  const [qcPassToday, setQcPassToday] = useState<number | null>(null);
  const [shiftHoursToday, setShiftHoursToday] = useState(0);
  const [hourlyOutput, setHourlyOutput] = useState<number[]>(Array(13).fill(0)); // 6am–7pm

  // Week stats
  const [jarsWeek, setJarsWeek] = useState(0);
  const [daysWorkedWeek, setDaysWorkedWeek] = useState(0);
  const [weeklyOutput, setWeeklyOutput] = useState<{ day: string; jars: number }[]>([]);
  const [qcPassRateWeek, setQcPassRateWeek] = useState<number | null>(null);

  // Month stats
  const [jarsMonth, setJarsMonth] = useState(0);
  const [daysWorkedMonth, setDaysWorkedMonth] = useState(0);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [leaderRank, setLeaderRank] = useState<number | null>(null);

  // All-time stats
  const [totalBatches, setTotalBatches] = useState(0);
  const [totalJars, setTotalJars] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [longestQCStreak, setLongestQCStreak] = useState(0);

  // Goals form
  const [newGoal, setNewGoal] = useState('');
  const [addingGoal, setAddingGoal] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  useEffect(() => { loadAll(); }, [user]);

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    await Promise.all([loadToday(), loadWeek(), loadMonth(), loadAllTime()]);
    setLoading(false);
  };

  const loadToday = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];

    const [prodRes, qcRes, shiftRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count, created_at')
        .eq('operator_name', user.name).eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('result')
        .eq('tested_by', user.name).eq('location_id', 'buziga').gte('tested_at', today),
      supabase.from('shifts').select('actual_start, actual_end')
        .eq('team_member_id', user.id).eq('shift_date', today).maybeSingle(),
    ]);

    const prod = prodRes.data ?? [];
    const jars = prod.reduce((s, r) => s + (r.jar_count ?? 0), 0);
    setJarsToday(jars);

    // Hourly breakdown 6am–7pm (13 hours)
    const hourly = Array(13).fill(0);
    for (const r of prod) {
      const h = new Date(r.created_at).getUTCHours() + 3; // EAT
      const idx = h - 6;
      if (idx >= 0 && idx < 13) hourly[idx] += r.jar_count ?? 0;
    }
    setHourlyOutput(hourly);

    const qcTests = qcRes.data ?? [];
    setTestsToday(qcTests.length);
    if (qcTests.length > 0) {
      setQcPassToday(Math.round((qcTests.filter((t) => t.result === 'PASS').length / qcTests.length) * 100));
    }

    const shift = shiftRes.data;
    if (shift?.actual_start) {
      const end = shift.actual_end ? new Date(shift.actual_end) : new Date();
      setShiftHoursToday(Math.round((end.getTime() - new Date(shift.actual_start).getTime()) / 3600000 * 10) / 10);
    }
  };

  const loadWeek = async () => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];

    const [prodRes, qcRes, shiftRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count, production_date')
        .eq('operator_name', user.name).eq('location_id', 'buziga').gte('production_date', weekAgo),
      supabase.from('water_tests').select('result')
        .eq('tested_by', user.name).eq('location_id', 'buziga').gte('tested_at', weekAgo),
      supabase.from('shifts').select('shift_date')
        .eq('team_member_id', user.id).eq('status', 'ended').gte('shift_date', weekAgo),
    ]);

    const prod = prodRes.data ?? [];
    setJarsWeek(prod.reduce((s, r) => s + (r.jar_count ?? 0), 0));
    setDaysWorkedWeek(new Set((shiftRes.data ?? []).map((s) => s.shift_date)).size);

    // Daily breakdown for last 7 days
    const daily: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      daily[d] = 0;
    }
    for (const r of prod) { if (r.production_date) daily[r.production_date] = (daily[r.production_date] ?? 0) + (r.jar_count ?? 0); }
    setWeeklyOutput(Object.entries(daily).map(([day, jars]) => ({ day: day.slice(5), jars })));

    const qcTests = qcRes.data ?? [];
    if (qcTests.length > 0) {
      setQcPassRateWeek(Math.round((qcTests.filter((t) => t.result === 'PASS').length / qcTests.length) * 100));
    }
  };

  const loadMonth = async () => {
    if (!user) return;
    const monthStart = `${new Date().toISOString().slice(0, 7)}-01`;

    const [prodRes, shiftRes, goalsRes, leaderRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count')
        .eq('operator_name', user.name).eq('location_id', 'buziga').gte('production_date', monthStart),
      supabase.from('shifts').select('shift_date', { count: 'exact', head: true })
        .eq('team_member_id', user.id).eq('status', 'ended').gte('shift_date', monthStart),
      supabase.from('personal_goals').select('*')
        .eq('team_member_id', user.id).in('status', ['active','achieved']).order('created_at', { ascending: false }),
      supabase.from('production_logs').select('operator_name, jar_count')
        .eq('location_id', 'buziga').gte('production_date', monthStart),
    ]);

    const jars = (prodRes.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    setJarsMonth(jars);
    setDaysWorkedMonth(shiftRes.count ?? 0);
    setGoals((goalsRes.data ?? []) as Goal[]);

    // Compute rank
    const byName: Record<string, number> = {};
    for (const r of leaderRes.data ?? []) {
      const n = r.operator_name ?? '';
      byName[n] = (byName[n] ?? 0) + (r.jar_count ?? 0);
    }
    const sorted = Object.entries(byName).sort((a, b) => b[1] - a[1]);
    const rank = sorted.findIndex(([n]) => n === user.name);
    setLeaderRank(rank >= 0 ? rank + 1 : null);
  };

  const loadAllTime = async () => {
    if (!user) return;
    const [prodRes, achRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count', { count: 'exact' })
        .eq('operator_name', user.name).eq('location_id', 'buziga'),
      supabase.from('worker_achievements')
        .select('id, earned_at, achievement_definitions(name, description, icon, rarity)')
        .eq('team_member_id', user.id)
        .order('earned_at', { ascending: false }),
    ]);

    setTotalBatches(prodRes.count ?? 0);
    setTotalJars((prodRes.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0));
    setAchievements((achRes.data ?? []) as unknown as Achievement[]);
  };

  const addGoal = async () => {
    if (!newGoal.trim() || !user?.id) return;
    setAddingGoal(true);
    await supabase.from('personal_goals').insert([{
      team_member_id: user.id,
      goal_text: newGoal.trim(),
      set_by: 'self',
      location_id: 'buziga',
    }]);
    setNewGoal('');
    setShowGoalForm(false);
    await loadMonth();
    setAddingGoal(false);
  };

  const dropGoal = async (id: string) => {
    await supabase.from('personal_goals').update({ status: 'dropped' }).eq('id', id);
    await loadMonth();
  };

  const maxHourly = Math.max(...hourlyOutput, 1);
  const maxWeekly = Math.max(...weeklyOutput.map((d) => d.jars), 1);
  const HOURS = ['6','7','8','9','10','11','12','1','2','3','4','5','6'];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-slate-400 text-sm animate-pulse">Loading your stats…</div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] bg-white px-5 py-8 max-w-2xl mx-auto transition-colors">
      {/* Header */}
      <div className="mb-8">
        <p className="text-slate-500 text-xs uppercase tracking-widest">My Work</p>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{user?.name?.split(' ')[0]}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-8 bg-slate-50 border border-slate-200 rounded-2xl p-1 shadow-sm transition-colors">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as Tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
              tab === id ? 'bg-[#0077B6] text-white shadow-md' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon size={12} />
            <span className="hidden sm:block">{label}</span>
          </button>
        ))}
      </div>

      {/* TODAY */}
      {tab === 'today' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {/* Big numbers */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Jars Logged', value: jarsToday, color: '#0077B6' },
              { label: 'QC Tests', value: testsToday, color: '#22c55e' },
              { label: 'Hours Worked', value: shiftHoursToday, color: '#8b5cf6' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm transition-colors">
                <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {qcPassToday !== null && (
            <div className={`mb-6 p-4 rounded-2xl border shadow-sm transition-colors ${qcPassToday === 100 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`font-black text-sm uppercase tracking-widest ${qcPassToday === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                QC Pass Rate: {qcPassToday}%
              </p>
            </div>
          )}

          {/* Hourly rhythm */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Hourly Output (EAT)</p>
            <div className="flex items-end gap-1 h-24">
              {hourlyOutput.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-sm transition-all${count === 0 ? ' bg-slate-100' : ''}`}
                    style={{
                      height: `${Math.max(2, (count / maxHourly) * 80)}px`,
                      background: count > 0 ? '#0077B6' : undefined,
                    }}
                  />
                  <span className="text-[8px] text-slate-400">{HOURS[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* THIS WEEK */}
      {tab === 'week' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Jars This Week', value: jarsWeek, color: '#0077B6' },
              { label: 'Days Worked', value: daysWorkedWeek, color: '#22c55e' },
              { label: 'QC Pass %', value: qcPassRateWeek !== null ? `${qcPassRateWeek}%` : '—', color: '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm transition-colors">
                <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Weekly bar chart */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Daily Output (Last 7 Days)</p>
            <div className="flex items-end gap-2 h-32">
              {weeklyOutput.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <p className="text-[9px] text-slate-500 font-bold">{d.jars > 0 ? d.jars : ''}</p>
                  <div
                    className={`w-full rounded-t-sm${d.jars === 0 ? ' bg-slate-100' : ''}`}
                    style={{
                      height: `${Math.max(2, (d.jars / maxWeekly) * 96)}px`,
                      background: d.jars > 0 ? (d.jars >= 500 ? '#22c55e' : '#0077B6') : undefined,
                    }}
                  />
                  <span className="text-[9px] text-slate-400">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* THIS MONTH */}
      {tab === 'month' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Jars This Month', value: jarsMonth.toLocaleString(), color: '#0077B6' },
              { label: 'Shift Days', value: daysWorkedMonth, color: '#22c55e' },
              { label: 'Team Rank', value: leaderRank !== null ? `#${leaderRank}` : '—', color: '#f59e0b' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 text-center shadow-sm transition-colors">
                <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Personal goals */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">My Goals</p>
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="flex items-center gap-1 text-[#0077B6] hover:text-[#7EC8E3] text-xs font-bold"
              >
                <Plus size={12} /> Add Goal
              </button>
            </div>

            {showGoalForm && (
              <div className="mb-4 flex gap-2">
                <input
                  value={newGoal}
                  onChange={(e) => setNewGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addGoal(); }}
                  placeholder='e.g. "50 batches this week"'
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#0077B6]"
                />
                <button
                  onClick={addGoal}
                  disabled={addingGoal}
                  className="px-4 py-2 bg-[#0077B6] text-white font-bold text-sm rounded-xl disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            )}

            {goals.length === 0 ? (
              <p className="text-slate-500 text-sm">No goals set yet. Add one above.</p>
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => {
                  const pct = goal.target_value
                    ? Math.min(100, Math.round((goal.current_value / goal.target_value) * 100))
                    : null;
                  return (
                    <div key={goal.id} className="bg-slate-50 border border-zinc-100 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-slate-900">{goal.goal_text}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {goal.status === 'achieved' && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                          {goal.status === 'active' && (
                            <button onClick={() => dropGoal(goal.id)} className="text-slate-400 hover:text-red-500 text-xs">drop</button>
                          )}
                        </div>
                      </div>
                      {pct !== null && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, background: pct >= 100 ? '#22c55e' : '#0077B6' }}
                            />
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1">{goal.current_value} / {goal.target_value} ({pct}%)</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ALL TIME */}
      {tab === 'alltime' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { label: 'Total Batches', value: totalBatches.toLocaleString(), color: '#0077B6' },
              { label: 'Total Jars', value: totalJars.toLocaleString(), color: '#22c55e' },
              { label: 'Achievements', value: achievements.length, color: '#f59e0b' },
              { label: 'QC Streak', value: `${longestQCStreak}d`, color: '#8b5cf6' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm transition-colors">
                <p className="text-4xl font-black" style={{ color: stat.color }}>{stat.value}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Achievements gallery */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm transition-colors">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-4 h-4 text-[#f59e0b]" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                Achievements ({achievements.length})
              </p>
            </div>
            {achievements.length === 0 ? (
              <p className="text-slate-600 text-sm">No achievements yet — log your first batch to start!</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {achievements.map((a) => {
                  const def = a.achievement_definitions;
                  const color = RARITY_COLOR[def?.rarity] ?? '#64748b';
                  return (
                    <div
                      key={a.id}
                      className="rounded-xl p-3 border shadow-sm"
                      style={{ borderColor: `${color}40`, background: `${color}10` }}
                    >
                      <div className="text-2xl mb-2">{def?.icon ?? '🏆'}</div>
                      <p className="text-xs font-black text-slate-900">{def?.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{def?.description}</p>
                      <p className="text-[9px] mt-1" style={{ color }}>
                        {def?.rarity?.toUpperCase()} · {new Date(a.earned_at).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
