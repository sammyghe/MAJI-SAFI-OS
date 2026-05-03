'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import {
  Factory, CheckCircle2, DollarSign, AlertTriangle, Users,
  Users2, Package, Truck, ShoppingCart, TrendingUp, Shield, Zap,
  ArrowRight, ArrowUpRight, ChevronDown, ChevronUp,
} from 'lucide-react';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';
import ActivityFeed from '@/components/ActivityFeed';

interface KPIs {
  jarsToday: number;
  qcPassRate: number | null;
  revenueToday: number;
  openIssues: number;
  teamPresent: number;
}

interface SparkPoint { day: string; jars: number; }

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
  if (h < 12) return 'Welcome back';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Sparkline({ data, width = 120, height = 40 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (v / max) * (height - 4) - 2,
  }));
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${path} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7EC8E3" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7EC8E3" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke="#7EC8E3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts[pts.length - 1] && (
        <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill="#7EC8E3" />
      )}
    </svg>
  );
}

function MobileAccordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="md:contents">
      {/* Toggle button — mobile only */}
      <button
        className="md:hidden w-full flex items-center justify-between px-4 py-3 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-200/60 text-sm font-bold text-slate-700"
        onClick={() => setOpen((p) => !p)}
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      <div className={`${open ? 'block' : 'hidden'} md:block`}>
        {children}
      </div>
    </div>
  );
}

export default function FounderHome() {
  const { user } = useAuth();
  const [kpis, setKpis] = useState<KPIs>({ jarsToday: 0, qcPassRate: null, revenueToday: 0, openIssues: 0, teamPresent: 0 });
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<{ id: string; type: string; msg: string }[]>([]);
  const [sparkData, setSparkData] = useState<number[]>([]);
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    const [prod, qc, sales, events, team, sparkRaw, gaps] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', today),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('tested_at', today),
      supabase.from('sales_ledger').select('amount_ugx').eq('location_id', 'buziga').eq('sale_date', today),
      supabase.from('events').select('id, event_type, payload').eq('location_id', 'buziga').eq('severity', 'critical').order('created_at', { ascending: false }).limit(5),
      supabase.from('team_members').select('id').eq('contract_status', 'active').gte('last_seen_at', hourAgo),
      supabase.from('production_logs').select('production_date, jar_count').eq('location_id', 'buziga').gte('production_date', sevenDaysAgo).order('production_date', { ascending: true }),
      supabase.from('compliance_gaps').select('*').eq('location_id', 'buziga').neq('status', 'resolved'),
    ]);

    const jarsToday = (prod.data ?? []).reduce((s, r) => s + (r.jar_count ?? 0), 0);
    const qcTests = qc.data ?? [];
    const qcPassRate = qcTests.length > 0 ? Math.round(qcTests.filter(t => t.result === 'PASS').length / qcTests.length * 100) : null;
    const revenueToday = (sales.data ?? []).reduce((s, r) => s + (r.amount_ugx ?? 0), 0);

    const byDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      byDay[d] = 0;
    }
    (sparkRaw.data ?? []).forEach(r => { if (r.production_date in byDay) byDay[r.production_date] += r.jar_count ?? 0; });
    setSparkData(Object.values(byDay));

    const eventAlerts = (events.data ?? []).map(e => ({ id: e.id, type: e.event_type ?? 'event', msg: e.payload ? JSON.stringify(e.payload).slice(0, 80) : e.event_type }));
    const criticalGaps = (gaps.data ?? []).filter((g: any) => g.severity === 'critical');
    const gapAlerts = criticalGaps.map((g: any) => ({ id: g.id, type: 'unbs_gap', msg: `${g.gap_description.slice(0, 60)}... (Due: ${g.due_date ? new Date(g.due_date).toLocaleDateString('en-GB', { month: 'short', day: '2-digit' }) : 'soon'})` }));

    setKpis({ jarsToday, qcPassRate, revenueToday, openIssues: eventAlerts.length + gapAlerts.length, teamPresent: team.data?.length ?? 0 });
    setAlerts([...gapAlerts, ...eventAlerts]);
    setLoading(false);
  };

  const allClear = alerts.length === 0;
  const attainment = Math.min(100, Math.round((kpis.jarsToday / 500) * 100));
  const firstName = user?.name?.split(' ')[0] ?? 'Sammy';
  const initials = user?.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? 'SG';
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-4 md:px-6 py-6 md:py-8 max-w-7xl mx-auto space-y-4 md:space-y-6">

      {/* ── Greeting + Hero — ALWAYS VISIBLE ────────────────── */}
      <motion.div
        className="grid md:grid-cols-5 gap-4 md:gap-5"
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      >
        {/* Left: Greeting */}
        <div className="md:col-span-2 flex flex-col justify-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #FFD700, #F59E0B)' }}>
              {initials}
            </div>
            <div>
              <p className="text-slate-500 text-sm">{date}</p>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                {greeting()}, {firstName}
              </h1>
              <p className="text-slate-400 text-sm">Let's see your operations</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-2.5 glass-card-strong rounded-2xl w-fit">
            <div className={`w-2 h-2 rounded-full ${allClear ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-ping'}`} />
            <span className={`text-sm font-semibold ${allClear ? 'text-emerald-600' : 'text-red-600'}`}>
              {allClear ? 'All systems nominal' : `${alerts.length} issue${alerts.length > 1 ? 's' : ''} need attention`}
            </span>
          </div>
        </div>

        {/* Right: Hero dark card */}
        <div className="md:col-span-3 hero-card-dark p-6 flex flex-col justify-between min-h-[160px] md:min-h-[180px]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1" style={{ color: '#CAE7F5' }}>
                Today's Production
              </p>
              {loading ? (
                <p className="text-5xl md:text-7xl font-black text-white/30 tabular-nums leading-none">—</p>
              ) : (
                <p className="text-5xl md:text-7xl font-black text-white tabular-nums leading-none">
                  <CountUp end={kpis.jarsToday} duration={1.5} separator="," />
                </p>
              )}
              <p className="text-[#CAE7F5] text-sm mt-1 opacity-80">jars produced today</p>
            </div>
            <Sparkline data={sparkData.length > 0 ? sparkData : [0, 0, 0, 0, 0, 0, 0]} width={100} height={40} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[#CAE7F5] opacity-70">{attainment}% of 500-jar target</span>
              <span className="text-[#7EC8E3] font-bold">{500 - kpis.jarsToday > 0 ? `${500 - kpis.jarsToday} to go` : 'Target hit!'}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${attainment}%`, background: attainment >= 80 ? '#10B981' : attainment >= 40 ? '#7EC8E3' : '#F59E0B' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Link href="/production" className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all hover:opacity-90"
              style={{ background: 'rgba(126,200,227,0.2)', color: '#7EC8E3', border: '1px solid rgba(126,200,227,0.3)' }}>
              <ArrowUpRight className="w-4 h-4" /> View Production
            </Link>
            <Link href="/finance/cfo" className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-white/60 hover:text-white transition-colors">
              Finances <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── UNBS Alert — ALWAYS VISIBLE when alerts exist ──── */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <div className="glass-card p-4 md:p-5 border border-red-200/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Needs Attention</h2>
              </div>
              {alerts.some(a => a.type === 'unbs_gap') && (
                <Link href="/compliance/gaps" className="text-xs text-[#0077B6] font-bold hover:underline">
                  View All →
                </Link>
              )}
            </div>
            <div className="space-y-1.5">
              {alerts.slice(0, 3).map((a) => (
                <div key={a.id} className={`flex items-start gap-3 py-1.5 ${a.type === 'unbs_gap' ? 'bg-red-50/50 -mx-3 px-3 rounded-lg' : ''}`}>
                  <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${a.type === 'unbs_gap' ? 'bg-red-600' : 'bg-red-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">{a.type === 'unbs_gap' ? '🛡️ UNBS' : a.type.replace(/_/g, ' ').toUpperCase()}</p>
                    <p className="text-xs text-slate-500 truncate">{a.msg}</p>
                  </div>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-[10px] text-slate-400 pl-4">+{alerts.length - 3} more issues</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ── KPI Cards — accordion on mobile ─────────────────── */}
      <MobileAccordion title={`KPIs (${kpis.jarsToday} jars · ${kpis.qcPassRate !== null ? `${kpis.qcPassRate}% QC` : 'No QC'})`}>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}
        >
          {[
            { label: 'Jars Today',    value: loading ? '—' : kpis.jarsToday.toLocaleString(), icon: Factory,      ok: kpis.jarsToday >= 220, context: 'Target: 500/day' },
            { label: 'QC Pass Rate',  value: loading ? '—' : kpis.qcPassRate !== null ? `${kpis.qcPassRate}%` : 'No tests', icon: CheckCircle2, ok: (kpis.qcPassRate ?? 100) === 100, context: '100% required' },
            { label: 'Revenue Today', value: loading ? '—' : `UGX ${(kpis.revenueToday / 1000).toFixed(0)}K`, icon: DollarSign, ok: kpis.revenueToday > 0, context: 'Wholesale only' },
            { label: 'Open Issues',   value: loading ? '—' : kpis.openIssues.toString(), icon: AlertTriangle, ok: kpis.openIssues === 0, context: 'Critical events' },
            { label: 'Team Present',  value: loading ? '—' : kpis.teamPresent.toString(), icon: Users, ok: kpis.teamPresent > 0, context: 'Active in last hour' },
          ].map((kpi) => (
            <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="founder" context={kpi.context} />
          ))}
        </motion.div>
      </MobileAccordion>

      {/* ── Activity + Inbox + Depts — accordion on mobile ── */}
      <MobileAccordion title="Activity & Inbox">
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <ActivityFeed limit={6} />
          </motion.div>
          <motion.div className="md:col-span-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
            <InboxPanel />
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">All Departments</p>
            <div className="glass-card p-3 space-y-1">
              {DEPT_LINKS.map((d) => {
                const Icon = d.icon;
                return (
                  <Link key={d.slug} href={`/${d.slug}`}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/60 transition-all group"
                  >
                    <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${d.color}20` }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: d.color }} />
                    </div>
                    <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors">{d.name}</span>
                    <ArrowRight className="w-3 h-3 ml-auto text-slate-300 group-hover:text-slate-500 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </div>
      </MobileAccordion>
    </div>
  );
}
