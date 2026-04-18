'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';

// T1 wholesale pricing per CLAUDE.md section 11
const T1_PRICES: Record<string, number> = {
  '20L Refill':       3000,
  '20L Single-Use':   7500,
  '20L Reusable Jar': 15000,
  '5L Single-Use':    2800,
};

const PRODUCT_TYPES = Object.keys(T1_PRICES);

export default function DispatchPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    distributor: '',
    product_type: '20L Refill',
    jars: '',
    amount_ugx: '',
  });
  const [cashState, setCashState] = useState({
    systemTotal: 0,
    countedAmount: '0',
    mismatched: false,
    forceCloseReason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEOD, setShowEOD] = useState(false);
  const [editSale, setEditSale] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ distributor: '', product_type: '20L Refill', jars_sold: '', amount_ugx: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [stockWarning, setStockWarning] = useState('');

  useEffect(() => { loadSales(); }, []);

  const loadSales = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sales_ledger')
        .select('*')
        .eq('location_id', 'buziga')
        .eq('sale_date', today)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSales(data ?? []);
      const total = (data ?? []).reduce((sum, s) => sum + (s.amount_ugx ?? 0), 0);
      setCashState((prev) => ({ ...prev, systemTotal: total }));
    } catch (err) {
      console.error('Error loading sales:', err);
    }
  };

  // Auto-compute amount when jars or product_type changes
  const handleJarsOrTypeChange = (jars: string, productType: string) => {
    const jarNum = parseInt(jars);
    if (jarNum > 0 && T1_PRICES[productType]) {
      setFormData((prev) => ({
        ...prev,
        jars,
        product_type: productType,
        amount_ugx: (jarNum * T1_PRICES[productType]).toString(),
      }));
    } else {
      setFormData((prev) => ({ ...prev, jars, product_type: productType }));
    }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStockWarning('');
    setLoading(true);
    try {
      if (!formData.distributor || !formData.jars || !formData.amount_ugx) throw new Error('All fields required');
      const jarsSold = parseInt(formData.jars);

      // Check available stock before sale
      const { data: invRow } = await supabase
        .from('inventory_items')
        .select('id, quantity, reorder_threshold, unit')
        .eq('location_id', 'buziga')
        .eq('item_name', formData.product_type)
        .maybeSingle();

      let stockShortfall = false;
      if (invRow && (invRow.quantity ?? 0) < jarsSold) {
        stockShortfall = true;
        setStockWarning(
          `⚠ Stock warning: only ${invRow.quantity} ${invRow.unit} available, selling ${jarsSold}. Sale logged but discrepancy flagged.`
        );
      }

      // Insert sale (DATA — append-only per taxonomy)
      const { error: insertError } = await supabase.from('sales_ledger').insert([{
        distributor: formData.distributor,
        jars_sold: jarsSold,
        amount_ugx: parseInt(formData.amount_ugx),
        product_type: formData.product_type,
        location_id: 'buziga',
        logged_by: user?.name ?? 'Unknown',
      }]);
      if (insertError) throw insertError;

      // Decrement inventory
      if (invRow) {
        const newQty = Math.max(0, (invRow.quantity ?? 0) - jarsSold);
        await supabase
          .from('inventory_items')
          .update({ quantity: newQty, last_updated: new Date().toISOString() })
          .eq('id', invRow.id);

        // Fire reorder event if stock drops to or below threshold
        if (newQty <= invRow.reorder_threshold) {
          await supabase.from('events').insert([{
            location_id: 'buziga',
            event_type: 'reorder_required',
            department: 'inventory',
            severity: 'warning',
            payload: {
              items: [{ id: invRow.id, name: formData.product_type, quantity: newQty, threshold: invRow.reorder_threshold, unit: invRow.unit }],
              count: 1,
              triggered_by: 'dispatch',
            },
          }]);
        }

        // Fire discrepancy event if stock was insufficient
        if (stockShortfall) {
          await supabase.from('events').insert([{
            location_id: 'buziga',
            event_type: 'stock_discrepancy',
            department: 'dispatch',
            severity: 'warning',
            payload: {
              product_type: formData.product_type,
              sold: jarsSold,
              available: invRow.quantity,
              shortfall: jarsSold - (invRow.quantity ?? 0),
              logged_by: user?.name ?? 'Unknown',
            },
          }]);
        }
      }

      showToast({
        type: stockShortfall ? 'info' : 'success',
        message: stockShortfall
          ? `Sale logged with stock shortfall. Discrepancy event fired.`
          : `Sale logged — ${jarsSold} × ${formData.product_type} @ ${parseInt(formData.amount_ugx).toLocaleString()} UGX.`,
      });

      setFormData({ distributor: '', product_type: '20L Refill', jars: '', amount_ugx: '' });
      await loadSales();
    } catch (err: any) {
      setError(err.message ?? 'Error logging sale');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (sale: any) => {
    setEditSale(sale);
    setEditForm({
      distributor: sale.distributor,
      product_type: sale.product_type ?? '20L Refill',
      jars_sold: sale.jars_sold?.toString() ?? '',
      amount_ugx: sale.amount_ugx?.toString() ?? '',
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSale) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('sales_ledger')
        .update({
          distributor: editForm.distributor,
          product_type: editForm.product_type,
          jars_sold: parseInt(editForm.jars_sold),
          amount_ugx: parseInt(editForm.amount_ugx),
        })
        .eq('id', editSale.id);
      if (error) throw error;
      setEditSale(null);
      await loadSales();
    } catch (err) {
      console.error('Error updating sale:', err);
    } finally {
      setEditSaving(false);
    }
  };

  const handleEODCheck = () => {
    const counted = parseInt(cashState.countedAmount) || 0;
    setCashState((prev) => ({ ...prev, mismatched: Math.abs(counted - prev.systemTotal) > 0 }));
  };

  const handleEODClose = async () => {
    if (cashState.mismatched && !cashState.forceCloseReason) {
      setError('Force close requires a reason');
      return;
    }
    try {
      if (cashState.mismatched) {
        await supabase.from('finance_overrides').insert([{
          reason: cashState.forceCloseReason,
          user_id: user?.id,
          location_id: 'buziga',
        }]);
      }
      showToast({ type: 'success', message: 'EOD reconciliation closed. Cash audit logged.' });
      setShowEOD(false);
      setCashState((prev) => ({ ...prev, countedAmount: '0', forceCloseReason: '', mismatched: false }));
    } catch {
      setError('Error closing EOD');
    }
  };

  const jarsDispatched = sales.reduce((sum, s) => sum + (s.jars_sold ?? 0), 0);
  const uniqueDistributors = new Set(sales.map((s) => s.distributor)).size;

  // T1 unit price for current form selection
  const unitPrice = T1_PRICES[formData.product_type] ?? 0;

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {/* Header + Hero Stat */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-12">
        <div>
          <div className="flex items-center gap-2 text-outline mb-2">
            <span className="text-[10px] tracking-widest uppercase font-label">Commercial Ledger</span>
            <span className="w-8 h-[1px] bg-outline-variant/30" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
            Dispatch – Sales &amp; Cash
          </h1>
        </div>
        <div className="bg-surface-container-low p-6 border-l-4 border-primary-container min-w-[260px]">
          <p className="text-xs text-outline font-label mb-1">Total Cash Today</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-body font-semibold text-primary">
              {cashState.systemTotal.toLocaleString()}
            </span>
            <span className="text-xs font-body text-outline/50">
              UGX <span className="ml-1">[source: sales_ledger, buziga]</span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Jars Dispatched', value: jarsDispatched.toString(), ref: 'sales_ledger' },
          { label: 'Distributors', value: uniqueDistributors.toString(), ref: 'sales_ledger' },
          { label: 'Cash Collected', value: `${cashState.systemTotal.toLocaleString()} UGX`, ref: 'sales_ledger' },
          { label: 'Cash Mismatch', value: cashState.mismatched ? 'YES' : 'NONE', ref: 'finance_overrides', alert: cashState.mismatched },
        ].map((stat) => (
          <div key={stat.label} className={`bg-surface-container-low ghost-border p-5 ${(stat as any).alert ? 'border-l-2 border-tertiary-container' : ''}`}>
            <p className="text-[10px] text-outline font-label uppercase tracking-widest mb-2">{stat.label}</p>
            <p className={`text-2xl font-body font-bold ${(stat as any).alert ? 'text-tertiary' : 'text-on-surface'}`}>
              {stat.value}
            </p>
            <p className="text-[10px] text-outline/40 font-label mt-1">[source: {stat.ref}]</p>
          </div>
        ))}
      </div>

      {/* Distribution Table */}
      <div className="bg-surface-container-low border border-outline-variant/10 overflow-hidden mb-8">
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container">
          <h3 className="font-headline font-bold text-lg">Active Distribution Ledger</h3>
          <span className="text-[10px] font-body text-outline/50 uppercase tracking-widest">
            {new Date().toLocaleDateString()}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest">
                {['Distributor', 'Product', 'Jars Sold', 'Cash (UGX)', 'Time', 'Logged By', ''].map((h) => (
                  <th key={h} className="px-5 py-4 text-[10px] font-label text-outline uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-outline/50 font-label text-sm">
                    No sales logged yet today
                  </td>
                </tr>
              ) : sales.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container-high/50 transition-colors cursor-pointer" onClick={() => openEdit(s)}>
                  <td className="px-5 py-4 text-sm font-medium">{s.distributor}</td>
                  <td className="px-5 py-4 text-xs font-label text-on-surface-variant">{s.product_type ?? '—'}</td>
                  <td className="px-5 py-4 text-sm font-body">{s.jars_sold}</td>
                  <td className="px-5 py-4 text-right font-body font-semibold text-secondary">
                    {s.amount_ugx?.toLocaleString()}
                    <span className="text-[10px] text-outline/40 font-label ml-1">[Ref: {s.id?.slice(0, 6)}]</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-body text-outline/70">
                    {new Date(s.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-4 text-sm font-label text-on-surface-variant">{s.logged_by}</td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-label text-primary">Edit</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 mb-8">
        {/* Log Sale Form */}
        <div className="col-span-12 lg:col-span-7 bg-surface-container ghost-border p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <span className="material-symbols-outlined text-9xl">payments</span>
          </div>
          <h4 className="font-headline font-bold text-xl mb-6">Log Sale</h4>
          <form onSubmit={handleAddSale} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Distributor Name</label>
              <input
                type="text"
                value={formData.distributor}
                onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                placeholder="e.g. Buziga Distributors"
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Product Type</label>
                <select
                  value={formData.product_type}
                  onChange={(e) => handleJarsOrTypeChange(formData.jars, e.target.value)}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <p className="text-[10px] text-outline/50 font-label">
                  T1 unit price: {unitPrice.toLocaleString()} UGX
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Jars Sold</label>
                <input
                  type="number"
                  value={formData.jars}
                  onChange={(e) => handleJarsOrTypeChange(e.target.value, formData.product_type)}
                  placeholder="e.g., 50"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Amount Collected (UGX)</label>
              <input
                type="number"
                value={formData.amount_ugx}
                onChange={(e) => setFormData({ ...formData, amount_ugx: e.target.value })}
                placeholder="Auto-filled from T1 price × jars"
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              />
              {formData.jars && formData.amount_ugx && (
                <p className="text-[10px] text-outline/50 font-label">
                  T1 expected: {(parseInt(formData.jars) * unitPrice).toLocaleString()} UGX
                  {parseInt(formData.amount_ugx) !== parseInt(formData.jars) * unitPrice && (
                    <span className="ml-1 text-primary"> (custom price entered)</span>
                  )}
                </p>
              )}
            </div>
            {stockWarning && (
              <div className="p-3 bg-primary-container/10 border-l-2 border-primary-container">
                <p className="text-primary text-xs font-label">{stockWarning}</p>
              </div>
            )}
            {error && (
              <div className="p-3 bg-tertiary-container/10 border-l-2 border-tertiary-container">
                <p className="text-tertiary text-xs font-label">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-primary text-on-primary font-bold text-xs py-3 font-label transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Logging...' : 'Record Sale'}
            </button>
          </form>
        </div>

        {/* EOD Panel */}
        <div className="col-span-12 lg:col-span-5 grid grid-rows-2 gap-6">
          <div className="bg-secondary-container/10 p-6 border border-secondary/20">
            <div className="flex justify-between items-start mb-4">
              <span className="text-secondary-fixed material-symbols-outlined">analytics</span>
              <span className="rounded-none bg-secondary-container px-2 py-0.5 text-[10px] font-bold text-secondary uppercase font-label">Today</span>
            </div>
            <p className="text-on-surface-variant text-sm font-label mb-1">Revenue vs Target</p>
            <h5 className="text-3xl font-body font-bold text-secondary">{jarsDispatched} / 500</h5>
            <p className="text-[10px] text-outline/50 mt-2 font-label">[source: sales_ledger, buziga]</p>
          </div>
          <div className="bg-surface-container-low p-6 ghost-border flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-outline uppercase tracking-widest font-label mb-2">End of Day Close</p>
              <p className="text-xs text-on-surface-variant font-label leading-relaxed">
                Close the day by reconciling physical cash against system total. Only founders can force-close a mismatch.
              </p>
            </div>
            <button
              onClick={() => setShowEOD(true)}
              className="mt-4 bg-primary-container text-on-primary-container text-xs font-bold px-4 py-3 font-label hover:brightness-110 transition-all"
            >
              Open EOD Reconciliation
            </button>
          </div>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {editSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold font-headline mb-1">Edit Sale</h2>
            <p className="text-[10px] text-outline/50 font-label mb-6">[source: sales_ledger row {editSale.id?.slice(0, 8)}]</p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Distributor</label>
                <input
                  type="text"
                  value={editForm.distributor}
                  onChange={(e) => setEditForm({ ...editForm, distributor: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Product Type</label>
                <select
                  value={editForm.product_type}
                  onChange={(e) => setEditForm({ ...editForm, product_type: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Jars Sold</label>
                <input
                  type="number"
                  value={editForm.jars_sold}
                  onChange={(e) => setEditForm({ ...editForm, jars_sold: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Amount (UGX)</label>
                <input
                  type="number"
                  value={editForm.amount_ugx}
                  onChange={(e) => setEditForm({ ...editForm, amount_ugx: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditSale(null)}
                  className="flex-1 py-2 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EOD Modal */}
      {showEOD && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold font-headline mb-6">EOD Cash Reconciliation</h2>
            <div className="bg-surface-container-lowest p-4 mb-5 ghost-border">
              <p className="text-[10px] text-outline font-label uppercase tracking-widest mb-1">System Total</p>
              <p className="text-2xl font-bold text-primary-container font-body">UGX {cashState.systemTotal.toLocaleString()}</p>
              <p className="text-[10px] text-outline/50 font-label mt-1">[source: sales_ledger, buziga]</p>
            </div>
            <div className="space-y-1 mb-5">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Physical Count (UGX)</label>
              <input
                type="number"
                value={cashState.countedAmount}
                onChange={(e) => setCashState({ ...cashState, countedAmount: e.target.value })}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              />
            </div>
            <button onClick={handleEODCheck}
              className="w-full py-2 bg-surface-container-high text-on-surface text-xs font-bold font-label mb-4 hover:bg-surface-container-highest transition-colors">
              Check Mismatch
            </button>
            {cashState.mismatched && (
              <div className="mb-4 p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container">
                <p className="text-tertiary-container font-body text-[10px] font-bold uppercase tracking-widest mb-2">
                  Cash Mismatch — UGX {Math.abs(parseInt(cashState.countedAmount) - cashState.systemTotal).toLocaleString()}
                </p>
                {user?.role === 'founder' ? (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-outline font-label tracking-widest">Force Close Reason (Required)</label>
                    <textarea
                      value={cashState.forceCloseReason}
                      onChange={(e) => setCashState({ ...cashState, forceCloseReason: e.target.value })}
                      rows={2}
                      placeholder="Explain the discrepancy..."
                      className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface resize-none"
                    />
                  </div>
                ) : (
                  <p className="text-xs font-label text-on-surface-variant">A founder must be present to force-close a mismatched EOD.</p>
                )}
              </div>
            )}
            <div className="flex gap-3 mt-2">
              <button onClick={() => setShowEOD(false)}
                className="flex-1 py-2 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest">
                Cancel
              </button>
              <button
                onClick={handleEODClose}
                disabled={cashState.mismatched && !cashState.forceCloseReason}
                className="flex-1 py-2 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50">
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
