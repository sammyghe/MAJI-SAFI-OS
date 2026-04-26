'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Factory, CheckCircle2, Package, Users, AlertTriangle } from 'lucide-react';
import TodaysFocus from '@/components/TodaysFocus';
import InboxPanel from '@/components/InboxPanel';
import CrossDeptSummary from '@/components/CrossDeptSummary';
import TeamAwarenessPanel from '@/components/TeamAwarenessPanel';

interface ManagerKPIs {
  jarsTarget: number;
  jarsActual: number;
  qcPassRate: number | null;
  lowStockItems: number;
  teamPresent: number;
  openIssues: { id: string; type: string; dept: string | null }[];
}

export default function ManagerHome() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<ManagerKPIs>({
    jarsTarget: 500, jarsActual: 0, qcPassRate: null, lowStockItems: 0, teamPresent: 0, openIssues: [],
  });
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    channelRef.current = supabase
      .channel('rt:manager-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, load)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [prodRes, qcRes, invRes, teamRes, issuesRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('tested_at', today),
      supabase.from('inventory_items').select('id').eq('location_id', 'buziga').filter('quantity', 'lte', 'reorder_threshold'),
      supabase.from('team_members').select('id').eq('contract_status', 'active').gte('last_seen_at', hourAgo),
      supabase.from('events').select('id, event_type, department').eq('location_id', 'buziga').eq('severity', 'critical').order('created_at', { ascending: false }).limit(5),
    ]);

    const jarsActual = (prodRes.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qcRes.data ?? [];
    const qcPassRate = qcTests.length > 0
      ? Math.round((qcTests.filter((t) => t.result === 'PASS').length / qcTests.length) * 100)
      : null;

    setKpis({
      jarsTarget: 500,
      jarsActual,
      qcPassRate,
      lowStockItems: invRes.data?.length ?? 0,
      teamPresent: teamRes.data?.length ?? 0,
      openIssues: (issuesRes.data ?? []).map((e) => ({ id: e.id, type: e.event_type, dept: e.department })),
    });
    setLoading(false);
  };

  const attainment = kpis.jarsTarget > 0 ? Math.min(100, Math.round((kpis.jarsActual / kpis.jarsTarget) * 100)) : 0;

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">Operations</h1>
        <p className="text-slate-500 text-xs font-label uppercase tracking-widest mt-1">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Team Awareness */}
      <TeamAwarenessPanel />

      {/* Production Scorecard */}
      <div className="mb-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Today's Production</p>
        <div className="flex items-end gap-6 flex-wrap">
          <div>
            <p className="text-7xl font-black text-white tabular-nums leading-none">
              {loading ? '—' : kpis.jarsActual.toLocaleString()}
            </p>
            <p className="text-slate-500 text-sm mt-1">jars produced</p>
          </div>
          <div className="text-slate-600 text-5xl font-thin">/</div>
          <div>
            <p className="text-4xl font-black text-slate-400 tabular-nums">{kpis.jarsTarget.toLocaleString()}</p>
            <p className="text-slate-500 text-sm mt-1">target</p>
          </div>
          <div className="ml-auto text-right">
            <p className={`text-5xl font-black tabular-nums ${attainment >= 80 ? 'text-emerald-400' : attainment >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {loading ? '—' : `${attainment}%`}
            </p>
            <p className="text-slate-500 text-sm mt-1">attainment</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${attainment >= 80 ? 'bg-emerald-400' : attainment >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
            style={{ width: `${attainment}%` }}
          />
        </div>
      </div>

      {/* Inbox */}
      <div className="mb-4">
        <InboxPanel compact />
      </div>

      {/* Cross-dept signals */}
      <div className="mb-6">
        <CrossDeptSummary deptSlug="production" />
      </div>

      {/* Today's Focus */}
      <div className="mb-8">
        <TodaysFocus department="production" compact />
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Machine Status', value: 'ONLINE', icon: Factory, ok: true },
          { label: 'QC Pass Rate',   value: kpis.qcPassRate !== null ? `${kpis.qcPassRate}%` : 'No tests', icon: CheckCircle2, ok: (kpis.qcPassRate ?? 100) === 100 },
          { label: 'Low Stock Items', value: kpis.lowStockItems.toString(), icon: Package, ok: kpis.lowStockItems === 0 },
          { label: 'Team Present',   value: kpis.teamPresent.toString(), icon: Users, ok: kpis.teamPresent > 0 },
        ].map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <Icon className={`w-4 h-4 mb-3 ${c.ok ? 'text-emerald-400' : 'text-amber-400'}`} />
              <p className="text-2xl font-black text-white">{loading ? '—' : c.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{c.label}</p>
            </div>
          );
        })}
      </div>

      {/* Open Issues */}
      {kpis.openIssues.length > 0 && (
        <div className="mb-8 bg-zinc-900 border border-amber-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Open Issues Today</h2>
          </div>
          <div className="space-y-2">
            {kpis.openIssues.map((iss) => (
              <div key={iss.id} className="flex items-center gap-3 py-2 border-b border-zinc-800 last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <p className="text-xs font-bold text-white flex-1">{(iss.type ?? '').replace(/_/g, ' ').toUpperCase()}</p>
                {iss.dept && <span className="text-[10px] text-slate-500">{iss.dept}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Production', href: '/production' },
          { label: 'Quality', href: '/quality' },
          { label: 'Inventory', href: '/inventory' },
          { label: 'Team', href: '/compliance/team' },
        ].map((l) => (
          <Link key={l.href} href={l.href} className="px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:border-zinc-500 transition-colors">
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
