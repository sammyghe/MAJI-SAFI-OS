'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Factory, CheckCircle2, Package, Users, AlertTriangle,
  TrendingUp, ArrowRight, ArrowUpRight,
} from 'lucide-react';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';
import ActivityFeed from '@/components/ActivityFeed';

interface KPIs {
  jarsActual: number;
  qcPassRate: number | null;
  lowStockItems: number;
  teamPresent: number;
  openIssues: number;
}

interface SparkPoint { day: string; jars: number; }

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Welcome back';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Sparkline({ data, width = 100, height = 36 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 4) - 2,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible opacity-80">
      <path d={path} fill="none" stroke="rgba(126,200,227,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts[pts.length - 1] && (
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#7EC8E3" />
      )}
    </svg>
  );
}

export default function ManagerHome() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({ jarsActual: 0, qcPassRate: null, lowStockItems: 0, teamPresent: 0, openIssues: 0 });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string; type: string; dept: string | null }[]>([]);
  const [sparkData, setSparkData] = useState<number[]>([]);
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [prod, qc, inv, team, events, sparkRaw] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('tested_at', today),
      supabase.from('inventory_items').select('id').eq('location_id', 'buziga').filter('quantity', 'lte', 'reorder_threshold'),
      supabase.from('team_members').select('id').eq('contract_status', 'active').gte('last_seen_at', hourAgo),
      supabase.from('events').select('id, event_type, department').eq('location_id', 'buziga').eq('severity', 'critical').order('created_at', { ascending: false }).limit(5),
      supabase.from('production_logs').select('production_date, jar_count').eq('location_id', 'buziga').gte('production_date', sevenDaysAgo).order('production_date', { ascending: true }),
    ]);

    const jarsActual = (prod.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qc.data ?? [];
    const qcPassRate = qcTests.length > 0 ? Math.round(qcTests.filter(t => t.result === 'PASS').length / qcTests.length * 100) : null;

    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      byDay[d] = 0;
    }
    (sparkRaw.data ?? []).forEach(r => { if (r.production_date in byDay) byDay[r.production_date] += r.jar_count ?? 0; });
    setSparkData(Object.values(byDay));

    setKpis({ jarsActual, qcPassRate, lowStockItems: inv.data?.length ?? 0, teamPresent: team.data?.length ?? 0, openIssues: events.data?.length ?? 0 });
    setAlerts((events.data ?? []).map(e => ({ id: e.id, type: e.event_type ?? 'event', dept: e.department })));
    setLoading(false);
  };

  const attainment = Math.min(100, Math.round((kpis.jarsActual / 500) * 100));
  const allClear = alerts.length === 0;
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'OP';
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 max-w-7xl mx-auto space-y-6">

      {/* ── Greeting + Hero ──────────────────────────────────────── */}
      <motion.div
        className="grid md:grid-cols-5 gap-5"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      >
        <div className="md:col-span-2 flex flex-col justify-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0077B6, #7EC8E3)' }}>
              {initials}
            </div>
            <div>
              <p className="text-slate-500 text-sm">{date}</p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {greeting()}, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-slate-400 text-sm">Operations overview</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 glass-card-strong rounded-2xl w-fit">
            <div className={`w-2 h-2 rounded-full ${allClear ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-ping'}`} />
            <span className={`text-sm font-semibold ${allClear ? 'text-emerald-600' : 'text-red-600'}`}>
              {allClear ? 'Line running smoothly' : `${alerts.length} issue${alerts.length > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>

        <div className="md:col-span-3 hero-card-dark p-6 flex flex-col justify-between min-h-[180px]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1" style={{ color: '#CAE7F5' }}>
                Today's Production
              </p>
              {loading ? (
                <p className="text-7xl font-black text-white/30 tabular-nums leading-none">—</p>
              ) : (
                <p className="text-7xl font-black text-white tabular-nums leading-none">
                  <CountUp end={kpis.jarsActual} duration={1.5} separator="," />
                </p>
              )}
              <p className="text-[#CAE7F5] text-sm mt-1 opacity-80">jars produced · target 500</p>
            </div>
            <Sparkline data={sparkData.length > 0 ? sparkData : [0, 0, 0, 0, 0, 0, 0]} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#CAE7F5] opacity-70">{attainment}% attainment</span>
              <span className={`font-bold ${attainment >= 80 ? 'text-emerald-400' : attainment >= 50 ? 'text-[#7EC8E3]' : 'text-amber-400'}`}>
                {attainment >= 100 ? 'Target hit!' : `${500 - kpis.jarsActual} to go`}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${attainment}%`, background: attainment >= 80 ? '#10B981' : attainment >= 50 ? '#7EC8E3' : '#F59E0B' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Link href="/production" className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'rgba(126,200,227,0.2)', color: '#7EC8E3', border: '1px solid rgba(126,200,227,0.3)' }}>
              <ArrowUpRight className="w-4 h-4" /> Production
            </Link>
            <Link href="/quality" className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-colors">
              QC <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
      >
        {[
          { label: 'QC Pass Rate',    value: loading ? '—' : kpis.qcPassRate !== null ? `${kpis.qcPassRate}%` : 'No tests', icon: CheckCircle2, ok: (kpis.qcPassRate ?? 100) === 100, context: '100% required' },
          { label: 'Low Stock Items', value: loading ? '—' : kpis.lowStockItems.toString(), icon: Package, ok: kpis.lowStockItems === 0, context: 'Below reorder threshold' },
          { label: 'Team Present',    value: loading ? '—' : kpis.teamPresent.toString(), icon: Users, ok: kpis.teamPresent > 0, context: 'Active in last hour' },
          { label: 'Open Issues',     value: loading ? '—' : kpis.openIssues.toString(), icon: AlertTriangle, ok: kpis.openIssues === 0, context: 'Critical events' },
        ].map((kpi) => (
          <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="manager" context={kpi.context} />
        ))}
      </motion.div>

      {/* ── Activity + Inbox + Quick links ───────────────────────── */}
      <div className="grid md:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <ActivityFeed limit={6} />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <InboxPanel />
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Quick Access</p>
          <div className="glass-card p-3 space-y-1">
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
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-all group"
                >
                  <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${l.color}20` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: l.color }} />
                  </div>
                  <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{l.label}</span>
                  <ArrowRight className="w-3 h-3 ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>

      {alerts.length > 0 && (
        <div className="glass-card p-5 border border-red-200/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Needs Attention</h2>
          </div>
          <div className="space-y-2">
            {alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 py-2 border-b border-slate-100/60 last:border-0">
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
