'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  ClipboardList, Beaker, LogOut, PlayCircle, AlertCircle,
  CheckCircle2, Factory, AlertTriangle,
} from 'lucide-react';
import ShiftGate from '@/components/ShiftGate';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';

interface ShiftData { target: number; done: number; lastQC: string | null; qcPassRate: number | null; }

type ShiftPhase = 'pre-checks' | 'production' | 'qc-due' | 'end-shift' | 'off-shift';

function getEATHour(): number { return (new Date().getUTCHours() + 3) % 24; }

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

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const PHASE_CONFIG: Record<ShiftPhase, { label: string; sublabel: string; color: string; icon: typeof PlayCircle; href: string }> = {
  'pre-checks': { label: 'Start Pre-Checks', sublabel: 'SOP-01 pre-start checklist', color: '#0077B6', icon: ClipboardList, href: '/production' },
  'production':  { label: 'Log Batch',        sublabel: 'Record jars produced',       color: '#10B981', icon: PlayCircle,    href: '/production' },
  'qc-due':      { label: 'Run QC Test',      sublabel: 'Quality check overdue (2h+)', color: '#F59E0B', icon: Beaker,       href: '/quality' },
  'end-shift':   { label: 'End Shift',        sublabel: 'Shutdown checklist',          color: '#8B5CF6', icon: LogOut,        href: '/production' },
  'off-shift':   { label: 'Shift Not Started',sublabel: 'Hours: 6:00 AM — 7:00 PM',   color: '#94A3B8', icon: AlertCircle,  href: '/production' },
};

export default function OperatorHome() {
  const { user } = useAuth();
  const [shift, setShift] = useState<ShiftData>({ target: 500, done: 0, lastQC: null, qcPassRate: null });
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    channelRef.current = supabase.channel('rt:operator-home')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'production_logs' }, load)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'water_tests' }, load)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [prodRes, qcRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('tested_at, result').eq('location_id', 'buziga').gte('tested_at', today).order('tested_at', { ascending: false }),
    ]);
    const done = (prodRes.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qcRes.data ?? [];
    const lastQC = qcTests[0]?.tested_at ?? null;
    const qcPassRate = qcTests.length > 0 ? Math.round(qcTests.filter(t => t.result === 'PASS').length / qcTests.length * 100) : null;
    setShift({ target: 500, done, lastQC, qcPassRate });
    setLoading(false);
  };

  const phase = getShiftPhase(shift.lastQC);
  const cfg = PHASE_CONFIG[phase];
  const Icon = cfg.icon;
  const pct = Math.min(100, Math.round((shift.done / shift.target) * 100));
  const remaining = Math.max(0, shift.target - shift.done);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-6 py-8 max-w-lg mx-auto space-y-6">

      {/* Greeting bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{date} · Production</p>
      </motion.div>

      {/* Shift gate */}
      <ShiftGate />

      {/* Today's One Thing — phase-aware */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        {phase === 'qc-due' ? (
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg">
            <Beaker className="w-10 h-10 flex-shrink-0 opacity-90" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Urgent</p>
              <p className="text-lg font-black">QC Test Overdue</p>
              <p className="text-sm opacity-75">Last test was 2+ hours ago — run water test now</p>
            </div>
          </div>
        ) : phase === 'off-shift' ? (
          <div className="bg-slate-100 rounded-2xl p-5 flex items-center gap-4">
            <AlertCircle className="w-10 h-10 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">Off Shift</p>
              <p className="text-lg font-black text-slate-700">Shift hours: 6:00 AM — 7:00 PM</p>
              <p className="text-sm text-slate-500">Come back during working hours</p>
            </div>
          </div>
        ) : (
          <Link href={cfg.href}>
            <div className="rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg cursor-pointer active:scale-98 transition-transform" style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}>
              <Icon className="w-10 h-10 flex-shrink-0 opacity-90" />
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Next Action</p>
                <p className="text-lg font-black">{cfg.label}</p>
                <p className="text-sm opacity-75">{cfg.sublabel}</p>
              </div>
            </div>
          </Link>
        )}
      </motion.div>

      {/* Production progress */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Today's Target</p>
          <div className="flex items-end justify-between mb-3">
            <div>
              <span className="text-6xl font-black tabular-nums leading-none" style={{ color: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#0077B6' }}>
                {loading ? '—' : shift.done.toLocaleString()}
              </span>
              <p className="text-slate-500 text-sm mt-1">jars done</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-slate-300">{shift.target.toLocaleString()}</span>
              <p className="text-slate-400 text-sm mt-1">target</p>
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#0077B6' }} />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-slate-400">{pct}% complete</span>
            <span className="text-xs text-slate-400">{remaining.toLocaleString()} remaining</span>
          </div>
        </div>
      </motion.div>

      {/* KPI cards */}
      <motion.div className="grid grid-cols-2 gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        {[
          { label: 'Machine Status', value: 'Online', icon: Factory, ok: true, context: 'No faults reported' },
          { label: 'QC Pass Rate', value: loading ? '—' : shift.qcPassRate !== null ? `${shift.qcPassRate}%` : 'No tests', icon: CheckCircle2, ok: (shift.qcPassRate ?? 100) === 100, context: '100% required' },
        ].map((kpi) => (
          <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="operator" context={kpi.context} />
        ))}
      </motion.div>

      {/* Inbox */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <InboxPanel compact />
      </motion.div>

      {/* Secondary actions */}
      <motion.div className="grid grid-cols-3 gap-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {[
          { href: '/production', label: 'Maintenance Log', icon: ClipboardList },
          { href: '/technology', label: 'Report Issue', icon: AlertTriangle },
          { href: '/quality', label: 'QC Record', icon: Beaker },
        ].map((l) => {
          const LIcon = l.icon;
          return (
            <Link key={l.href} href={l.href} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all">
              <LIcon className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] font-bold text-slate-500 uppercase text-center leading-tight">{l.label}</span>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}
