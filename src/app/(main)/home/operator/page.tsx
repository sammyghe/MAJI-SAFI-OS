'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  ClipboardList, Beaker, LogOut, PlayCircle, AlertCircle,
  CheckCircle2, Factory, AlertTriangle, Check, ExternalLink,
} from 'lucide-react';
import ShiftGate from '@/components/ShiftGate';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';

interface ShiftData { target: number; done: number; lastQC: string | null; qcPassRate: number | null; }
interface QMSDoc { id: string; doc_slug: string; title: string; drive_url: string; owner_role: string; category: string; }
interface ChecklistItem { doc: QMSDoc; checked: boolean; }

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

// Phase-based QMS categories
const PHASE_CATEGORIES: Record<ShiftPhase, string[]> = {
  'pre-checks': ['production'],
  'production': ['production', 'quality'],
  'qc-due': ['quality'],
  'end-shift': ['production'],
  'off-shift': [],
};

export default function OperatorHome() {
  const { user } = useAuth();
  const [shift, setShift] = useState<ShiftData>({ target: 500, done: 0, lastQC: null, qcPassRate: null });
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
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
    const [prodRes, qcRes, qmsRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('tested_at, result').eq('location_id', 'buziga').gte('tested_at', today).order('tested_at', { ascending: false }),
      supabase.from('qms_documents').select('*'),
    ]);

    const done = (prodRes.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qcRes.data ?? [];
    const lastQC = qcTests[0]?.tested_at ?? null;
    const qcPassRate = qcTests.length > 0 ? Math.round(qcTests.filter(t => t.result === 'PASS').length / qcTests.length * 100) : null;
    
    // Get phase
    const phase = getShiftPhase(lastQC);
    const categories = PHASE_CATEGORIES[phase];
    
    // Filter QMS docs by phase categories and operator-relevant roles
    const operatorRoles = ['production_assistant', 'lead_operator'];
    const docs = (qmsRes.data ?? [])
      .filter(d => categories.includes(d.category) && operatorRoles.includes(d.owner_role))
      .sort((a, b) => a.title.localeCompare(b.title));

    // Auto-detect checked items based on data existence
    const autoChecked: Record<string, boolean> = {};
    docs.forEach(doc => {
      if (doc.doc_slug === 'raw-water-analysis' && qcTests.some(t => t.result)) autoChecked[doc.id] = true;
      if (doc.doc_slug === 'production-inventory' && done > 0) autoChecked[doc.id] = true;
      if (doc.doc_slug === 'hygiene-checklist' && phase === 'pre-checks') autoChecked[doc.id] = checked[doc.id] ?? false;
    });

    setShift({ target: 500, done, lastQC, qcPassRate });
    setChecklist(docs.map(doc => ({ doc, checked: autoChecked[doc.id] ?? false })));
    setLoading(false);
  };

  const handleToggleCheck = (docId: string) => {
    setChecked(prev => ({ ...prev, [docId]: !prev[docId] }));
  };

  const phase = getShiftPhase(shift.lastQC);
  const cfg = PHASE_CONFIG[phase];
  const Icon = cfg.icon;
  const pct = Math.min(100, Math.round((shift.done / shift.target) * 100));
  const remaining = Math.max(0, shift.target - shift.done);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  
  // Calculate checklist progress
  const checkedCount = checklist.filter((c, i) => checked[c.doc.id] ?? c.checked).length;
  const totalTasks = checklist.length;

  // Next primary action (first unchecked critical item or next phase action)
  const nextUnchecked = checklist.find((c, i) => !(checked[c.doc.id] ?? c.checked));
  const primaryAction = phase === 'qc-due' ? null : nextUnchecked ? { type: 'doc', data: nextUnchecked.doc } : { type: 'phase', data: cfg };

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto space-y-6">

      {/* Greeting bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{date} · Shift {phase === 'production' ? 'Active' : phase === 'off-shift' ? 'Off' : 'Starting'}</p>
      </motion.div>

      {/* Shift gate */}
      <ShiftGate />

      {/* Checklist Progress Bar */}
      {totalTasks > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="bg-slate-50 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">Today's Tasks</p>
            <p className="text-sm font-bold text-slate-900">{checkedCount} of {totalTasks} done</p>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${Math.round(checkedCount / totalTasks * 100)}%` }} />
          </div>
        </motion.div>
      )}

      {/* Primary Action Button */}
      {phase !== 'off-shift' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
          {phase === 'qc-due' ? (
            <Link href="/quality">
              <div className="rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg cursor-pointer active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Beaker className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Urgent — 2h+ overdue</p>
                  <p className="text-xl font-black">Run QC Test</p>
                </div>
              </div>
            </Link>
          ) : nextUnchecked ? (
            <a href={nextUnchecked.doc.drive_url} target="_blank" rel="noopener noreferrer">
              <div className="rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg cursor-pointer active:scale-95 transition-transform"
                style={{ background: `linear-gradient(135deg, #0077B6, #0077B6cc)` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <ClipboardList className="w-8 h-8" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Next Task</p>
                  <p className="text-lg font-black truncate">{nextUnchecked.doc.title}</p>
                </div>
                <ExternalLink className="w-5 h-5 flex-shrink-0" />
              </div>
            </a>
          ) : (
            <Link href={cfg.href}>
              <div className="rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg cursor-pointer active:scale-95 transition-transform"
                style={{ background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}cc)` }}>
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Icon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Next Action</p>
                  <p className="text-xl font-black">{cfg.label}</p>
                </div>
              </div>
            </Link>
          )}
        </motion.div>
      )}

      {/* Phase Checklist */}
      {totalTasks > 0 && phase !== 'off-shift' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }} className="space-y-3">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest px-1">Phase Checklist</p>
          {checklist.map((item, idx) => {
            const isChecked = checked[item.doc.id] ?? item.checked;
            return (
              <div key={item.doc.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <button
                  onClick={() => handleToggleCheck(item.doc.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-md border-2 border-slate-300 flex items-center justify-center transition-all"
                  style={{ background: isChecked ? '#10B981' : 'white', borderColor: isChecked ? '#10B981' : '#cbd5e1' }}
                >
                  {isChecked && <Check className="w-4 h-4 text-white" />}
                </button>
                <a href={item.doc.drive_url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 hover:underline cursor-pointer">
                  <p className={`text-sm font-semibold ${isChecked ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{item.doc.title}</p>
                </a>
                <ExternalLink className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Production progress */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }} className="glass-card-strong p-6">
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
      </motion.div>

      {/* KPI cards — removed for operator focus */}

      {/* Inbox — compact */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
        <InboxPanel compact />
      </motion.div>
    </div>
  );
}
