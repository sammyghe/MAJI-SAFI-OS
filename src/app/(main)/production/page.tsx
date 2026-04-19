'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';
import DeptTeamPanel from '@/components/DeptTeamPanel';
import { useCanEdit } from '@/hooks/useCanEdit';
import { SkeletonRows } from '@/components/SkeletonRows';

const PRODUCT_TYPES = ['20L Refill', '20L Single-Use', '20L Reusable Jar', '5L Single-Use'];

export default function ProductionPage() {
  const { user } = useAuth();
  const { canEdit, isReadOnly } = useCanEdit('production');
  const [formData, setFormData] = useState({
    jar_count: '',
    product_type: '20L Refill',
    notes: '',
  });
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editBatch, setEditBatch] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ jar_count: '', notes: '', status: 'created' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadBatches(); }, []);

  const loadBatches = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('production_logs')
        .select('*')
        .eq('location_id', 'buziga')
        .eq('production_date', today)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBatches(data ?? []);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Error loading batches:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!formData.jar_count) throw new Error('Jar count is required');
      const jarCount = parseInt(formData.jar_count);
      const batchId = `BATCH-${Date.now()}`;

      // 1 — Insert production log (DATA — append-only)
      const { error: insertError } = await supabase
        .from('production_logs')
        .insert([{
          batch_id: batchId,
          jar_count: jarCount,
          product_type: formData.product_type,
          operator_name: user?.name ?? 'Unknown',
          location_id: 'buziga',
          notes: formData.notes,
        }]);
      if (insertError) throw insertError;

      // 2 — Fire batch_created event → Founder Office realtime picks this up
      await supabase.from('events').insert([{
        location_id: 'buziga',
        event_type: 'batch_created',
        department: 'production',
        batch_id: batchId,
        severity: 'warning',
        payload: {
          product_type: formData.product_type,
          jar_count: jarCount,
          operator: user?.name ?? 'Unknown',
        },
      }]);

      // 3 — Increment finished-goods inventory for this product_type
      const { data: invRow } = await supabase
        .from('inventory_items')
        .select('id, quantity, reorder_threshold')
        .eq('location_id', 'buziga')
        .eq('item_name', formData.product_type)
        .maybeSingle();

      if (invRow) {
        const newQty = (invRow.quantity ?? 0) + jarCount;
        await supabase
          .from('inventory_items')
          .update({ quantity: newQty, last_updated: new Date().toISOString() })
          .eq('id', invRow.id);
      }

      showToast({
        type: 'success',
        message: `Batch ${batchId} logged — ${jarCount} × ${formData.product_type}. Inventory updated.`,
      });
      setFormData({ jar_count: '', product_type: '20L Refill', notes: '' });
      await loadBatches();
    } catch (err: any) {
      setError(err.message ?? 'Error logging batch');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (batch: any) => {
    setEditBatch(batch);
    setEditForm({ jar_count: batch.jar_count?.toString() ?? '', notes: batch.notes ?? '', status: batch.status ?? 'created' });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBatch) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('production_logs')
        .update({
          jar_count: parseInt(editForm.jar_count),
          notes: editForm.notes,
          status: editForm.status,
        })
        .eq('id', editBatch.id);
      if (error) throw error;
      setEditBatch(null);
      await loadBatches();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Error saving batch:', err);
    } finally {
      setEditSaving(false);
    }
  };

  const jarsToday = batches.reduce((sum, b) => sum + (b.jar_count ?? 0), 0);
  const haltedCount = batches.filter((b) => b.status === 'halted').length;

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {isReadOnly && (
        <div className="mb-6 px-4 py-2.5 bg-surface-container border-l-2 border-outline/30 flex items-center gap-2">
          <span className="text-[10px] font-label text-outline uppercase tracking-widest">View only — you are not assigned to this department</span>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
        <div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-2">
            Operations – Production &amp; Quality
          </h2>
          <p className="text-slate-400 font-label text-sm">Plant Authority Ledger // Location: Buziga</p>
        </div>
        <button
          onClick={() => (document.getElementById('log-batch-form') as HTMLElement)?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-primary-container text-on-primary-container px-6 py-2.5 font-label text-sm font-semibold tracking-wide hover:brightness-110 flex items-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-lg">science</span>
          Log New Batch
        </button>
      </div>

      {/* Halted alert */}
      {haltedCount > 0 && (
        <div className="mb-8 p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">warning</span>
          <div>
            <p className="text-tertiary font-body text-[10px] font-bold uppercase tracking-widest">
              {haltedCount} Batch{haltedCount > 1 ? 'es' : ''} Halted — QC Failure
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              Halted batches cannot be dispatched. QC must sign off before resuming.
            </p>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          {
            label: "Today's Jars Filled",
            value: jarsToday.toString(),
            suffix: '',
            color: jarsToday >= 500 ? 'text-secondary-fixed' : 'text-primary',
            ref: 'production_logs, buziga',
            icon: 'water_full',
          },
          {
            label: 'Batches Logged',
            value: batches.length.toString(),
            suffix: '',
            color: 'text-on-primary-container',
            ref: 'production_logs, buziga',
            icon: 'inventory_2',
          },
          {
            label: 'Halted Batches',
            value: haltedCount.toString(),
            suffix: '',
            color: haltedCount > 0 ? 'text-tertiary' : 'text-secondary',
            ref: 'production_logs, buziga',
            icon: 'block',
          },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-low ghost-border p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-6xl">{m.icon}</span>
            </div>
            <p className="font-label text-[11px] text-slate-500 uppercase tracking-[0.2em] mb-4">{m.label}</p>
            <div className="flex items-baseline gap-2">
              <span className={`font-body text-5xl font-bold ${m.color}`}>{m.value}</span>
              {m.suffix && <span className={`font-body text-xl ${m.color}`}>{m.suffix}</span>}
            </div>
            <p className="mt-4 font-label text-xs text-outline/50">[source: {m.ref}]</p>
          </div>
        ))}
      </div>

      {/* Production progress bar */}
      <div className="mb-12 bg-surface-container-low ghost-border p-6">
        <div className="flex justify-between text-[10px] font-label text-outline mb-2">
          <span>Daily progress vs 500-jar target</span>
          <span>{jarsToday} / 500</span>
        </div>
        <div className="w-full bg-surface-container-highest h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${jarsToday >= 500 ? 'bg-secondary' : 'bg-primary'}`}
            style={{ width: `${Math.min((jarsToday / 500) * 100, 100)}%` }}
          />
        </div>
        <p className="text-[10px] font-label text-outline/40 mt-2">[source: production_logs, buziga]</p>
      </div>

      {/* Batch Ledger Table */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-12 h-[1px] bg-primary-container" />
          <h3 className="font-headline text-xl font-bold">Today&apos;s Batch Ledger</h3>
        </div>
        <div className="bg-surface-container-lowest ghost-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262a31]/30">
                  {['Batch ID', 'Product', 'Jars', 'Operator', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-4 font-label text-[11px] uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-body">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-outline/50 font-label text-sm">
                      No batches logged yet today
                    </td>
                  </tr>
                ) : batches.map((b) => {
                  const isHalted = b.status === 'halted';
                  const isPassed = b.status === 'passed';
                  return (
                    <tr
                      key={b.id}
                      className={`border-b border-[#262a31]/10 transition-colors cursor-pointer ${
                        isHalted
                          ? 'bg-tertiary-container/10 border-l-2 border-tertiary-container hover:bg-tertiary-container/20'
                          : 'hover:bg-[#262a31]/20'
                      }`}
                      onClick={() => openEdit(b)}
                    >
                      <td className="px-6 py-4 text-sm font-semibold">
                        {b.batch_id}
                        <span className="ml-2 text-[10px] font-label text-outline/50">[Ref: {b.id?.slice(0, 6)}]</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-label">{b.product_type}</td>
                      <td className="px-6 py-4 text-sm">{b.jar_count}</td>
                      <td className="px-6 py-4 text-sm text-on-surface-variant font-label">{b.operator_name}</td>
                      <td className="px-6 py-4">
                        {isHalted ? (
                          <span className="bg-tertiary-container text-on-tertiary-container text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                            HALTED
                          </span>
                        ) : isPassed ? (
                          <span className="bg-secondary-container text-secondary text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                            QC PASSED
                          </span>
                        ) : b.status === 'dispatched' ? (
                          <span className="bg-primary-container text-on-primary-container text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                            DISPATCHED
                          </span>
                        ) : (
                          <span className="bg-surface-container text-on-surface-variant text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-label text-primary">Edit</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Batch Form */}
      {canEdit && <div id="log-batch-form" className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <span className="w-12 h-[1px] bg-outline-variant" />
            <h3 className="font-headline text-xl font-bold">Log New Batch</h3>
          </div>
          <form onSubmit={handleSubmit} className="bg-surface-container-low ghost-border p-6 space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Product Type</label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              >
                {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Jar Count</label>
              <input
                type="number"
                value={formData.jar_count}
                onChange={(e) => setFormData({ ...formData, jar_count: e.target.value })}
                placeholder="e.g., 60"
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface resize-none"
              />
            </div>
            {error && (
              <div className="p-3 bg-tertiary-container/10 border-l-2 border-tertiary-container">
                <p className="text-tertiary text-xs font-label">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-container text-on-primary-container font-label text-xs font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {loading ? 'Logging...' : 'Log Batch'}
            </button>
          </form>
        </div>

        <div className="bg-surface-container-low ghost-border p-6 flex flex-col justify-between">
          <div>
            <p className="font-label text-[10px] text-slate-400 uppercase tracking-widest mb-1">Automation</p>
            <p className="font-headline text-xl font-bold mb-3">What happens on submit</p>
            <div className="space-y-3 text-xs text-slate-300 font-label">
              {[
                'production_logs row written (append-only)',
                'batch_created event → Founder Office feed',
                'inventory_items quantity incremented for product type',
                'QC test required before dispatch (Supabase constraint)',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-primary font-bold mt-0.5">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-6 text-[10px] text-outline/40 font-label">[source: production_logs, events, inventory_items — buziga]</p>
        </div>
      </div>}

      {/* Edit Batch Modal — founders/assigned only */}
      {canEdit && editBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold font-headline mb-1">Edit Batch</h2>
            <p className="text-[10px] text-outline/50 font-label mb-6">
              [source: production_logs row {editBatch.id?.slice(0, 8)}] · {editBatch.batch_id}
            </p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Jar Count</label>
                <input
                  type="number"
                  value={editForm.jar_count}
                  onChange={(e) => setEditForm({ ...editForm, jar_count: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  <option value="created">Created</option>
                  <option value="passed">QC Passed</option>
                  <option value="halted">Halted</option>
                  <option value="dispatched">Dispatched</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditBatch(null)}
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
      <DeptTeamPanel departmentSlug="production" />
    </div>
  );
}
