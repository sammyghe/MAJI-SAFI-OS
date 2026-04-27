'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { TrendingUp, Package, Shield, Target, AlertCircle } from 'lucide-react';

interface MonthData {
  month: string;       // 'YYYY-MM'
  label: string;       // 'April 2026'
  jars: number;
  revenue: number;
  pass_rate: number | null;
  tests: number;
}

interface RockSummary {
  total: number;
  complete: number;
  at_risk: number;
  off_track: number;
}

function formatUGX(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function BarRow({ label, value, max, color, unit }: {
  label: string; value: number; max: number;
  color: string; unit: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <p className="text-[10px] text-slate-500 w-20 flex-shrink-0 text-right">{label}</p>
      <div className="flex-1 bg-slate-100 rounded-full h-4 relative overflow-hidden">
        <div className={`h-4 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        <span className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-black text-white/80">
          {unit === 'ugx' ? formatUGX(value) : value.toLocaleString()}
        </span>
      </div>
      <p className="text-[10px] text-slate-600 w-10 flex-shrink-0">{pct}%</p>
    </div>
  );
}

export default function MonthlyPage() {
  const { user } = useAuth();
  const [months, setMonths] = useState<MonthData[]>([]);
  const [rocks, setRocks] = useState<RockSummary | null>(null);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 90 * 86400000).toISOString();

    const [prodRes, qualRes, salesRes, rocksRes, issueRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count, created_at').eq('location_id', 'buziga').gte('created_at', since),
      supabase.from('water_tests').select('result, created_at').eq('location_id', 'buziga').gte('created_at', since),
      supabase.from('sales_ledger').select('amount, created_at').eq('location_id', 'buziga').gte('created_at', since),
      supabase.from('rocks').select('status, quarter').eq('location_id', 'buziga'),
      supabase.from('issues').select('stage').eq('location_id', 'buziga').neq('stage', 'resolved'),
    ]);

    // Group by month
    const monthMap: Record<string, { jars: number; revenue: number; tests: number; passes: number }> = {};
    const getMonth = (d: string) => d.slice(0, 7);

    for (const r of prodRes.data ?? []) {
      const m = getMonth(r.created_at);
      if (!monthMap[m]) monthMap[m] = { jars: 0, revenue: 0, tests: 0, passes: 0 };
      monthMap[m].jars += r.jar_count ?? 0;
    }
    for (const r of qualRes.data ?? []) {
      const m = getMonth(r.created_at);
      if (!monthMap[m]) monthMap[m] = { jars: 0, revenue: 0, tests: 0, passes: 0 };
      monthMap[m].tests++;
      if (r.result === 'PASS') monthMap[m].passes++;
    }
    for (const r of salesRes.data ?? []) {
      const m = getMonth(r.created_at);
      if (!monthMap[m]) monthMap[m] = { jars: 0, revenue: 0, tests: 0, passes: 0 };
      monthMap[m].revenue += r.amount ?? 0;
    }

    const monthData: MonthData[] = Object.entries(monthMap)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 3)
      .map(([month, d]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }),
        jars: d.jars,
        revenue: d.revenue,
        pass_rate: d.tests > 0 ? Math.round((d.passes / d.tests) * 100) : null,
        tests: d.tests,
      }));
    setMonths(monthData);

    const rocksData = rocksRes.data ?? [];
    setRocks({
      total: rocksData.length,
      complete: rocksData.filter((r) => r.status === 'complete').length,
      at_risk: rocksData.filter((r) => r.status === 'at_risk').length,
      off_track: rocksData.filter((r) => r.status === 'off_track').length,
    });

    setOpenIssues((issueRes.data ?? []).length);
    setLoading(false);
  };

  const maxJars = Math.max(...months.map((m) => m.jars), 1);
  const maxRevenue = Math.max(...months.map((m) => m.revenue), 1);

  return (
    <div className="px-5 py-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#0077B6]" />
          Monthly Dashboard
        </h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">
          {user?.name?.split(' ')[0]} · Last 3 months · Executive view
        </p>
      </div>

      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading dashboard…</p>
      ) : (
        <>
          {/* Summary tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
              <Package className="w-5 h-5 text-[#7EC8E3] mx-auto mb-2" />
              <p className="text-xl font-black text-white">
                {months[0] ? months[0].jars.toLocaleString() : '—'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Jars This Month</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <p className="text-xl font-black text-white">
                {months[0] ? formatUGX(months[0].revenue) : '—'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Revenue This Month</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 text-center">
              <Target className="w-5 h-5 text-purple-400 mx-auto mb-2" />
              <p className="text-xl font-black text-white">
                {rocks ? `${rocks.complete}/${rocks.total}` : '—'}
              </p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Rocks Complete</p>
            </div>
            <div className={`border rounded-2xl p-4 text-center ${openIssues > 5 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-white border-slate-200'}`}>
              <AlertCircle className={`w-5 h-5 mx-auto mb-2 ${openIssues > 5 ? 'text-amber-400' : 'text-slate-500'}`} />
              <p className={`text-xl font-black ${openIssues > 5 ? 'text-amber-400' : 'text-white'}`}>{openIssues}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Open Issues</p>
            </div>
          </div>

          {/* Month-by-month bars */}
          {months.length > 0 && (
            <>
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Jars Produced — by Month</p>
                {months.map((m) => (
                  <BarRow key={m.month} label={m.label.split(' ')[0]} value={m.jars} max={maxJars} color="bg-[#0077B6]" unit="count" />
                ))}
                <div className="flex justify-end pt-1">
                  <p className="text-[10px] text-slate-600">Month 1 target: {(500 * 30).toLocaleString()} jars</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Revenue (UGX) — by Month</p>
                {months.map((m) => (
                  <BarRow key={m.month} label={m.label.split(' ')[0]} value={m.revenue} max={maxRevenue} color="bg-emerald-500" unit="ugx" />
                ))}
              </div>
            </>
          )}

          {/* QC summary */}
          {months.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Quality — by Month</p>
              <div className="space-y-2">
                {months.map((m) => (
                  <div key={m.month} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                    <p className="text-xs text-slate-300">{m.label}</p>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-slate-500">{m.tests} tests</span>
                      <span className={`text-sm font-black ${m.pass_rate === null ? 'text-slate-600' : m.pass_rate >= 95 ? 'text-emerald-400' : m.pass_rate >= 80 ? 'text-amber-400' : 'text-red-400'}`}>
                        {m.pass_rate !== null ? `${m.pass_rate}%` : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rocks breakdown */}
          {rocks && rocks.total > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Rocks Status</p>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: 'Total', value: rocks.total, color: 'text-slate-300' },
                  { label: 'Complete', value: rocks.complete, color: 'text-emerald-400' },
                  { label: 'At Risk', value: rocks.at_risk, color: 'text-amber-400' },
                  { label: 'Off Track', value: rocks.off_track, color: 'text-red-400' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-4">
                <div
                  className="h-2 rounded-full bg-[#0077B6] transition-all"
                  style={{ width: `${rocks.total > 0 ? Math.round((rocks.complete / rocks.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          {months.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-slate-500 text-sm font-bold">No monthly data yet.</p>
              <p className="text-slate-600 text-xs mt-1">Data will appear once production, quality, and sales entries are logged.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
