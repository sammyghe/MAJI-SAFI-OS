'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { PieChart, Plus, X } from 'lucide-react';

interface Account {
  id: string; code: string; name: string;
  account_type: string; expense_phase: string | null;
}

interface Budget {
  id: string; account_id: string; period: string;
  budgeted_amount_ugx: number; actual_amount_ugx: number;
  alert_threshold_pct: number; expense_phase: string | null; notes: string | null;
}

function currentPeriod() { return new Date().toISOString().slice(0, 7); }

function getPct(budgeted: number, actual: number) {
  return budgeted > 0 ? Math.round((actual / budgeted) * 100) : 0;
}

function PctBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function BudgetsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState(currentPeriod());
  const [phase, setPhase] = useState<'all' | 'pre_unbs' | 'ongoing'>('all');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({ budgeted_amount_ugx: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [acctRes, budRes] = await Promise.all([
      supabase.from('chart_of_accounts').select('id, code, name, account_type, expense_phase').eq('active', true).order('code'),
      supabase.from('budgets').select('*').eq('period', period).order('account_id'),
    ]);

    // Compute actual from transactions for this period
    const start = period + '-01';
    const end = new Date(period.split('-')[0] as unknown as number, Number(period.split('-')[1]), 0).toISOString().slice(0, 10);
    const { data: txns } = await supabase.from('transactions').select('account_id, amount_ugx').gte('transaction_date', start).lte('transaction_date', end);

    const actuals = new Map<string, number>();
    for (const t of txns ?? []) {
      if (t.account_id) actuals.set(t.account_id, (actuals.get(t.account_id) ?? 0) + Number(t.amount_ugx));
    }

    const enriched = (budRes.data ?? []).map(b => ({
      ...b,
      actual_amount_ugx: actuals.get(b.account_id) ?? 0,
    }));

    setAccounts(acctRes.data ?? []);
    setBudgets(enriched);
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const saveBudget = async (accountId: string) => {
    if (!addForm.budgeted_amount_ugx) return;
    setSaving(true);
    await supabase.from('budgets').upsert({
      account_id: accountId,
      period,
      budgeted_amount_ugx: Number(addForm.budgeted_amount_ugx),
      notes: addForm.notes || null,
      created_by: user?.name,
    }, { onConflict: 'account_id,period' });
    setSaving(false);
    setAddingFor(null);
    setAddForm({ budgeted_amount_ugx: '', notes: '' });
    load();
  };

  const expenseAccounts = accounts.filter(a => a.account_type === 'expense');
  const filtered = phase === 'all' ? expenseAccounts
    : expenseAccounts.filter(a => a.expense_phase === phase || (!a.expense_phase && phase === 'ongoing'));

  const totalBudgeted = budgets.reduce((s, b) => s + b.budgeted_amount_ugx, 0);
  const totalActual = budgets.reduce((s, b) => s + b.actual_amount_ugx, 0);
  const totalPct = getPct(totalBudgeted, totalActual);

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <PieChart className="w-6 h-6 text-[#0077B6]" /> Budgets
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">Actual Budget pattern · Envelope ledger</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none">
            {periods.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <div className="flex bg-slate-100 border border-slate-200 rounded-lg overflow-hidden text-[10px] font-black uppercase tracking-widest">
            {(['all', 'pre_unbs', 'ongoing'] as const).map(ph => (
              <button key={ph} onClick={() => setPhase(ph)} className={`px-3 py-2 transition-colors ${phase === ph ? 'bg-[#0077B6]/30 text-[#7EC8E3]' : 'text-slate-500 hover:text-slate-300'}`}>
                {ph === 'all' ? 'All' : ph === 'pre_unbs' ? 'Pre-UNBS' : 'Ongoing'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {totalBudgeted > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-white">{period} — Total Budget</p>
            <p className={`text-sm font-black tabular-nums ${totalPct >= 100 ? 'text-red-400' : totalPct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {totalPct}% used
            </p>
          </div>
          <PctBar pct={totalPct} />
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
            <span>Spent: UGX {totalActual.toLocaleString()}</span>
            <span>Budget: UGX {totalBudgeted.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Budget table */}
      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading…</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-white/50">
                <th className="text-left py-3 px-4 text-slate-500 font-black uppercase tracking-widest">Account</th>
                <th className="text-right py-3 px-4 text-slate-500 font-black uppercase tracking-widest">Budgeted</th>
                <th className="text-right py-3 px-4 text-slate-500 font-black uppercase tracking-widest">Spent</th>
                <th className="text-right py-3 px-4 text-slate-500 font-black uppercase tracking-widest">Remaining</th>
                <th className="py-3 px-4 text-slate-500 font-black uppercase tracking-widest min-w-[120px]">% Used</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(acct => {
                const budget = budgets.find(b => b.account_id === acct.id);
                const budgeted = budget?.budgeted_amount_ugx ?? 0;
                const actual = budget?.actual_amount_ugx ?? 0;
                const remaining = budgeted - actual;
                const pct = getPct(budgeted, actual);
                const isAdding = addingFor === acct.id;

                return (
                  <>
                    <tr key={acct.id} className="border-b border-slate-200/40 hover:bg-white/50 group">
                      <td className="py-3 px-4">
                        <p className="font-medium text-white">{acct.name}</p>
                        <p className="text-slate-600 font-mono">{acct.code}{acct.expense_phase ? ` · ${acct.expense_phase}` : ''}</p>
                      </td>
                      <td className="py-3 px-4 text-right font-black tabular-nums text-white">
                        {budgeted > 0 ? budgeted.toLocaleString() : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                        {actual > 0 ? actual.toLocaleString() : <span className="text-slate-700">—</span>}
                      </td>
                      <td className={`py-3 px-4 text-right font-black tabular-nums ${remaining < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {budgeted > 0 ? remaining.toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {budgeted > 0 ? (
                          <div className="space-y-1">
                            <PctBar pct={pct} />
                            <span className={`text-[10px] font-black ${pct >= 100 ? 'text-red-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>{pct}%</span>
                          </div>
                        ) : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => { setAddingFor(isAdding ? null : acct.id); setAddForm({ budgeted_amount_ugx: String(budgeted || ''), notes: '' }); }}
                          className="opacity-0 group-hover:opacity-100 text-[10px] text-[#7EC8E3] font-black hover:text-white flex items-center gap-1 transition-opacity">
                          <Plus className="w-3 h-3" /> {budget ? 'Edit' : 'Set'}
                        </button>
                      </td>
                    </tr>
                    {isAdding && (
                      <tr key={`${acct.id}-edit`} className="border-b border-slate-200">
                        <td colSpan={6} className="px-4 py-3 bg-[#0077B6]/5">
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">UGX</span>
                              <input value={addForm.budgeted_amount_ugx} onChange={e => setAddForm({...addForm, budgeted_amount_ugx: e.target.value})} type="number" placeholder="Budget amount" className="w-36 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#0077B6]/50" autoFocus />
                            </div>
                            <input value={addForm.notes} onChange={e => setAddForm({...addForm, notes: e.target.value})} placeholder="Notes (optional)" className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                            <button onClick={() => saveBudget(acct.id)} disabled={saving} className="px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30 disabled:opacity-40">{saving ? '…' : 'Save'}</button>
                            <button onClick={() => setAddingFor(null)}><X className="w-4 h-4 text-slate-500" /></button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-slate-700 text-xs">No expense accounts found. Add accounts first in Chart of Accounts.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
