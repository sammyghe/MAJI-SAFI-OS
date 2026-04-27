'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface ActiveWorker {
  id: string;
  memberId: string;
  name: string;
  role: string;
  hoursIn: number;
  outputToday: number;
  targetToday: number;
  lastActivityAt: string | null;
  needsHelp: boolean;
}

interface NeedsHelp {
  name: string;
  reason: string;
}

function trackColor(worker: ActiveWorker): string {
  if (worker.targetToday === 0) return '#64748b';
  const pct = worker.outputToday / worker.targetToday;
  if (pct >= 0.7) return '#22c55e';
  if (pct >= 0.4) return '#f59e0b';
  return '#ef4444';
}

export default function TeamAwarenessPanel() {
  const [workers, setWorkers] = useState<ActiveWorker[]>([]);
  const [needsHelp, setNeedsHelp] = useState<NeedsHelp[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    channelRef.current = supabase
      .channel('team-awareness')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_logs' }, load)
      .subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const sixtyMinAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [shiftsRes, prodRes, openIssues] = await Promise.all([
      supabase
        .from('shifts')
        .select('id, team_member_id, actual_start, team_members(id, name, role_slug, last_seen_at)')
        .eq('status', 'active')
        .eq('shift_date', today)
        .eq('location_id', 'buziga'),
      supabase
        .from('production_logs')
        .select('operator_name, jar_count')
        .eq('location_id', 'buziga')
        .eq('production_date', today),
      supabase
        .from('events')
        .select('id, department, payload')
        .eq('location_id', 'buziga')
        .eq('severity', 'critical')
        .is('resolved_at', null)
        .gte('created_at', sixtyMinAgo)
        .limit(10),
    ]);

    const prodByName: Record<string, number> = {};
    for (const row of prodRes.data ?? []) {
      const n = row.operator_name ?? '';
      prodByName[n] = (prodByName[n] ?? 0) + (row.jar_count ?? 0);
    }

    const active: ActiveWorker[] = (shiftsRes.data ?? []).map((s: any) => {
      const member = Array.isArray(s.team_members) ? s.team_members[0] : s.team_members;
      const name = member?.name ?? 'Unknown';
      const hoursIn = s.actual_start
        ? Math.floor((Date.now() - new Date(s.actual_start).getTime()) / 3600000)
        : 0;
      const outputToday = prodByName[name] ?? 0;
      const targetToday = 500;
      const lastActivityAt = member?.last_seen_at ?? null;
      const minutesSinceSeen = lastActivityAt
        ? (Date.now() - new Date(lastActivityAt).getTime()) / 60000
        : 999;
      const needsHelp = minutesSinceSeen > 60 && hoursIn >= 1 && outputToday === 0;
      return {
        id: s.id,
        memberId: member?.id ?? '',
        name,
        role: member?.role_slug ?? '',
        hoursIn,
        outputToday,
        targetToday,
        lastActivityAt,
        needsHelp,
      };
    });

    const helps: NeedsHelp[] = [];
    for (const w of active) {
      if (w.needsHelp) helps.push({ name: w.name, reason: 'No output logged in 1+ hour during active shift' });
    }
    for (const issue of openIssues.data ?? []) {
      const actor = (issue.payload as any)?.operator ?? (issue.payload as any)?.tested_by ?? 'Someone';
      helps.push({ name: actor, reason: `Critical issue in ${issue.department ?? 'a department'}` });
    }

    setWorkers(active);
    setNeedsHelp(helps.slice(0, 5));
    setLoading(false);
  };

  if (loading) return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 animate-pulse h-24" />
  );

  return (
    <div className="space-y-4 mb-6">
      {/* Who's on shift */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-slate-400" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
            On Shift Now ({workers.length})
          </p>
        </div>
        {workers.length === 0 ? (
          <p className="text-slate-600 text-sm">No active shifts right now</p>
        ) : (
          <div className="space-y-3">
            {workers.map((w) => {
              const pct = w.targetToday > 0 ? Math.min(100, Math.round((w.outputToday / w.targetToday) * 100)) : 0;
              const color = trackColor(w);
              return (
                <div key={w.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black"
                    style={{ background: `${color}20`, color }}
                  >
                    {w.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white truncate">{w.name}</p>
                      <p className="text-xs text-slate-500 flex-shrink-0 ml-2">{w.hoursIn}h in</p>
                    </div>
                    <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-600 mt-0.5">{w.outputToday} / {w.targetToday} jars ({pct}%)</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Needs help */}
      {needsHelp.length > 0 && (
        <div className="bg-white border border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em]">
              Needs Attention
            </p>
          </div>
          <div className="space-y-2">
            {needsHelp.map((h, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-white">{h.name}</p>
                  <p className="text-xs text-slate-500">{h.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
