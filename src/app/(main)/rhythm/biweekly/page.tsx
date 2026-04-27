'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { BarChart2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Scorecard from '@/components/Scorecard';

interface ProductionSummary {
  total_jars: number;
  batch_count: number;
  avg_jars_per_day: number;
}

interface QualitySummary {
  total_tests: number;
  pass_count: number;
  pass_rate: number;
}

interface SalesSummary {
  total_revenue: number;
  total_jars: number;
}

interface IssueSummary {
  identified: number;
  discussing: number;
  solving: number;
  resolved: number;
}

function TrendIcon({ value, target }: { value: number | null; target: number }) {
  if (value === null) return <Minus className="w-3.5 h-3.5 text-slate-600" />;
  if (value >= target) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (value >= target * 0.8) return <Minus className="w-3.5 h-3.5 text-amber-400" />;
  return <TrendingDown className="w-3.5 h-3.5 text-red-400" />;
}

function StatCard({ label, value, subtitle, trend, target }: {
  label: string; value: string; subtitle?: string;
  trend?: number | null; target?: number;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-black text-white tabular-nums">{value}</p>
        {trend !== undefined && target !== undefined && (
          <TrendIcon value={trend ?? null} target={target} />
        )}
      </div>
      {subtitle && <p className="text-[10px] text-slate-600 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function BiweeklyPage() {
  const { user } = useAuth();
  const [production, setProduction] = useState<ProductionSummary | null>(null);
  const [quality, setQuality] = useState<QualitySummary | null>(null);
  const [sales, setSales] = useState<SalesSummary | null>(null);
  const [issueStats, setIssueStats] = useState<IssueSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const since14 = new Date(Date.now() - 14 * 86400000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86400000).toISOString();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const [prodRes, qualRes, salesRes, issueRes] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').gte('created_at', since14),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('created_at', since14),
      supabase.from('sales_ledger').select('amount, quantity').eq('location_id', 'buziga').gte('created_at', since14),
      supabase.from('issues').select('stage').eq('location_id', 'buziga'),
    ]);

    const prodData = prodRes.data ?? [];
    setProduction({
      total_jars: prodData.reduce((a, r) => a + (r.jar_count ?? 0), 0),
      batch_count: prodData.length,
      avg_jars_per_day: prodData.length > 0 ? Math.round(prodData.reduce((a, r) => a + (r.jar_count ?? 0), 0) / 14) : 0,
    });

    const qualData = qualRes.data ?? [];
    const passes = qualData.filter((r) => r.result === 'PASS').length;
    setQuality({
      total_tests: qualData.length,
      pass_count: passes,
      pass_rate: qualData.length > 0 ? Math.round((passes / qualData.length) * 100) : 0,
    });

    const salesData = salesRes.data ?? [];
    setSales({
      total_revenue: salesData.reduce((a, r) => a + (r.amount ?? 0), 0),
      total_jars: salesData.reduce((a, r) => a + (r.quantity ?? 0), 0),
    });

    const issueData = issueRes.data ?? [];
    setIssueStats({
      identified: issueData.filter((i) => i.stage === 'identified').length,
      discussing: issueData.filter((i) => i.stage === 'discussing').length,
      solving: issueData.filter((i) => i.stage === 'solving').length,
      resolved: issueData.filter((i) => i.stage === 'resolved').length,
    });

    setLoading(false);
  };

  const formatUGX = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="px-5 py-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-[#0077B6]" />
          Biweekly Review
        </h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">
          {user?.name?.split(' ')[0]} · Last 14 days · {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading review…</p>
      ) : (
        <>
          {/* Production */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Production — 14 days</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="Total Jars"
                value={(production?.total_jars ?? 0).toLocaleString()}
                subtitle={`Target: ${(500 * 14).toLocaleString()} jars`}
                trend={production?.total_jars ?? null}
                target={500 * 14}
              />
              <StatCard
                label="Avg Jars/Day"
                value={String(production?.avg_jars_per_day ?? 0)}
                subtitle="Target: 500/day"
                trend={production?.avg_jars_per_day ?? null}
                target={500}
              />
              <StatCard
                label="Batches Run"
                value={String(production?.batch_count ?? 0)}
                subtitle={`≈ ${production?.batch_count ? Math.round(production.batch_count / 14) : 0}/day`}
              />
            </div>
          </div>

          {/* Quality */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Quality — 14 days</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="QC Pass Rate"
                value={`${quality?.pass_rate ?? 0}%`}
                subtitle="Target: 100%"
                trend={quality?.pass_rate ?? null}
                target={100}
              />
              <StatCard
                label="Tests Run"
                value={String(quality?.total_tests ?? 0)}
                subtitle={`${quality?.pass_count ?? 0} passed`}
              />
              <StatCard
                label="Failed Tests"
                value={String((quality?.total_tests ?? 0) - (quality?.pass_count ?? 0))}
                subtitle={quality && quality.total_tests > 0 ? `${100 - quality.pass_rate}% failure rate` : '—'}
              />
            </div>
          </div>

          {/* Sales */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Sales — 14 days</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard
                label="Revenue (UGX)"
                value={`${formatUGX(sales?.total_revenue ?? 0)}`}
                subtitle={`Target: ${formatUGX(1_500_000 * 14)}`}
                trend={sales?.total_revenue ?? null}
                target={1_500_000 * 14}
              />
              <StatCard
                label="Jars Sold"
                value={(sales?.total_jars ?? 0).toLocaleString()}
                subtitle="From sales ledger"
              />
              <StatCard
                label="Avg Revenue/Day"
                value={`${formatUGX(Math.round((sales?.total_revenue ?? 0) / 14))}`}
                subtitle="Target: 1.5M/day"
                trend={Math.round((sales?.total_revenue ?? 0) / 14)}
                target={1_500_000}
              />
            </div>
          </div>

          {/* Issues */}
          {issueStats && (issueStats.identified + issueStats.discussing + issueStats.solving + issueStats.resolved) > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Issues — All Time</p>
              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="grid grid-cols-4 gap-4 text-center">
                  {[
                    { label: 'Identified', value: issueStats.identified, color: 'text-slate-400' },
                    { label: 'Discussing', value: issueStats.discussing, color: 'text-amber-400' },
                    { label: 'Solving', value: issueStats.solving, color: 'text-[#7EC8E3]' },
                    { label: 'Resolved', value: issueStats.resolved, color: 'text-emerald-400' },
                  ].map((s) => (
                    <div key={s.label}>
                      <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Scorecard */}
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Today's Scorecard</p>
            <Scorecard showHeader={false} />
          </div>
        </>
      )}
    </div>
  );
}
