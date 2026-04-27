'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';
import DeptTeamPanel from '@/components/DeptTeamPanel';
import { useCanEdit } from '@/hooks/useCanEdit';
import { SkeletonRows } from '@/components/SkeletonRows';
import RecentActivity from '@/components/RecentActivity';
import VoiceInputButton from '@/components/VoiceInputButton';
import PhotoCapture from '@/components/PhotoCapture';
import AchievementToast from '@/components/AchievementToast';

const PRODUCT_TYPES = ['20L Refill', '20L Single-Use', '20L Reusable Jar', '5L Single-Use'];

export default function ProductionPage() {
  const { user } = useAuth();
  const { canEdit, isReadOnly } = useCanEdit('production');
  const [formData, setFormData] = useState({
    jar_count: '',
    product_type: '20L Refill',
    notes: '',
  });
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAchievement, setNewAchievement] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editBatch, setEditBatch] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ jar_count: '', notes: '', status: 'created' });
  const [editSaving, setEditSaving] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadBatches();
    channelRef.current = supabase
      .channel('rt:production_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, () => { loadBatches(); })
      .subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') loadBatches(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

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
      const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
      const { count: batchCount } = await supabase
        .from('production_logs')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', 'buziga')
        .eq('production_date', new Date().toISOString().split('T')[0]);
      const seq = String((batchCount ?? 0) + 1).padStart(3, '0');
      const batchId = `BATCH-${today}-${seq}`;

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
          attachments,
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
      setAttachments([]);
      await loadBatches();

      // Check achievements asynchronously — don't block UI
      if (user?.id) {
        fetch('/api/achievements/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_member_id: user.id, member_name: user.name }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.earned?.length) setNewAchievement(d.earned[0]); })
          .catch(() => {});
      }
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
  const hitTarget = jarsToday >= 500;

  return (
    <>
    <AchievementToast achievement={newAchievement} onDismiss={() => setNewAchievement(null)} />
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {isReadOnly && (
        <div className="mb-6 px-4 py-2.5 bg-slate-50 border-l-2 border-outline/30 flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">View only — you are not assigned to this department</span>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
        <div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-2">
            Operations – Production &amp; Quality
          </h2>
          <p className="text-slate-400 text-sm">Plant Authority Ledger // Location: Buziga</p>
        </div>
        <button
          onClick={() => (document.getElementById('log-batch-form') as HTMLElement)?.scrollIntoView({ behavior: 'smooth' })}
          className="rounded-xl text-white px-6 py-2.5 text-sm font-semibold tracking-wide hover:brightness-110 flex items-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-lg">science</span>
          Log New Batch
        </button>
      </div>

      {/* Celebration banner */}
      {hitTarget && (
        <div className="mb-6 p-4 bg-emerald-500/10 border-l-2 border-emerald-500 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest">500-Jar Target Reached!</p>
            <p className="text-xs text-emerald-300/70 mt-0.5">{jarsToday.toLocaleString()} jars filled today — Month 1 target achieved</p>
          </div>
        </div>
      )}

      {/* Halted alert */}
      {haltedCount > 0 && (
        <div className="mb-8 p-4 bg-red-50 border-l-2 border-red-400 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">warning</span>
          <div>
            <p className="text-amber-600 font-body text-[10px] font-bold uppercase tracking-widest">
              {haltedCount} Batch{haltedCount > 1 ? 'es' : ''} Halted — QC Failure
            </p>
            <p className="text-sm text-slate-500 mt-1">
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
            color: jarsToday >= 500 ? 'text-emerald-700-fixed' : 'text-[#0077B6]',
            ref: 'production_logs, buziga',
            icon: 'water_full',
          },
          {
            label: 'Batches Logged',
            value: batches.length.toString(),
            suffix: '',
            color: 'text-white',
            ref: 'production_logs, buziga',
            icon: 'inventory_2',
          },
          {
            label: 'Halted Batches',
            value: haltedCount.toString(),
            suffix: '',
            color: haltedCount > 0 ? 'text-amber-600' : 'text-emerald-700',
            ref: 'production_logs, buziga',
            icon: 'block',
          },
        ].map((m) => (
          <div key={m.label} className="glass-card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-6xl">{m.icon}</span>
            </div>
            <p className="font-label text-[11px] text-slate-500 uppercase tracking-[0.2em] mb-4">{m.label}</p>
            <div className="flex items-baseline gap-2">
              <span className={`font-body text-5xl font-bold ${m.color}`}>{m.value}</span>
              {m.suffix && <span className={`font-body text-xl ${m.color}`}>{m.suffix}</span>}
            </div>
            <p className="mt-4 text-xs text-slate-400/70">[source: {m.ref}]</p>
          </div>
        ))}
      </div>

      {/* Production progress bar */}
      <div className="mb-12 glass-card p-6">
        <div className="flex justify-between text-[10px] text-slate-400 mb-2">
          <span>Daily progress vs 500-jar target</span>
          <span>{jarsToday} / 500</span>
        </div>
        <div className="w-full bg-slate-200 h-2 overflow-hidden">
          <div
            className={`h-full transition-all ${jarsToday >= 500 ? 'bg-secondary' : 'bg-primary'}`}
            style={{ width: `${Math.min((jarsToday / 500) * 100, 100)}%` }}
          />
        </div>
        <p className="text-[10px] text-slate-400/60 mt-2">[source: production_logs, buziga]</p>
      </div>

      {/* Batch Ledger Table */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-12 h-[1px] bg-[#0077B6]" />
          <h3 className="font-headline text-xl font-bold">Today&apos;s Batch Ledger</h3>
        </div>
        <div className="bg-white/60 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262a31]/30">
                  {['Batch ID', 'Product', 'Jars', 'Operator', 'Status', ''].map((h) => (
                    <th key={h} className="px-6 py-4 text-[11px] uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-body">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400/70 text-sm">
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
                          ? 'bg-red-50 border-l-2 border-red-400 hover:bg-amber-100/20'
                          : 'hover:bg-[#262a31]/20'
                      }`}
                      onClick={() => openEdit(b)}
                    >
                      <td className="px-6 py-4 text-sm font-semibold">
                        {b.batch_id}
                        <span className="ml-2 text-[10px] text-slate-400/70">[Ref: {b.id?.slice(0, 6)}]</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{b.product_type}</td>
                      <td className="px-6 py-4 text-sm">{b.jar_count}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{b.operator_name}</td>
                      <td className="px-6 py-4">
                        {isHalted ? (
                          <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-lg font-bold tracking-tighter">
                            HALTED
                          </span>
                        ) : isPassed ? (
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-lg font-bold tracking-tighter">
                            QC PASSED
                          </span>
                        ) : b.status === 'dispatched' ? (
                          <span className="rounded-xl text-white text-[10px] px-2 py-0.5 rounded-lg font-bold tracking-tighter">
                            DISPATCHED
                          </span>
                        ) : (
                          <span className="bg-slate-50 text-slate-500 text-[10px] px-2 py-0.5 rounded-lg font-bold tracking-tighter">
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[#0077B6]">Edit</span>
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
            <span className="w-12 h-[1px] bg-slate-200" />
            <h3 className="font-headline text-xl font-bold">Log New Batch</h3>
          </div>
          <form onSubmit={handleSubmit} className="glass-card-strong p-6 space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Product Type</label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                className="input w-full"
              >
                {PRODUCT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Jar Count</label>
              <input
                type="number"
                value={formData.jar_count}
                onChange={(e) => setFormData({ ...formData, jar_count: e.target.value })}
                placeholder="e.g., 60"
                className="input w-full"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Notes</label>
              <div className="flex gap-2 items-start">
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="input flex-1 resize-none"
                />
                <VoiceInputButton
                  currentValue={formData.notes}
                  onTranscript={(t) => setFormData({ ...formData, notes: t })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Photos</label>
              <PhotoCapture userId={user?.id ?? 'anon'} onUploaded={setAttachments} />
            </div>
            {error && (
              <div className="p-3 bg-red-50 border-l-2 border-red-400 rounded-xl">
                <p className="text-red-600 text-xs font-medium">{error}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-glass w-full py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50 transition-all" style={{ background: "linear-gradient(135deg, #0077B6, #0096C7)", color: "white" }}
            >
              {loading ? 'Logging...' : 'Log Batch'}
            </button>
          </form>
        </div>

        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <p className="font-label text-[10px] text-slate-400 uppercase tracking-widest mb-1">Automation</p>
            <p className="font-headline text-xl font-bold mb-3">What happens on submit</p>
            <div className="space-y-3 text-xs text-slate-300">
              {[
                'production_logs row written (append-only)',
                'batch_created event → Founder Office feed',
                'inventory_items quantity incremented for product type',
                'QC test required before dispatch (Supabase constraint)',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-[#0077B6] font-bold mt-0.5">{i + 1}.</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="mt-6 text-[10px] text-slate-400/60">[source: production_logs, events, inventory_items — buziga]</p>
        </div>
      </div>}

      {/* Edit Batch Modal — founders/assigned only */}
      {canEdit && editBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="modal-glass p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold mb-1">Edit Batch</h2>
            <p className="text-[10px] text-slate-400/70 mb-6">
              [source: production_logs row {editBatch.id?.slice(0, 8)}] · {editBatch.batch_id}
            </p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Jar Count</label>
                <input
                  type="number"
                  value={editForm.jar_count}
                  onChange={(e) => setEditForm({ ...editForm, jar_count: e.target.value })}
                  className="input w-full"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="input w-full"
                >
                  <option value="created">Created</option>
                  <option value="passed">QC Passed</option>
                  <option value="halted">Halted</option>
                  <option value="dispatched">Dispatched</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="input w-full resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditBatch(null)}
                  className="flex-1 py-2 glass-card text-slate-700 text-xs font-bold hover:bg-white/80 rounded-xl transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-50 transition-all" style={{ background: "linear-gradient(135deg, #0077B6, #0096C7)" }}>
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DeptTeamPanel departmentSlug="production" />
      <RecentActivity tables={['production_logs', 'events']} departmentSlug="production" />
    </div>
    </>
  );
}
