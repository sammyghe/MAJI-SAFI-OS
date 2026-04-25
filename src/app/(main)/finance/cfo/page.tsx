'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { TrendingUp, DollarSign, Percent, Landmark, Clock, AlertCircle, Plus, RefreshCw } from 'lucide-react';
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
    <div className={`bg-zinc-900 border ${color} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{label}</p>
        <Icon className="w-4 h-4 text-zinc-600" />
      </div>
      <p className="text-2xl font-black text-white tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
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

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-[#0077B6]" /> CFO Dashboard
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Founder + Ema only · Live data</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none">
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={() => load(true)} disabled={refreshing} className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading CFO data…</p>
      ) : (
        <>
          {/* 6 Big KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Revenue MTD" value={fmtUGX(pnl?.revenue.total ?? 0)} sub={`${pnl?.revenue.jars_sold ?? 0} jars`} icon={DollarSign} color="border-emerald-500/20" />
            <MetricCard label="Gross Margin %" value={`${pnl?.net_margin_pct ?? 0}%`} sub={`UGX ${(pnl?.gross_profit ?? 0).toLocaleString()} net`} icon={Percent} color={`${(pnl?.net_margin_pct ?? 0) > 30 ? 'border-emerald-500/20' : 'border-amber-500/20'}`} />
            <MetricCard label="OpEx MTD" value={fmtUGX(pnl?.opex.total ?? 0)} sub="Cash basis" icon={TrendingUp} color="border-zinc-700" />
            <MetricCard label="Cash on Hand" value={fmtUGX(cash?.cash_on_hand_ugx ?? 0)} sub={cash?.banks.length ? `${cash.banks.length} account${cash.banks.length > 1 ? 's' : ''}` : 'No bank accounts'} icon={Landmark} color={`${(cash?.cash_on_hand_ugx ?? 0) < 500000 ? 'border-red-500/20' : 'border-zinc-700'}`} />
            <MetricCard label="Runway" value={cash?.runway_days ? `${cash.runway_days}d` : '—'} sub="At current burn" icon={Clock} color={`${(cash?.runway_days ?? 999) < 30 ? 'border-red-500/20' : 'border-zinc-700'}`} />
            <MetricCard label="Open Issues" value={String(openIssues)} sub="All IDS stages" icon={AlertCircle} color={`${openIssues > 5 ? 'border-amber-500/20' : 'border-zinc-700'}`} />
          </div>

          {/* Product Profit Pool */}
          {(pnl?.products?.length ?? 0) > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Product Contribution Margins</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {pnl!.products.filter(p => p.price_ugx > 0).map(p => (
                  <div key={p.id} className="space-y-2">
                    <p className="text-[10px] font-black text-zinc-400 uppercase truncate">{p.name}</p>
                    <p className="text-lg font-black text-white">{p.margin_pct}%</p>
                    <div className="w-full bg-zinc-800 rounded-full h-2">
                      <div className={`h-2 rounded-full ${p.margin_pct >= 40 ? 'bg-emerald-500' : p.margin_pct >= 20 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(p.margin_pct, 100)}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-600">{fmtUGX(p.contribution_margin)} / unit</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Budget Variances */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">Top Budget Variances</p>
              {topVariances.length === 0 ? (
                <p className="text-zinc-700 text-xs">No budgets set for {period}. <a href="/finance/budgets" className="text-[#7EC8E3]">Add budgets →</a></p>
              ) : topVariances.map(b => (
                <div key={b.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <p className="text-xs text-zinc-300 truncate">{b.account_id.slice(0, 8)}…</p>
                  <div className="flex items-center gap-3">
                    <div className="w-20 bg-zinc-800 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${b.variance_pct >= 100 ? 'bg-red-500' : b.variance_pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(b.variance_pct, 100)}%` }} />
                    </div>
                    <span className={`text-xs font-black tabular-nums ${b.variance_pct >= 100 ? 'text-red-400' : b.variance_pct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{b.variance_pct}%</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bank Accounts + Cash */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Bank Accounts</p>
                <button onClick={() => setShowBankAdd(!showBankAdd)} className="text-[10px] text-[#7EC8E3] font-black flex items-center gap-1 hover:text-white">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
              {showBankAdd && (
                <div className="mb-4 flex gap-2 flex-wrap">
                  <input value={bankForm.name} onChange={e => setBankForm({...bankForm, name: e.target.value})} placeholder="Account name" className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none" />
                  <select value={bankForm.currency} onChange={e => setBankForm({...bankForm, currency: e.target.value})} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="UGX">UGX</option><option value="USD">USD</option>
                  </select>
                  <input value={bankForm.current_balance} onChange={e => setBankForm({...bankForm, current_balance: e.target.value})} type="number" placeholder="Balance" className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                  <button onClick={addBank} className="px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30">Add</button>
                </div>
              )}
              {(cash?.banks ?? []).length === 0 ? (
                <p className="text-zinc-700 text-xs">No bank accounts. Add one to track cash position.</p>
              ) : (cash?.banks ?? []).map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <p className="text-xs font-medium text-white">{b.name}</p>
                  <div className="text-right">
                    <p className="text-sm font-black text-white tabular-nums">{b.currency} {b.current_balance.toLocaleString()}</p>
                    {b.last_reconciled_at && <p className="text-[10px] text-zinc-600">Reconciled {new Date(b.last_reconciled_at).toLocaleDateString('en-GB')}</p>}
                  </div>
                </div>
              ))}
              {(cash?.accounts_payable_ugx ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-zinc-800 flex items-center justify-between">
                  <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Accounts Payable</p>
                  <p className="text-sm font-black text-amber-400 tabular-nums">{fmtUGX(cash!.accounts_payable_ugx)}</p>
                </div>
              )}
            </div>
          </div>

          {/* OpEx breakdown */}
          {Object.keys(pnl?.opex.by_category ?? {}).length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-4">OpEx Breakdown — {period}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(pnl!.opex.by_category).sort(([,a],[,b]) => b - a).map(([cat, amt]) => (
                  <div key={cat} className="bg-zinc-800/50 rounded-xl p-3">
                    <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest truncate">{cat}</p>
                    <p className="text-sm font-black text-white mt-1 tabular-nums">{fmtUGX(amt)}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-700 mt-3">{pnl!.opex.source_tag}</p>
            </div>
          )}

          {/* Source tags */}
          <div className="text-[10px] text-zinc-700 space-y-1">
            <p>{pnl?.revenue.source_tag}</p>
            <p>{cash?.source_tag}</p>
          </div>
        </>
      )}
    </div>
  );
}
