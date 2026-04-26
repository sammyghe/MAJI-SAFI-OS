'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Factory, CheckCircle2, Package, Users, AlertTriangle,
  TrendingUp, ArrowRight, CheckCircle,
} from 'lucide-react';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';

interface KPIs {
  jarsActual: number;
  jarsTarget: number;
  qcPassRate: number | null;
  lowStockItems: number;
  teamPresent: number;
  openIssues: number;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ManagerHome() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({ jarsActual: 0, jarsTarget: 500, qcPassRate: null, lowStockItems: 0, teamPresent: 0, openIssues: 0 });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string; type: string; dept: string | null }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    channelRef.current = supabase.channel('rt:manager-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_tests' }, load)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const [prod, qc, inv, team, events] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('tested_at', today),
      supabase.from('inventory_items').select('id').eq('location_id', 'buziga').filter('quantity', 'lte', 'reorder_threshold'),
      supabase.from('team_members').select('id').eq('contract_status', 'active').gte('last_seen_at', hourAgo),
      supabase.from('events').select('id, event_type, department').eq('location_id', 'buziga').eq('severity', 'critical').order('created_at', { ascending: false }).limit(5),
    ]);
    const jarsActual = (prod.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qc.data ?? [];
    const qcPassRate = qcTests.length > 0 ? Math.round(qcTests.filter(t => t.result === 'PASS').length / qcTests.length * 100) : null;
    setKpis({ jarsActual, jarsTarget: 500, qcPassRate, lowStockItems: inv.data?.length ?? 0, teamPresent: team.data?.length ?? 0, openIssues: events.data?.length ?? 0 });
    setAlerts((events.data ?? []).map(e => ({ id: e.id, type: e.event_type ?? 'event', dept: e.department })));
    setLoading(false);
  };

  const attainment = Math.min(100, Math.round((kpis.jarsActual / kpis.jarsTarget) * 100));
  const allClear = alerts.length === 0;
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">

      {/* Greeting bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {greeting()}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{date} · Operations</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className={`w-2 h-2 rounded-full ${allClear ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-ping'}`} />
            <span className={`text-sm font-semibold ${allClear ? 'text-emerald-600' : 'text-red-600'}`}>
              {allClear ? 'All systems nominal' : `${alerts.length} issue${alerts.length > 1 ? 's' : ''} need attention`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Today's One Thing */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        {allClear ? (
          <div className="bg-gradient-to-r from-[#0077B6] to-[#7EC8E3] rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <CheckCircle className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">Hit {kpis.jarsTarget} jars — {attainment}% attained so far</p>
              <p className="text-sm opacity-75 mt-1">No critical issues. Keep the line moving.</p>
            </div>
            <Link href="/production" className="flex-shrink-0 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5">
              View Line <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <AlertTriangle className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">{alerts[0]?.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
              <p className="text-sm opacity-75 mt-1">{alerts[0]?.dept ? `Department: ${alerts[0].dept}` : 'Review and resolve immediately'}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Production progress bar */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.08 }}>
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Production Today</p>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-black text-slate-900 tabular-nums leading-none">{loading ? '—' : kpis.jarsActual.toLocaleString()}</span>
                <span className="text-2xl font-black text-slate-300 tabular-nums leading-none mb-1">/ {kpis.jarsTarget.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-4xl font-black tabular-nums ${attainment >= 80 ? 'text-emerald-500' : attainment >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {loading ? '—' : `${attainment}%`}
              </span>
              <p className="text-xs text-slate-400 mt-1">attainment</p>
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${attainment}%`, backgroundColor: attainment >= 80 ? '#10B981' : attainment >= 50 ? '#F59E0B' : '#EF4444' }}
            />
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
      >
        {[
          { label: 'QC Pass Rate',   value: loading ? '—' : kpis.qcPassRate !== null ? `${kpis.qcPassRate}%` : 'No tests', icon: CheckCircle2, ok: (kpis.qcPassRate ?? 100) === 100, context: '100% required' },
          { label: 'Low Stock Items', value: loading ? '—' : kpis.lowStockItems.toString(), icon: Package, ok: kpis.lowStockItems === 0, context: 'Below reorder threshold' },
          { label: 'Team Present',   value: loading ? '—' : kpis.teamPresent.toString(), icon: Users, ok: kpis.teamPresent > 0, context: 'Active in last hour' },
          { label: 'Open Issues',    value: loading ? '—' : kpis.openIssues.toString(), icon: AlertTriangle, ok: kpis.openIssues === 0, context: 'Critical events' },
        ].map((kpi) => (
          <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="manager" context={kpi.context} />
        ))}
      </motion.div>

      {/* Activity + Quick links */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div className="md:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <InboxPanel />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Quick Access</p>
          <div className="space-y-1">
            {[
              { href: '/production', label: 'Production', icon: Factory, color: '#10B981' },
              { href: '/quality', label: 'Quality', icon: CheckCircle2, color: '#F59E0B' },
              { href: '/inventory', label: 'Inventory', icon: Package, color: '#8B5CF6' },
              { href: '/dispatch', label: 'Dispatch', icon: TrendingUp, color: '#06B6D4' },
              { href: '/compliance/team', label: 'Team', icon: Users, color: '#0077B6' },
            ].map((l) => {
              const Icon = l.icon;
              return (
                <Link key={l.href} href={l.href}
                  className="flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: l.color }} />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{l.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Needs Attention</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-slate-800">{a.type.replace(/_/g, ' ').toUpperCase()}</p>
                  {a.dept && <p className="text-xs text-slate-500 mt-0.5">{a.dept}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
