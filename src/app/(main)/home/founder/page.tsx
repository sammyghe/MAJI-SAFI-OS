'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Factory, CheckCircle2, DollarSign, AlertTriangle, Users,
  Users2, Package, Truck, ShoppingCart, TrendingUp, Shield, Zap,
} from 'lucide-react';

interface KPIs {
  jarsToday: number;
  qcPassRate: number | null;
  revenueToday: number;
  openIssues: number;
  teamPresent: number;
}

const DEPT_LINKS = [
  { slug: 'founder-office', name: 'Founder Office', icon: Users2, color: '#0077B6' },
  { slug: 'production',     name: 'Production',     icon: Factory,     color: '#22c55e' },
  { slug: 'quality',        name: 'Quality',        icon: CheckCircle2, color: '#f59e0b' },
  { slug: 'inventory',      name: 'Inventory',      icon: Package,     color: '#8b5cf6' },
  { slug: 'dispatch',       name: 'Dispatch',       icon: Truck,       color: '#06b6d4' },
  { slug: 'sales',          name: 'Sales',          icon: ShoppingCart, color: '#ec4899' },
  { slug: 'marketing',      name: 'Marketing',      icon: TrendingUp,  color: '#f97316' },
  { slug: 'finance',        name: 'Finance',        icon: DollarSign,  color: '#10b981' },
  { slug: 'compliance',     name: 'Compliance',     icon: Shield,      color: '#64748b' },
  { slug: 'technology',     name: 'Technology',     icon: Zap,         color: '#7EC8E3' },
];

export default function FounderHome() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({ jarsToday: 0, qcPassRate: null, revenueToday: 0, openIssues: 0, teamPresent: 0 });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string; type: string; msg: string; severity: string }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    load();
    channelRef.current = supabase
      .channel('rt:founder-home')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_tests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_ledger' }, load)
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const [prodRes, qcRes, salesRes, eventsRes, teamRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('tested_at', today),
      supabase.from('sales_ledger').select('amount_ugx').eq('location_id', 'buziga').eq('sale_date', today),
      supabase.from('events').select('id, event_type, severity, payload').eq('location_id', 'buziga').eq('severity', 'critical').order('created_at', { ascending: false }).limit(5),
      supabase.from('team_members').select('id').eq('contract_status', 'active').gte('last_seen_at', hourAgo),
    ]);

    const jarsToday = (prodRes.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qcRes.data ?? [];
    const qcPassRate = qcTests.length > 0
      ? Math.round((qcTests.filter((t) => t.result === 'PASS').length / qcTests.length) * 100)
      : null;
    const revenueToday = (salesRes.data ?? []).reduce((s, r) => s + (r.amount_ugx ?? 0), 0);
    const openIssues = eventsRes.data?.length ?? 0;
    const teamPresent = teamRes.data?.length ?? 0;

    setKpis({ jarsToday, qcPassRate, revenueToday, openIssues, teamPresent });
    setAlerts(
      (eventsRes.data ?? []).map((e) => ({
        id: e.id,
        type: e.event_type ?? 'event',
        msg: e.payload ? JSON.stringify(e.payload).slice(0, 80) : e.event_type,
        severity: e.severity,
      }))
    );
    setLoading(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-xs font-label uppercase tracking-widest mt-1">
          Founder Office · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Jars Today',     value: loading ? '—' : kpis.jarsToday.toLocaleString(),                 icon: Factory,     ok: kpis.jarsToday >= 220 },
          { label: 'QC Pass Rate',   value: loading ? '—' : kpis.qcPassRate !== null ? `${kpis.qcPassRate}%` : 'No tests', icon: CheckCircle2, ok: (kpis.qcPassRate ?? 100) === 100 },
          { label: 'Revenue Today',  value: loading ? '—' : `UGX ${(kpis.revenueToday / 1000).toFixed(0)}K`, icon: DollarSign,  ok: kpis.revenueToday > 0 },
          { label: 'Open Issues',    value: loading ? '—' : kpis.openIssues.toString(),                       icon: AlertTriangle, ok: kpis.openIssues === 0 },
          { label: 'Team Present',   value: loading ? '—' : kpis.teamPresent.toString(),                      icon: Users,       ok: kpis.teamPresent > 0 },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-4 h-4 ${kpi.ok ? 'text-emerald-400' : 'text-amber-400'}`} />
                <span className={`w-2 h-2 rounded-full ${kpi.ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <p className="text-2xl font-black text-white">{kpi.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Needs Attention */}
      {alerts.length > 0 && (
        <div className="mb-8 bg-zinc-900 border border-red-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Needs Your Attention</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-white">{a.type.replace(/_/g, ' ').toUpperCase()}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{a.msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">All Departments</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {DEPT_LINKS.map((d) => {
            const Icon = d.icon;
            return (
              <Link
                key={d.slug}
                href={`/${d.slug}`}
                className="flex items-center gap-3 p-4 bg-zinc-900 border border-zinc-800 rounded-xl hover:border-zinc-600 transition-all group"
              >
                <Icon className="w-4 h-4 flex-shrink-0" style={{ color: d.color }} />
                <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">{d.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
