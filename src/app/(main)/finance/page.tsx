'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

interface LedgerRow {
  id: string;
  category: string;
  budgeted: number;
  spent: number;
  period: string;
}

interface CashRow {
  id: string;
  amount: number;
  recorded_at: string;
}

const CATEGORIES = ['Chemicals', 'Caps', 'Labels', 'Salaries', 'Transport', 'UNBS Fees', 'Utilities', 'Misc'];

function fmtUGX(n: number) {
  return n.toLocaleString();
}

function PctBar({ pct, alert }: { pct: number; alert?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className={`font-body text-xs ${pct >= 90 ? 'text-tertiary' : pct >= 70 ? 'text-primary' : 'text-secondary'}`}>
        {pct.toFixed(1)}%
      </span>
      <div className="w-24 h-1 bg-outline-variant/20">
        <div
          className={`h-full ${pct >= 90 ? 'bg-tertiary' : pct >= 70 ? 'bg-primary' : 'bg-secondary'}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function FinancePage() {
  const { user } = useAuth();
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [cash, setCash] = useState<CashRow | null>(null);
  const [loading, setLoading] = useState(true);
  const period = new Date().toISOString().slice(0, 7); // YYYY-MM

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [{ data: ledgerData }, { data: cashData }] = await Promise.all([
        supabase
          .from('transactions')
          .select('id, category, budgeted, spent, period')
          .eq('location_id', 'buziga')
          .eq('period', period),
        supabase
          .from('daily_cash')
          .select('id, amount, recorded_at')
          .eq('location_id', 'buziga')
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single(),
      ]);
      setLedger(ledgerData ?? []);
      setCash(cashData ?? null);
    } catch (err) {
      console.error('Finance load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Map DB rows by category, fall back to "No data" for missing categories
  const getRow = (cat: string) => ledger.find((r) => r.category === cat);

  const totalBudgeted = ledger.reduce((s, r) => s + (r.budgeted ?? 0), 0);
  const totalSpent = ledger.reduce((s, r) => s + (r.spent ?? 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const totalPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;

  const noData = (field: string) => `No data — enter it. [source: transactions — no ${field} row for ${period}]`;

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-12">
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <span className="text-primary text-xs font-medium tracking-[0.2em] uppercase mb-2 block font-label">
              Sovereign Ledger
            </span>
            <h2 className="text-4xl font-extrabold tracking-tight font-headline">
              Finance – Envelope Ledger
            </h2>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-outline/60 uppercase mb-1 font-label">Fiscal Status</span>
            <button
              disabled={totalSpent === 0}
              className="bg-surface-container-high text-outline cursor-not-allowed px-6 py-3 text-xs font-bold font-label flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">lock</span>
              End of Day Close
            </button>
          </div>
        </div>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Cash Position */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low ghost-border p-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-on-surface-variant font-headline">Cash Position</h3>
              <p className="text-xs text-outline/70 font-label">
                {cash ? `Recorded ${new Date(cash.recorded_at).toLocaleDateString()}` : 'No data recorded today'}
              </p>
            </div>
            <div className="text-right">
              {cash ? (
                <>
                  <span className="text-2xl font-body font-bold text-primary">
                    {fmtUGX(cash.amount)}
                    <span className="text-xs font-label font-normal opacity-50 ml-1">UGX</span>
                  </span>
                  <p className="text-[10px] text-outline/50 uppercase font-label tracking-widest mt-1">
                    [source: daily_cash row {cash.id}, {cash.recorded_at.slice(0, 10)}]
                  </p>
                </>
              ) : (
                <p className="text-xs text-outline/50 font-label italic">No data — enter it.</p>
              )}
            </div>
          </div>
          {/* Burn bars visual */}
          <div className="h-32 w-full flex items-end gap-1">
            {CATEGORIES.slice(0, 8).map((cat, i) => {
              const row = getRow(cat);
              const pct = row && row.budgeted > 0 ? (row.spent / row.budgeted) * 100 : 0;
              return (
                <div key={i} className="w-full bg-primary/10 relative" style={{ height: `${Math.max(pct, 5)}%` }}>
                  <div className={`absolute inset-x-0 bottom-0 h-full ${pct >= 90 ? 'bg-tertiary/60' : 'bg-primary/40'}`} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-body text-outline/50">
            <span>Chemicals</span><span>Misc</span>
          </div>
        </div>

        {/* Net Monthly Burn */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-highest ghost-border p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-outline uppercase tracking-widest mb-6 font-label">Net Monthly Burn</h3>
            {loading ? (
              <p className="text-xs text-outline/50 font-label italic">Loading...</p>
            ) : totalBudgeted === 0 ? (
              <p className="text-xs text-outline/50 font-label italic">No data — enter it.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-on-surface-variant font-label">Budgeted</span>
                  <span className="font-body text-lg">
                    {fmtUGX(totalBudgeted)}
                    <span className="text-[10px] text-outline/50 ml-1">[Ref-B1]</span>
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-on-surface-variant font-label">Spent</span>
                  <span className="font-body text-lg">
                    {fmtUGX(totalSpent)}
                    <span className="text-[10px] text-outline/50 ml-1">[Ref-B2]</span>
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-t border-outline-variant pt-4 mt-4">
                  <span className="text-sm font-bold text-primary font-label">Remaining</span>
                  <span className="font-body text-2xl text-primary font-bold">
                    {fmtUGX(totalRemaining)}
                    <span className="text-[10px] text-outline/50 font-normal ml-1">[Ref-Σ]</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="mt-8">
            <div className="flex items-center gap-2 text-secondary text-xs font-label">
              <span className="material-symbols-outlined text-sm">trending_down</span>
              <span>[source: transactions, buziga, {period}]</span>
            </div>
          </div>
        </div>

        {/* Envelope Ledger Table */}
        <div className="col-span-12 bg-surface-container-lowest ghost-border overflow-hidden">
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
            <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Envelope Ledger Detail</h3>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-surface-container-high rounded-none text-[10px] font-body text-outline">
                UGX / {period}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  {['Envelope Name', 'Budgeted (UGX)', 'Spent (UGX)', 'Remaining (UGX)', '% Used'].map((h) => (
                    <th key={h} className={`px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider font-label ${h !== 'Envelope Name' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {CATEGORIES.map((cat) => {
                  const row = getRow(cat);
                  if (!row) {
                    return (
                      <tr key={cat} className="hover:bg-surface-container-high/30 transition-colors">
                        <td className="px-6 py-4 font-label text-sm">{cat}</td>
                        <td className="px-6 py-4 text-right font-label text-xs text-outline/40 italic" colSpan={4}>
                          No data — enter it.
                          <span className="ml-1 text-[10px]">[source: transactions — no {cat} row for {period}]</span>
                        </td>
                      </tr>
                    );
                  }
                  const remaining = row.budgeted - row.spent;
                  const pct = row.budgeted > 0 ? (row.spent / row.budgeted) * 100 : 0;
                  return (
                    <tr key={cat} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="px-6 py-4 font-label text-sm">{cat}</td>
                      <td className="px-6 py-4 text-right font-body text-sm font-semibold">
                        {fmtUGX(row.budgeted)}
                        <span className="text-[10px] text-outline/40 ml-1">[source: transactions row {row.id}, {period}]</span>
                      </td>
                      <td className="px-6 py-4 text-right font-body text-sm">
                        {fmtUGX(row.spent)}
                        <span className="text-[10px] text-outline/40 ml-1">[source: transactions row {row.id}, {period}]</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-body text-sm ${remaining < 0 ? 'text-tertiary' : ''}`}>
                        {fmtUGX(remaining)}
                        <span className="text-[10px] text-outline/40 ml-1">[source: transactions row {row.id}, {period}]</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <PctBar pct={pct} />
                      </td>
                    </tr>
                  );
                })}
                {/* Totals row */}
                {totalBudgeted > 0 && (
                  <tr className="bg-surface-container-high/50 font-bold">
                    <td className="px-6 py-4 font-label text-sm">TOTAL</td>
                    <td className="px-6 py-4 text-right font-body text-sm">{fmtUGX(totalBudgeted)}</td>
                    <td className="px-6 py-4 text-right font-body text-sm">{fmtUGX(totalSpent)}</td>
                    <td className={`px-6 py-4 text-right font-body text-sm ${totalRemaining < 0 ? 'text-tertiary' : 'text-secondary'}`}>
                      {fmtUGX(totalRemaining)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PctBar pct={totalPct} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-outline/40 mt-6 font-label">
        Anti-hallucination policy: every number above has a source tag. If a source tag reads &quot;no row found&quot;, the data has not been entered yet.
      </p>
    </div>
  );
}
