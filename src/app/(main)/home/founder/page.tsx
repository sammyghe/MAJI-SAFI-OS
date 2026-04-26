'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Factory, CheckCircle2, DollarSign, AlertTriangle, Users,
  Users2, Package, Truck, ShoppingCart, TrendingUp, Shield, Zap,
  CheckCircle, ArrowRight, Play,
} from 'lucide-react';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';

interface KPIs {
  jarsToday: number;
  qcPassRate: number | null;
  revenueToday: number;
  openIssues: number;
  teamPresent: number;
}

const DEPT_LINKS = [
  { slug: 'founder-office', name: 'Founder Office', icon: Users2,      color: '#FFD700' },
  { slug: 'production',     name: 'Production',     icon: Factory,     color: '#10B981' },
  { slug: 'quality',        name: 'Quality',        icon: CheckCircle2, color: '#F59E0B' },
  { slug: 'inventory',      name: 'Inventory',      icon: Package,     color: '#8B5CF6' },
  { slug: 'dispatch',       name: 'Dispatch',       icon: Truck,       color: '#06B6D4' },
  { slug: 'sales',          name: 'Sales',          icon: ShoppingCart, color: '#EC4899' },
  { slug: 'marketing',      name: 'Marketing',      icon: TrendingUp,  color: '#F97316' },
  { slug: 'finance',        name: 'Finance',        icon: DollarSign,  color: '#10B981' },
  { slug: 'compliance',     name: 'Compliance',     icon: Shield,      color: '#F59E0B' },
  { slug: 'technology',     name: 'Technology',     icon: Zap,         color: '#0077B6' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function FounderHome() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({ jarsToday: 0, qcPassRate: null, revenueToday: 0, openIssues: 0, teamPresent: 0 });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string; type: string; msg: string }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    channelRef.current = supabase.channel('rt:founder-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_tests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_ledger' }, load)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const hourAgo = new Date(Date.now() - 3600000).toISOString();
    const [prod, qc, sales, events, team] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('tested_at', today),
      supabase.from('sales_ledger').select('amount_ugx').eq('location_id', 'buziga').eq('sale_date', today),
      supabase.from('events').select('id, event_type, payload').eq('location_id', 'buziga').eq('severity', 'critical').order('created_at', { ascending: false }).limit(5),
      supabase.from('team_members').select('id').eq('contract_status', 'active').gte('last_seen_at', hourAgo),
    ]);
    const jarsToday = (prod.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qc.data ?? [];
    const qcPassRate = qcTests.length > 0 ? Math.round(qcTests.filter(t => t.result === 'PASS').length / qcTests.length * 100) : null;
    const revenueToday = (sales.data ?? []).reduce((s, r) => s + (r.amount_ugx ?? 0), 0);
    setKpis({ jarsToday, qcPassRate, revenueToday, openIssues: events.data?.length ?? 0, teamPresent: team.data?.length ?? 0 });
    setAlerts((events.data ?? []).map(e => ({ id: e.id, type: e.event_type ?? 'event', msg: e.payload ? JSON.stringify(e.payload).slice(0, 80) : e.event_type })));
    setLoading(false);
  };

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
            <p className="text-slate-500 text-sm mt-1">{date} · Founder Office</p>
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
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <CheckCircle className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">Operations begin May 20 — use simulation to preview launch day</p>
              <p className="text-sm opacity-75 mt-1">No critical issues. Review your department readiness below.</p>
            </div>
            <Link href="/settings/simulation" className="flex-shrink-0 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5">
              Simulate <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <AlertTriangle className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">{alerts[0]?.type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
              <p className="text-sm opacity-75 mt-1">{alerts[0]?.msg}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-5 gap-4"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
      >
        {[
          { label: 'Jars Today',    value: loading ? '—' : kpis.jarsToday.toLocaleString(),                                       icon: Factory,      ok: kpis.jarsToday >= 220, context: 'Target: 500/day' },
          { label: 'QC Pass Rate',  value: loading ? '—' : kpis.qcPassRate !== null ? `${kpis.qcPassRate}%` : 'No tests',         icon: CheckCircle2, ok: (kpis.qcPassRate ?? 100) === 100, context: '100% required' },
          { label: 'Revenue Today', value: loading ? '—' : `UGX ${(kpis.revenueToday / 1000).toFixed(0)}K`,                       icon: DollarSign,   ok: kpis.revenueToday > 0, context: 'Wholesale only' },
          { label: 'Open Issues',   value: loading ? '—' : kpis.openIssues.toString(),                                             icon: AlertTriangle, ok: kpis.openIssues === 0, context: 'Critical events' },
          { label: 'Team Present',  value: loading ? '—' : kpis.teamPresent.toString(),                                            icon: Users,        ok: kpis.teamPresent > 0, context: 'Active in last hour' },
        ].map((kpi) => (
          <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="founder" context={kpi.context} />
        ))}
      </motion.div>

      {/* Activity + Dept grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Inbox — 2/3 width */}
        <motion.div className="md:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <InboxPanel />
        </motion.div>

        {/* Quick links — 1/3 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">All Departments</p>
          <div className="space-y-1">
            {DEPT_LINKS.map((d) => {
              const Icon = d.icon;
              return (
                <Link key={d.slug} href={`/${d.slug}`}
                  className="flex items-center gap-3 px-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all group"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: d.color }} />
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{d.name}</span>
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
                  <p className="text-xs text-slate-500 mt-0.5">{a.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
