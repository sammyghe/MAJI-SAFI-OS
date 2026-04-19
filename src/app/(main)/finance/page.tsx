'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';
import { useCanEdit } from '@/hooks/useCanEdit';

// Ledger row computed from transactions table
interface LedgerRow {
  budgetId: string;   // id of the budget entry row
  category: string;
  budgeted: number;   // amount_ugx where description='__budget__' and transaction_type IS NULL
  spent: number;      // SUM(amount_ugx) where transaction_type='expense'
  period: string;
}

interface CashRow {
  id: string;
  physical_cash_count_ugx: number;
  created_at: string;
}

const CATEGORIES = ['Chemicals', 'Caps', 'Labels', 'Salaries', 'Transport', 'UNBS Fees', 'Utilities', 'Misc'];

function fmtUGX(n: number) {
  return n.toLocaleString();
}

function PctBar({ pct }: { pct: number }) {
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

// Compute period start/end from YYYY-MM string
function periodRange(period: string) {
  const [year, month] = period.split('-');
  const y = parseInt(year);
  const m = parseInt(month);
  const nextM = m === 12 ? 1 : m + 1;
  const nextY = m === 12 ? y + 1 : y;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${year}-${month}-01`,
    end: `${nextY}-${pad(nextM)}-01`,
  };
}

export default function FinancePage() {
  const { user } = useAuth();
  const { canEdit, isReadOnly } = useCanEdit('finance');
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [allTxns, setAllTxns] = useState<any[]>([]);
  const [cash, setCash] = useState<CashRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeForm, setActiveForm] = useState<'budget' | 'expense' | 'cash'>('budget');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [budgetForm, setBudgetForm] = useState({ category: CATEGORIES[0], amount: '' });
  const [expenseForm, setExpenseForm] = useState({ category: CATEGORIES[0], amount: '', description: '' });
  const [cashForm, setCashForm] = useState({ amount: '' });

  // EOD state
  const [showEOD, setShowEOD] = useState(false);
  const [salesTotal, setSalesTotal] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [todayExpenses, setTodayExpenses] = useState(0);
  const [eodReason, setEodReason] = useState('');
  const [eodSaving, setEodSaving] = useState(false);

  const period = new Date().toISOString().slice(0, 7); // YYYY-MM
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const { start, end } = periodRange(period);

      const [{ data: txnData }, { data: cashData }, { data: salesData }] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('location_id', 'buziga')
          .gte('transaction_date', start)
          .lt('transaction_date', end),
        supabase
          .from('daily_cash')
          .select('id, physical_cash_count_ugx, created_at')
          .eq('location_id', 'buziga')
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('sales_ledger')
          .select('amount_ugx')
          .eq('location_id', 'buziga')
          .eq('sale_date', today),
      ]);
      const rev = (salesData ?? []).reduce((s: number, r: any) => s + (r.amount_ugx ?? 0), 0);
      setTodayRevenue(rev);
      const todayTxns = (txnData ?? []).filter((t: any) => t.transaction_type === 'expense' && t.transaction_date === today);
      setTodayExpenses(todayTxns.reduce((s: number, t: any) => s + (t.amount_ugx ?? 0), 0));

      const txns = txnData ?? [];
      setAllTxns(txns);

      // Compute envelope ledger from transactions
      const rows: LedgerRow[] = CATEGORIES.map((cat) => {
        // Budget entry: transaction_type IS NULL + description='__budget__'
        const budgetEntry = txns
          .filter((t) => t.category === cat && t.description === '__budget__' && !t.transaction_type)
          .sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())[0];

        // Expenses: transaction_type='expense'
        const spent = txns
          .filter((t) => t.category === cat && t.transaction_type === 'expense')
          .reduce((sum: number, t: any) => sum + (t.amount_ugx ?? 0), 0);

        return {
          budgetId: budgetEntry?.id ?? '',
          category: cat,
          budgeted: budgetEntry?.amount_ugx ?? 0,
          spent,
          period,
        };
      });

      setLedger(rows);
      setCash(cashData ?? null);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Finance load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesTotal = async () => {
    const { data } = await supabase
      .from('sales_ledger')
      .select('amount_ugx')
      .eq('location_id', 'buziga')
      .eq('sale_date', today);
    setSalesTotal((data ?? []).reduce((s: number, r: any) => s + (r.amount_ugx ?? 0), 0));
  };

  const getRow = (cat: string) => ledger.find((r) => r.category === cat);

  const totalBudgeted = ledger.reduce((s, r) => s + (r.budgeted ?? 0), 0);
  const totalSpent = ledger.reduce((s, r) => s + (r.spent ?? 0), 0);
  const totalRemaining = totalBudgeted - totalSpent;
  const totalPct = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const overBudget = ledger.filter((r) => r.budgeted > 0 && r.spent > r.budgeted);

  // ── Set Monthly Budget ──────────────────────────────────────────────────────
  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!budgetForm.amount || isNaN(Number(budgetForm.amount))) {
      setFormError('Enter a valid amount');
      return;
    }
    setFormSaving(true);
    try {
      const existing = allTxns.find(
        (t) => t.category === budgetForm.category && t.description === '__budget__' && !t.transaction_type
      );
      if (existing) {
        const { error } = await supabase
          .from('transactions')
          .update({ amount_ugx: parseInt(budgetForm.amount) })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('transactions')
          .insert([{
            location_id: 'buziga',
            category: budgetForm.category,
            description: '__budget__',
            amount_ugx: parseInt(budgetForm.amount),
            // transaction_type omitted → NULL (budget allocation marker)
            recorded_by: user?.name ?? 'System',
          }]);
        if (error) throw error;
      }
      await loadData();
      setBudgetForm({ category: CATEGORIES[0], amount: '' });
      showToast({ type: 'success', message: `Budget set: ${budgetForm.category} — UGX ${parseInt(budgetForm.amount).toLocaleString()}` });
    } catch (err: any) {
      setFormError(err.message ?? 'Error saving budget');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Log Expense ─────────────────────────────────────────────────────────────
  const handleLogExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!expenseForm.amount || isNaN(Number(expenseForm.amount))) {
      setFormError('Enter a valid amount');
      return;
    }
    setFormSaving(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert([{
          location_id: 'buziga',
          category: expenseForm.category,
          description: expenseForm.description || expenseForm.category,
          amount_ugx: parseInt(expenseForm.amount),
          transaction_type: 'expense',
          recorded_by: user?.name ?? 'System',
        }]);
      if (error) throw error;
      await loadData();
      setExpenseForm({ category: CATEGORIES[0], amount: '', description: '' });
      showToast({ type: 'success', message: `Expense logged: ${expenseForm.category} — UGX ${parseInt(expenseForm.amount).toLocaleString()}` });
    } catch (err: any) {
      setFormError(err.message ?? 'Error logging expense');
    } finally {
      setFormSaving(false);
    }
  };

  // ── Record Daily Cash ────────────────────────────────────────────────────────
  const handleLogCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!cashForm.amount || isNaN(Number(cashForm.amount))) {
      setFormError('Enter a valid amount');
      return;
    }
    setFormSaving(true);
    try {
      const { error } = await supabase
        .from('daily_cash')
        .insert([{
          physical_cash_count_ugx: parseInt(cashForm.amount),
          location_id: 'buziga',
          date: today,
        }]);
      if (error) throw error;
      await loadData();
      setCashForm({ amount: '' });
      showToast({ type: 'success', message: `Daily cash recorded: UGX ${parseInt(cashForm.amount).toLocaleString()}` });
    } catch (err: any) {
      setFormError(err.message ?? 'Error recording cash');
    } finally {
      setFormSaving(false);
    }
  };

  // ── EOD Close ────────────────────────────────────────────────────────────────
  const openEOD = async () => {
    await loadSalesTotal();
    setEodReason('');
    setShowEOD(true);
  };

  const cashCounted = cash?.physical_cash_count_ugx ?? 0;
  const isMismatch = showEOD && Math.abs(cashCounted - salesTotal) > 0;

  const handleEODClose = async () => {
    if (isMismatch && !eodReason.trim()) return;
    setEodSaving(true);
    try {
      if (isMismatch) {
        const { error } = await supabase.from('finance_overrides').insert([{
          reason: eodReason,
          user_id: user?.id,
          location_id: 'buziga',
          cash_counted: cashCounted,
          cash_expected: salesTotal,
        }]);
        if (error) throw error;
      }
      showToast({ type: 'success', message: 'EOD reconciliation closed. Audit logged.' });
      setShowEOD(false);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message ?? 'Error closing EOD' });
    } finally {
      setEodSaving(false);
    }
  };

  const canOpenEOD = cash !== null;

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {isReadOnly && (
        <div className="mb-6 px-4 py-2.5 bg-surface-container border-l-2 border-outline/30">
          <span className="text-[10px] font-label text-outline uppercase tracking-widest">View only — you are not assigned to this department</span>
        </div>
      )}
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
          <div className="flex flex-col items-end gap-2">
            <span className="text-[10px] text-outline/60 uppercase font-label">Fiscal Status</span>
            <button
              onClick={openEOD}
              disabled={!canOpenEOD}
              className={`px-6 py-3 text-xs font-bold font-label flex items-center gap-2 transition-all ${
                canOpenEOD
                  ? 'bg-primary-container text-on-primary-container hover:brightness-110'
                  : 'bg-surface-container-high text-outline cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{canOpenEOD ? 'task_alt' : 'lock'}</span>
              End of Day Close
            </button>
            {!canOpenEOD && (
              <p className="text-[10px] text-outline/50 font-label">Record daily cash to unlock</p>
            )}
          </div>
        </div>
      </header>

      {/* Over-budget alert */}
      {overBudget.length > 0 && (
        <div className="mb-8 p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">warning</span>
          <div>
            <p className="text-tertiary font-body text-[10px] font-bold uppercase tracking-widest">
              {overBudget.length} envelope{overBudget.length > 1 ? 's' : ''} over budget
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              {overBudget.map((r) => r.category).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Daily P&L Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Today's Revenue", value: todayRevenue, color: 'text-emerald-400', source: 'sales_ledger' },
          { label: "Today's Expenses", value: todayExpenses, color: 'text-red-400', source: 'transactions' },
          {
            label: 'Daily P&L',
            value: todayRevenue - todayExpenses,
            color: (todayRevenue - todayExpenses) >= 0 ? 'text-emerald-400' : 'text-red-400',
            source: 'sales_ledger + transactions',
          },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-low ghost-border px-6 py-5">
            <p className="font-label text-[10px] text-outline uppercase tracking-[0.2em] mb-2">{m.label}</p>
            <p className={`font-body text-2xl font-bold ${m.color}`}>
              {m.value !== 0 ? `UGX ${m.value.toLocaleString()}` : 'No data — enter it.'}
            </p>
            <p className="text-[10px] text-outline/40 font-label mt-1">[source: {m.source}, {today}]</p>
          </div>
        ))}
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Cash Position */}
        <div className="col-span-12 lg:col-span-8 bg-surface-container-low ghost-border p-8 relative overflow-hidden">
          <div className="flex justify-between items-start mb-8 flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-bold text-on-surface-variant font-headline">Cash Position (Today)</h3>
              <p className="text-xs text-outline/70 font-label">
                {cash
                  ? `Recorded ${new Date(cash.created_at).toLocaleDateString()}`
                  : 'No cash recorded today — use Record Daily Cash tab below'}
              </p>
            </div>
            <div className="text-right">
              {cash ? (
                <>
                  <span className="text-2xl font-body font-bold text-primary">
                    {fmtUGX(cash.physical_cash_count_ugx)}
                    <span className="text-xs font-label font-normal opacity-50 ml-1">UGX</span>
                  </span>
                  <p className="text-[10px] text-outline/50 uppercase font-label tracking-widest mt-1">
                    [source: daily_cash row {cash.id?.slice(0, 8)}, {today}]
                  </p>
                </>
              ) : (
                <p className="text-xs text-outline/50 font-label italic">No data — enter it.</p>
              )}
            </div>
          </div>
          {/* Burn bars visual */}
          <div className="h-32 w-full flex items-end gap-1">
            {CATEGORIES.map((cat, i) => {
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
                    <span className="text-[10px] text-outline/50 ml-1">[source: transactions]</span>
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-on-surface-variant font-label">Spent</span>
                  <span className="font-body text-lg">
                    {fmtUGX(totalSpent)}
                    <span className="text-[10px] text-outline/50 ml-1">[source: transactions]</span>
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-t border-outline-variant pt-4 mt-4">
                  <span className="text-sm font-bold text-primary font-label">Remaining</span>
                  <span className={`font-body text-2xl font-bold ${totalRemaining < 0 ? 'text-tertiary' : 'text-primary'}`}>
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
      </div>

      {/* ── Data Entry Row ──────────────────────────────────────────────────── */}
      {canEdit && <div className="mb-8 bg-surface-container-low ghost-border overflow-hidden">
        {/* Tab bar */}
        <div className="flex flex-wrap border-b border-outline-variant/10">
          {[
            { key: 'budget', label: 'Set Monthly Budget', icon: 'account_balance' },
            { key: 'expense', label: 'Log Expense', icon: 'receipt_long' },
            { key: 'cash', label: 'Record Daily Cash', icon: 'payments' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveForm(tab.key as any); setFormError(''); }}
              className={`flex items-center gap-2 px-4 md:px-6 py-4 text-xs font-bold font-label uppercase tracking-widest transition-colors ${
                activeForm === tab.key
                  ? 'border-b-2 border-primary text-primary bg-surface-container'
                  : 'text-outline hover:text-on-surface hover:bg-surface-container-high/20'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-8">
          {/* Set Monthly Budget */}
          {activeForm === 'budget' && (
            <form onSubmit={handleSetBudget} className="max-w-lg">
              <p className="text-xs text-on-surface-variant font-label mb-6 leading-relaxed">
                Set or update the monthly budget for an envelope. If a row exists for this period it will be updated; otherwise a new row is created.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-outline font-label tracking-widest">Category</label>
                  <select
                    value={budgetForm.category}
                    onChange={(e) => setBudgetForm({ ...budgetForm, category: e.target.value })}
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-label py-2 text-on-surface"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-outline font-label tracking-widest">Budgeted Amount (UGX)</label>
                  <input
                    type="number"
                    value={budgetForm.amount}
                    onChange={(e) => setBudgetForm({ ...budgetForm, amount: e.target.value })}
                    placeholder="e.g. 500000"
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-label py-2 text-on-surface"
                  />
                </div>
              </div>
              {formError && <p className="text-tertiary text-xs font-label mb-3">{formError}</p>}
              <button
                type="submit"
                disabled={formSaving}
                className="bg-primary text-on-primary text-xs font-bold px-6 py-3 font-label hover:brightness-110 transition-all disabled:opacity-50"
              >
                {formSaving ? 'Saving...' : 'Set Budget'}
              </button>
            </form>
          )}

          {/* Log Expense */}
          {activeForm === 'expense' && (
            <form onSubmit={handleLogExpense} className="max-w-lg">
              <p className="text-xs text-on-surface-variant font-label mb-6 leading-relaxed">
                Log a spend against an envelope. Each expense is recorded as an individual transaction and added to the category total.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-outline font-label tracking-widest">Category</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-label py-2 text-on-surface"
                  >
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-outline font-label tracking-widest">Amount Spent (UGX)</label>
                  <input
                    type="number"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    placeholder="e.g. 80000"
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-label py-2 text-on-surface"
                  />
                </div>
              </div>
              <div className="space-y-1 mb-4">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Description (optional)</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  placeholder="e.g. Chlorine restock"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              {/* Show current balance if exists */}
              {getRow(expenseForm.category) && (getRow(expenseForm.category)!.budgeted > 0 || getRow(expenseForm.category)!.spent > 0) && (
                <div className="mb-4 px-4 py-3 bg-surface-container-highest text-[10px] font-label text-outline/70">
                  Current: Spent {fmtUGX(getRow(expenseForm.category)!.spent)} / Budgeted {fmtUGX(getRow(expenseForm.category)!.budgeted)} UGX
                  <span className="ml-2 text-outline/40">[source: transactions, {period}]</span>
                </div>
              )}
              {formError && <p className="text-tertiary text-xs font-label mb-3">{formError}</p>}
              <button
                type="submit"
                disabled={formSaving}
                className="bg-primary text-on-primary text-xs font-bold px-6 py-3 font-label hover:brightness-110 transition-all disabled:opacity-50"
              >
                {formSaving ? 'Saving...' : 'Log Expense'}
              </button>
            </form>
          )}

          {/* Record Daily Cash */}
          {activeForm === 'cash' && (
            <form onSubmit={handleLogCash} className="max-w-lg">
              <p className="text-xs text-on-surface-variant font-label mb-6 leading-relaxed">
                Record the physical cash count for today. The latest entry for the current date is used for EOD reconciliation.
              </p>
              {cash && (
                <div className="mb-4 px-4 py-3 bg-surface-container-highest text-[10px] font-label text-outline/70">
                  Last recorded today: UGX {fmtUGX(cash.physical_cash_count_ugx)} at {new Date(cash.created_at).toLocaleTimeString()}
                  <span className="ml-2 text-outline/40">[source: daily_cash row {cash.id?.slice(0, 8)}, {today}]</span>
                </div>
              )}
              <div className="space-y-1 mb-4">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Physical Cash Count (UGX)</label>
                <input
                  type="number"
                  value={cashForm.amount}
                  onChange={(e) => setCashForm({ amount: e.target.value })}
                  placeholder="e.g. 1250000"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              {formError && <p className="text-tertiary text-xs font-label mb-3">{formError}</p>}
              <button
                type="submit"
                disabled={formSaving}
                className="bg-primary text-on-primary text-xs font-bold px-6 py-3 font-label hover:brightness-110 transition-all disabled:opacity-50"
              >
                {formSaving ? 'Saving...' : 'Record Cash'}
              </button>
            </form>
          )}
        </div>
      </div>}

      {/* Envelope Ledger Table */}
      <div className="bg-surface-container-lowest ghost-border overflow-hidden mb-6">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Envelope Ledger Detail</h3>
          <span className="px-2 py-1 bg-surface-container-high text-[10px] font-body text-outline">
            UGX / {period}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                {['Envelope', 'Budgeted (UGX)', 'Spent (UGX)', 'Remaining (UGX)', '% Used'].map((h) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider font-label ${h !== 'Envelope' ? 'text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {CATEGORIES.map((cat) => {
                const row = getRow(cat);
                if (!row || (row.budgeted === 0 && row.spent === 0)) {
                  return (
                    <tr key={cat} className="hover:bg-surface-container-high/30 transition-colors">
                      <td className="px-6 py-4 font-label text-sm">{cat}</td>
                      <td className="px-6 py-4 text-right font-label text-xs text-outline/40 italic" colSpan={4}>
                        No data — enter it.
                        <span className="ml-1 text-[10px]">[source: transactions — no {cat} entry for {period}]</span>
                      </td>
                    </tr>
                  );
                }
                const remaining = row.budgeted - row.spent;
                const pct = row.budgeted > 0 ? (row.spent / row.budgeted) * 100 : 0;
                return (
                  <tr key={cat} className={`hover:bg-surface-container-high/30 transition-colors ${row.spent > row.budgeted && row.budgeted > 0 ? 'border-l-2 border-tertiary-container' : ''}`}>
                    <td className="px-6 py-4 font-label text-sm">{cat}</td>
                    <td className="px-6 py-4 text-right font-body text-sm font-semibold">
                      {row.budgeted > 0 ? fmtUGX(row.budgeted) : '—'}
                      {row.budgetId && <span className="text-[10px] text-outline/40 ml-1">[source: transactions row {row.budgetId?.slice(0, 8)}, {period}]</span>}
                    </td>
                    <td className="px-6 py-4 text-right font-body text-sm">
                      {fmtUGX(row.spent)}
                      <span className="text-[10px] text-outline/40 ml-1">[source: transactions, {period}]</span>
                    </td>
                    <td className={`px-6 py-4 text-right font-body text-sm ${remaining < 0 ? 'text-tertiary font-bold' : ''}`}>
                      {row.budgeted > 0 ? fmtUGX(remaining) : '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.budgeted > 0 ? <PctBar pct={pct} /> : <span className="text-[10px] text-outline/40">—</span>}
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

      <p className="text-[10px] text-outline/40 font-label">
        Anti-hallucination policy: every number above has a source tag. If a source tag reads &quot;no entry found&quot;, the data has not been entered yet.
      </p>

      {/* ── EOD Modal ─────────────────────────────────────────────────────────── */}
      {showEOD && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold font-headline mb-2">EOD Cash Reconciliation</h2>
            <p className="text-xs text-outline/60 font-label mb-6">
              Comparing physical cash count against today&apos;s dispatch total.
            </p>

            <div className="space-y-3 mb-6">
              <div className="bg-surface-container-lowest p-4 ghost-border flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-outline font-label uppercase tracking-widest">Daily Cash (physical count)</p>
                  <p className="text-[10px] text-outline/50 font-label mt-0.5">
                    [source: daily_cash row {cash?.id?.slice(0, 8)}, {today}]
                  </p>
                </div>
                <p className="text-xl font-bold text-primary-container font-body">
                  UGX {fmtUGX(cashCounted)}
                </p>
              </div>
              <div className="bg-surface-container-lowest p-4 ghost-border flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-outline font-label uppercase tracking-widest">System Total (dispatch)</p>
                  <p className="text-[10px] text-outline/50 font-label mt-0.5">[source: sales_ledger, buziga, today]</p>
                </div>
                <p className="text-xl font-bold font-body">
                  UGX {fmtUGX(salesTotal)}
                </p>
              </div>

              <div className={`p-4 flex justify-between items-center ${isMismatch ? 'bg-tertiary-container/10 border-l-2 border-tertiary-container' : 'bg-secondary-container/10 border-l-2 border-secondary'}`}>
                <p className={`text-xs font-bold font-label uppercase tracking-widest ${isMismatch ? 'text-tertiary' : 'text-secondary'}`}>
                  {isMismatch ? `Mismatch — UGX ${fmtUGX(Math.abs(cashCounted - salesTotal))}` : 'Balanced'}
                </p>
                <span className={`material-symbols-outlined ${isMismatch ? 'text-tertiary' : 'text-secondary'}`}>
                  {isMismatch ? 'warning' : 'check_circle'}
                </span>
              </div>
            </div>

            {isMismatch && (
              <div className="mb-5">
                {user?.role === 'founder' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-outline font-label tracking-widest">
                      Force Close Reason (Required for founders)
                    </label>
                    <textarea
                      value={eodReason}
                      onChange={(e) => setEodReason(e.target.value)}
                      rows={2}
                      placeholder="Explain the discrepancy..."
                      className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary focus:ring-0 text-sm font-label py-2 text-on-surface resize-none"
                    />
                    <p className="text-[10px] text-outline/50 font-label">
                      This reason is permanently recorded in the audit log under finance_overrides.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs font-label text-on-surface-variant p-3 bg-surface-container-highest">
                    A founder must be present to force-close a mismatched EOD.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowEOD(false)}
                className="flex-1 py-3 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest"
              >
                Cancel
              </button>
              <button
                onClick={handleEODClose}
                disabled={eodSaving || (isMismatch && (user?.role !== 'founder' || !eodReason.trim()))}
                className="flex-1 py-3 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {eodSaving ? 'Closing...' : isMismatch ? 'Force Close' : 'Confirm Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
