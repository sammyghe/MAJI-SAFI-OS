'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { BarChart2, Download } from 'lucide-react';
import { formatMoney } from '@/lib/currency';

interface PnL {
  period: string;
  revenue: { total: number; jars_sold: number };
  opex: { total: number; by_category: Record<string, number> };
  gross_profit: number;
  net_margin_pct: number;
  products: Array<{ id: string; sku: string; name: string; price_ugx: number; cogs_ugx: number; contribution_margin: number; margin_pct: number }>;
}

function Row({ label, value, sub, indent = 0, bold = false, color = 'text-white' }: {
  label: string; value: number | null; sub?: string; indent?: number; bold?: boolean; color?: string;
}) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-slate-200/50 last:border-0`} style={{ paddingLeft: `${16 + indent * 24}px` }}>
      <div>
        <p className={`text-sm ${bold ? 'font-black text-white' : 'font-medium text-slate-300'}`}>{label}</p>
        {sub && <p className="text-[10px] text-slate-600">{sub}</p>}
      </div>
      <p className={`text-sm font-black tabular-nums ${color} ${bold ? 'text-lg' : ''}`}>
        {value !== null ? formatMoney(value, { compact: true }) : '—'}
      </p>
    </div>
  );
}

export default function PnLPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [pnl, setPnl] = useState<PnL | null>(null);
  const [loading, setLoading] = useState(true);

  const periods = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/pnl?period=${period}`);
    const data = await res.json();
    setPnl(data);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    if (!pnl) return;
    const rows = [
      ['Category', 'Amount UGX'],
      ['Revenue', pnl.revenue.total],
      ...Object.entries(pnl.opex.by_category).map(([k, v]) => [`OpEx - ${k}`, -v]),
      ['Gross Profit', pnl.gross_profit],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `pnl-${period}.csv`; a.click();
  };

  return (
    <div className="px-6 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-[#0077B6]" /> P&L Statement
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">Cash basis · Every number sourced</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none">
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-400 hover:text-white">
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Computing P&L…</p>
      ) : !pnl ? (
        <p className="text-slate-600 text-sm">No data for {period}.</p>
      ) : (
        <div className="space-y-4">
          {/* Revenue */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-emerald-500/5 border-b border-emerald-500/10">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Revenue</p>
            </div>
            <Row label="Gross Revenue" value={pnl.revenue.total} bold color="text-emerald-400" sub={`${pnl.revenue.jars_sold} jars sold [source: sales_ledger, ${period}]`} />
          </div>

          {/* OpEx */}
          {Object.keys(pnl.opex.by_category).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10">
                <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">Operating Expenses</p>
              </div>
              {Object.entries(pnl.opex.by_category).sort(([,a],[,b]) => b - a).map(([cat, amt]) => (
                <Row key={cat} label={cat} value={amt} indent={1} color="text-amber-400" />
              ))}
              <Row label="Total OpEx" value={pnl.opex.total} bold color="text-amber-400" sub={`[source: transactions, ${period}]`} />
            </div>
          )}

          {/* Net */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <Row label="Gross Profit" value={pnl.gross_profit} bold color={pnl.gross_profit >= 0 ? 'text-emerald-400' : 'text-red-400'} />
            <div className="px-4 py-3 flex items-center justify-between border-t border-slate-200">
              <p className="text-sm text-slate-500">Net Margin</p>
              <p className={`text-2xl font-black ${pnl.net_margin_pct >= 20 ? 'text-emerald-400' : pnl.net_margin_pct >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{pnl.net_margin_pct}%</p>
            </div>
          </div>

          {/* Product breakdown */}
          {pnl.products.filter(p => p.price_ugx > 0).length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 bg-[#0077B6]/5 border-b border-[#0077B6]/10">
                <p className="text-[10px] font-black text-[#7EC8E3] uppercase tracking-[0.2em]">Contribution Margin by Product (from unit economics)</p>
              </div>
              {pnl.products.filter(p => p.price_ugx > 0).map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-slate-200/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-600">{p.sku} · Price {formatMoney(p.price_ugx, {compact:true})} · COGS {formatMoney(p.cogs_ugx, {compact:true})}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black tabular-nums ${p.margin_pct >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>{p.margin_pct}%</p>
                    <p className="text-[10px] text-slate-600">{formatMoney(p.contribution_margin, {compact:true})} / unit</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
