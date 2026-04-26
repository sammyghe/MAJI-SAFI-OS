'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { ClipboardList, Beaker, LogOut, PlayCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import TodaysFocus from '@/components/TodaysFocus';
import InboxPanel from '@/components/InboxPanel';
import CrossDeptSummary from '@/components/CrossDeptSummary';
import ShiftGate from '@/components/ShiftGate';

interface ShiftData {
  target: number;
  done: number;
  lastQC: string | null;
}

function getEATHour(): number {
  return (new Date().getUTCHours() + 3) % 24;
}

type ShiftPhase = 'pre-checks' | 'production' | 'qc-due' | 'end-shift' | 'off-shift';

function getShiftPhase(lastQCIso: string | null): ShiftPhase {
  const h = getEATHour();
  if (h >= 17 && h < 19) return 'end-shift';
  if (h >= 6 && h < 9) return 'pre-checks';
  if (h >= 9 && h < 17) {
    if (lastQCIso) {
      const sinceQC = (Date.now() - new Date(lastQCIso).getTime()) / 1000 / 60;
      if (sinceQC >= 120) return 'qc-due';
    }
    return 'production';
  }
  return 'off-shift';
}

const PHASE_CONFIG: Record<ShiftPhase, { label: string; sublabel: string; color: string; icon: typeof PlayCircle; href: string }> = {
  'pre-checks':  { label: 'START PRE-CHECKS',  sublabel: 'SOP-01 pre-start checklist',     color: '#0077B6', icon: ClipboardList, href: '/production' },
  'production':  { label: 'LOG BATCH',         sublabel: 'Record jars produced',            color: '#22c55e', icon: PlayCircle,    href: '/production' },
  'qc-due':      { label: 'RUN QC TEST',       sublabel: 'Quality check overdue (2h+)',     color: '#f59e0b', icon: Beaker,        href: '/quality' },
  'end-shift':   { label: 'END SHIFT',         sublabel: 'Shutdown checklist',              color: '#8b5cf6', icon: LogOut,        href: '/production' },
  'off-shift':   { label: 'SHIFT NOT STARTED', sublabel: 'Shift hours: 6:00 AM — 7:00 PM', color: '#475569', icon: AlertCircle,   href: '/production' },
};

export default function OperatorHome() {
  const { user } = useAuth();
  const [shift, setShift] = useState<ShiftData>({ target: 500, done: 0, lastQC: null });
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    channelRef.current = supabase
      .channel('rt:operator-home')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_logs' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'water_tests' }, load)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [prodRes, qcRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('tested_at').eq('location_id', 'buziga').gte('tested_at', today).order('tested_at', { ascending: false }).limit(1),
    ]);
    const done = (prodRes.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const lastQC = qcRes.data?.[0]?.tested_at ?? null;
    setShift({ target: 500, done, lastQC });
    setLoading(false);
  };

  const phase = getShiftPhase(shift.lastQC);
  const cfg = PHASE_CONFIG[phase];
  const Icon = cfg.icon;
  const remaining = Math.max(0, shift.target - shift.done);
  const pct = Math.min(100, Math.round((shift.done / shift.target) * 100));

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#10141a] flex flex-col px-6 py-8 max-w-lg mx-auto">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-slate-500 text-xs uppercase tracking-widest font-label">Welcome back</p>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">{user?.name?.split(' ')[0]}</h1>
      </div>

      {/* Shift gate */}
      <ShiftGate />

      {/* Inbox */}
      <div className="mb-4">
        <InboxPanel compact />
      </div>

      {/* Cross-dept signals */}
      <div className="mb-4">
        <CrossDeptSummary deptSlug="production" />
      </div>

      {/* Today's Focus */}
      <div className="mb-6">
        <TodaysFocus department="production" compact />
      </div>

      {/* Target block — large numbers */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-6">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Today's Target</p>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-7xl font-black tabular-nums leading-none" style={{ color: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ffffff' }}>
              {loading ? '—' : shift.done.toLocaleString()}
            </p>
            <p className="text-slate-500 text-sm mt-1">jars done</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-slate-500">{shift.target.toLocaleString()}</p>
            <p className="text-slate-600 text-sm mt-1">target</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-6 h-3 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#0077B6',
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-[10px] text-slate-500">{pct}% complete</span>
          <span className="text-[10px] text-slate-500">{remaining.toLocaleString()} remaining</span>
        </div>
      </div>

      {/* Primary action button */}
      <Link href={cfg.href} className="block mb-6">
        <button
          className="w-full rounded-2xl text-white font-black uppercase tracking-widest transition-all active:scale-95"
          style={{
            backgroundColor: cfg.color,
            minHeight: 88,
            fontSize: 18,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            opacity: phase === 'off-shift' ? 0.5 : 1,
          }}
        >
          <Icon size={24} />
          <span>{cfg.label}</span>
        </button>
        <p className="text-center text-slate-500 text-xs mt-2 font-label">{cfg.sublabel}</p>
      </Link>

      {/* QC due banner */}
      {phase === 'qc-due' && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
          <p className="text-amber-400 font-black text-sm uppercase tracking-widest">⚠ QC Test Overdue</p>
          <p className="text-amber-400/70 text-xs mt-1">Last test was 2+ hours ago — run water test now</p>
        </div>
      )}

      {/* Secondary actions */}
      <div className="grid grid-cols-3 gap-3 mt-auto">
        <Link href="/production" className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors">
          <ClipboardList className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Maintenance Log</span>
        </Link>
        <Link href="/technology" className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors">
          <AlertCircle className="w-5 h-5 text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Report Issue</span>
        </Link>
        <button
          onClick={() => {
            const bubble = document.querySelector('[title="Ask SAFI"]') as HTMLButtonElement | null;
            bubble?.click();
          }}
          className="flex flex-col items-center gap-2 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-colors"
        >
          <span className="text-lg">🤖</span>
          <span className="text-[10px] font-bold text-slate-500 uppercase text-center">Ask SAFI</span>
        </button>
      </div>
    </div>
  );
}
