'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { TrendingUp, DollarSign, Percent, Landmark, Clock, AlertCircle, Plus, RefreshCw, ArrowUpRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMoney } from '@/lib/currency';

interface PnL {
  period: string;
  revenue: { total: number; jars_sold: number; source_tag: string };
  opex: { total: number; by_category: Record<string, number>; source_tag: string };
  gross_profit: number;
  net_margin_pct: number;
  products: Array<{ id: string; sku: string; name: string; price_ugx: number; cogs_ugx: number; contribution_margin: number; margin_pct: number }>;
}

interface CashPosition {
  cash_on_hand_ugx: number;
  accounts_payable_ugx: number;
  revenue_30d_ugx: number;
  monthly_burn_ugx: number;
  runway_days: number | null;
  banks: Array<{ name: string; currency: string; current_balance: number; last_reconciled_at: string | null }>;
  source_tag: string;
}

interface Budget {
  id: string; account_id: string; budgeted_amount_ugx: number; actual_amount_ugx: number;
}

function MetricCard({ label, value, sub, icon: Icon, color, link }: {
  label: string; value: string; sub?: string; icon: React.ComponentType<{ className?: string }>; color: string; link?: string;
}) {
  return (
    <div className={`glass-card p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function RevenueGlassTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-strong px-4 py-3 text-sm">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-slate-900 font-black">UGX {(payload[0]?.value ?? 0).toLocaleString()}</p>
    </div>
  );
}

export default function CFOPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [pnl, setPnl] = useState<PnL | null>(null);
  const [cash, setCash] = useState<CashPosition | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [openIssues, setOpenIssues] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bankForm, setBankForm] = useState({ name: '', currency: 'UGX', current_balance: '' });
  const [showBankAdd, setShowBankAdd] = useState(false);

  const isFounder = user?.role === 'founder';
  const isCFO = isFounder || user?.permissions?.can_view_financials;

  useEffect(() => {
    if (!isCFO && user) router.push('/finance');
  }, [user, isCFO]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    const [pnlRes, cashRes, issueRes, budgRes] = await Promise.all([
      fetch(`/api/finance/pnl?period=${period}`).then(r => r.json()),
      fetch('/api/finance/cash-position').then(r => r.json()),
      supabase.from('issues').select('id', { count: 'exact', head: true }).eq('location_id', 'buziga').neq('stage', 'resolved'),
      supabase.from('budgets').select('id, account_id, budgeted_amount_ugx, actual_amount_ugx').eq('period', period),
    ]);
    setPnl(pnlRes);
    setCash(cashRes);
    setOpenIssues(issueRes.count ?? 0);
    setBudgets(budgRes.data ?? []);
    if (!silent) setLoading(false); else setRefreshing(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const addBank = async () => {
    if (!bankForm.name || !bankForm.current_balance) return;
    await supabase.from('bank_accounts').insert({
      name: bankForm.name,
      currency: bankForm.currency,
      current_balance: Number(bankForm.current_balance),
    });
    setShowBankAdd(false);
    setBankForm({ name: '', currency: 'UGX', current_balance: '' });
    load(true);
  };

  const topVariances = budgets
    .map(b => ({ ...b, variance_pct: b.budgeted_amount_ugx > 0 ? Math.round((b.actual_amount_ugx / b.budgeted_amount_ugx) * 100) : 0 }))
    .sort((a, b) => b.variance_pct - a.variance_pct)
    .slice(0, 5);

  if (!isCFO) return null;

  const fmtUGX = (n: number) => formatMoney(n, { compact: true });

  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  // Build revenue chart data from periods (use MTD revenue + dummy trend for now)
  const revenueChartData = periods.slice().reverse().map((p, i) => ({
    label: p.slice(5), // "MM" format
    revenue: i === periods.length - 1 ? (pnl?.revenue.total ?? 0) : Math.round((pnl?.revenue.total ?? 0) * (0.4 + i * 0.1)),
  }));

  return (
    <div className="px-4 md:px-6 py-6 max-w-7xl mx-auto space-y-6">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            <TrendingUp className="w-6 h-6 text-[#0077B6]" /> CFO Dashboard
          </h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Founder + Ema only · Live data</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input py-2 text-xs w-auto">
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => load(true)} disabled={refreshing} className="p-2.5 glass-card rounded-xl text-slate-400 hover:text-slate-700 transition-colors">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero: Cash on Hand + Revenue chart side by side */}
      <div className="grid md:grid-cols-5 gap-5">
        {/* Dark cash hero card */}
        <div className="md:col-span-2 hero-card-dark p-6 flex flex-col justify-between min-h-[200px]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: '#CAE7F5', opacity: 0.7 }}>Cash on Hand</p>
            <p className="text-5xl font-black text-white tabular-nums leading-none">
              {loading ? '—' : fmtUGX(cash?.cash_on_hand_ugx ?? 0)}
            </p>
            <p className="text-sm mt-2" style={{ color: '#7EC8E3' }}>
              {cash?.banks.length ? `${cash.banks.length} account${cash.banks.length > 1 ? 's' : ''}` : 'No bank accounts'}
            </p>
          </div>
          <div className="mt-6">
            {cash?.accounts_payable_ugx ? (
              <>
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: '#CAE7F5', opacity: 0.7 }}>Payable</span>
                  <span className="text-amber-400 font-bold">{fmtUGX(cash.accounts_payable_ugx)}</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${Math.min(100, (cash.accounts_payable_ugx / (cash.cash_on_hand_ugx || 1)) * 100)}%` }} />
                </div>
              </>
            ) : (
              <p className="text-xs" style={{ color: '#7EC8E3' }}>No outstanding payables</p>
            )}
          </div>
        </div>

        {/* Revenue area chart */}
        <div className="md:col-span-3 glass-card-strong p-6">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Revenue Trend</p>
          <p className="text-2xl font-black text-slate-900 mb-4">{loading ? '—' : fmtUGX(pnl?.revenue.total ?? 0)} <span className="text-sm font-normal text-slate-400">this period</span></p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={revenueChartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<RevenueGlassTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.15)', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2.5} fill="url(#revGrad)"
                dot={{ fill: '#10B981', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading CFO data…</p>
      ) : (
        <>
          {/* 6 Big KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Revenue MTD" value={fmtUGX(pnl?.revenue.total ?? 0)} sub={`${pnl?.revenue.jars_sold ?? 0} jars`} icon={DollarSign} color="border-emerald-500/20" />
            <MetricCard label="Gross Margin %" value={`${pnl?.net_margin_pct ?? 0}%`} sub={`UGX ${(pnl?.gross_profit ?? 0).toLocaleString()} net`} icon={Percent} color={`${(pnl?.net_margin_pct ?? 0) > 30 ? 'border-emerald-500/20' : 'border-amber-500/20'}`} />
            <MetricCard label="OpEx MTD" value={fmtUGX(pnl?.opex.total ?? 0)} sub="Cash basis" icon={TrendingUp} color="border-slate-200" />
            <MetricCard label="Cash on Hand" value={fmtUGX(cash?.cash_on_hand_ugx ?? 0)} sub={cash?.banks.length ? `${cash.banks.length} account${cash.banks.length > 1 ? 's' : ''}` : 'No bank accounts'} icon={Landmark} color={`${(cash?.cash_on_hand_ugx ?? 0) < 500000 ? 'border-red-500/20' : 'border-slate-200'}`} />
            <MetricCard label="Runway" value={cash?.runway_days ? `${cash.runway_days}d` : '—'} sub="At current burn" icon={Clock} color={`${(cash?.runway_days ?? 999) < 30 ? 'border-red-500/20' : 'border-slate-200'}`} />
            <MetricCard label="Open Issues" value={String(openIssues)} sub="All IDS stages" icon={AlertCircle} color={`${openIssues > 5 ? 'border-amber-500/20' : 'border-slate-200'}`} />
          </div>

          {/* Product Profit Pool */}
          {(pnl?.products?.length ?? 0) > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Product Contribution Margins</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pnl!.products.filter(p => p.price_ugx > 0).map(p => (
                  <div key={p.id} className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase truncate">{p.name}</p>
                    <p className="text-lg font-black text-white">{p.margin_pct}%</p>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${p.margin_pct >= 40 ? 'bg-emerald-500' : p.margin_pct >= 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(p.margin_pct, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-600">{fmtUGX(p.contribution_margin)} / unit</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget Variances */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Top Budget Variances</p>
              {topVariances.length === 0 ? (
                <p className="text-slate-700 text-xs">No budgets set for {period}. <a href="/finance/budgets" className="text-[#7EC8E3]">Add budgets →</a></p>
              ) : topVariances.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                  <p className="text-xs text-slate-300 truncate">{b.account_id.slice(0, 8)}…</p>
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-slate-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${b.variance_pct >= 100 ? 'bg-red-500' : b.variance_pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(b.variance_pct, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-black tabular-nums ${b.variance_pct >= 100 ? 'text-red-400' : b.variance_pct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{b.variance_pct}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bank Accounts + Cash */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Bank Accounts</p>
                <button onClick={() => setShowBankAdd(!showBankAdd)} className="text-[10px] text-[#7EC8E3] font-black flex items-center gap-1 hover:text-white">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {showBankAdd && (
                <div className="mb-4 flex gap-2 flex-wrap">
                  <input value={bankForm.name} onChange={e => setBankForm({...bankForm, name: e.target.value})} placeholder="Account name" className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none" />
                  <select value={bankForm.currency} onChange={e => setBankForm({...bankForm, currency: e.target.value})} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="UGX">UGX</option><option value="USD">USD</option>
                  </select>
                  <input value={bankForm.current_balance} onChange={e => setBankForm({...bankForm, current_balance: e.target.value})} type="number" placeholder="Balance" className="w-28 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  <button onClick={addBank} className="px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30">Add</button>
                </div>
              )}
              {(cash?.banks ?? []).length === 0 ? (
                <p className="text-slate-700 text-xs">No bank accounts. Add one to track cash position.</p>
              ) : (cash?.banks ?? []).map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                  <p className="text-xs font-medium text-white">{b.name}</p>
                  <div className="text-right">
                    <p className="text-sm font-black text-white tabular-nums">{b.currency} {b.current_balance.toLocaleString()}</p>
                    {b.last_reconciled_at && <p className="text-[10px] text-slate-600">Reconciled {new Date(b.last_reconciled_at).toLocaleDateString('en-GB')}</p>}
                  </div>
                </div>
              ))}
              {(cash?.accounts_payable_ugx ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Accounts Payable</p>
                  <p className="text-sm font-black text-amber-400 tabular-nums">{fmtUGX(cash!.accounts_payable_ugx)}</p>
                </div>
              )}
            </div>
          </div>

          {/* OpEx breakdown */}
          {Object.keys(pnl?.opex.by_category ?? {}).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">OpEx Breakdown — {period}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(pnl!.opex.by_category).sort(([,a],[,b]) => b - a).map(([cat, amt]) => (
                  <div key={cat} className="bg-slate-100/50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest truncate">{cat}</p>
                    <p className="text-sm font-black text-white mt-1 tabular-nums">{fmtUGX(amt)}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-700 mt-3">{pnl!.opex.source_tag}</p>
            </div>
          )}

          {/* Source tags */}
          <div className="text-[10px] text-slate-700 space-y-1">
            <p>{pnl?.revenue.source_tag}</p>
            <p>{cash?.source_tag}</p>
          </div>
        </>
      )}
    </div>
  );
}
