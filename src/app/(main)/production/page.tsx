'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function ProductionPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    jar_count: '',
    product_type: '20L Refill',
    notes: '',
  });
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      console.error('Error loading batches:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!formData.jar_count) throw new Error('Jar count is required');
      const batchId = `BATCH-${Date.now()}`;
      const { error: insertError } = await supabase
        .from('production_logs')
        .insert([{
          batch_id: batchId,
          jar_count: parseInt(formData.jar_count),
          product_type: formData.product_type,
          operator_name: user?.name ?? 'Unknown',
          location_id: 'buziga',
          notes: formData.notes,
        }]);
      if (insertError) throw insertError;
      setFormData({ jar_count: '', product_type: '20L Refill', notes: '' });
      await loadBatches();
    } catch (err: any) {
      setError(err.message ?? 'Error logging batch');
    } finally {
      setLoading(false);
    }
  };

  const jarsToday = batches.reduce((sum, b) => sum + (b.jar_count ?? 0), 0);
  const uptimePct = 98; // static until machine sensor integration

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
        <div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-2">
            Operations – Production &amp; Quality
          </h2>
          <p className="text-slate-400 font-label text-sm">
            Plant Authority Ledger // Location: Buziga
          </p>
        </div>
        <button
          onClick={() => (document.getElementById('log-batch-form') as HTMLElement)?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-primary-container text-on-primary-container px-6 py-2.5 font-label text-sm font-semibold tracking-wide hover:brightness-110 flex items-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-lg">science</span>
          Log New Batch
        </button>
      </div>

      {/* Metric Bento Grid */}
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
            label: 'Machine Uptime',
            value: uptimePct.toString(),
            suffix: '%',
            color: 'text-secondary',
            ref: 'OEE-DASH-V3',
            icon: 'settings',
          },
          {
            label: 'Batches Logged',
            value: batches.length.toString(),
            suffix: '',
            color: 'text-on-primary-container',
            ref: 'production_logs, buziga',
            icon: 'inventory_2',
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

      {/* Batch Ledger Table */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-12 h-[1px] bg-primary-container" />
          <h3 className="font-headline text-xl font-bold">Today&apos;s Batch Ledger</h3>
        </div>
        <div className="bg-surface-container-lowest ghost-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262a31]/30">
                {['Batch ID', 'Product', 'Jars', 'Operator', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-4 font-label text-[11px] uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-body">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-outline/50 font-label text-sm">
                    No batches logged yet today
                  </td>
                </tr>
              ) : batches.map((b) => (
                <tr key={b.id} className="border-b border-[#262a31]/10 hover:bg-[#262a31]/20 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold">
                    {b.batch_id}
                    <span className="ml-2 text-[10px] font-label text-outline/50">[Ref: {b.id}]</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant font-label">{b.product_type}</td>
                  <td className="px-6 py-4 text-sm">{b.jar_count}</td>
                  <td className="px-6 py-4 text-sm text-on-surface-variant font-label">{b.operator_name}</td>
                  <td className="px-6 py-4">
                    {b.status === 'halted' ? (
                      <span className="bg-tertiary-container text-on-tertiary-container text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                        HALTED
                      </span>
                    ) : (
                      <span className="bg-secondary-container text-secondary text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                        ACTIVE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Batch Form */}
      <div id="log-batch-form" className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <span className="w-12 h-[1px] bg-outline-variant" />
            <h3 className="font-headline text-xl font-bold">Log New Batch</h3>
          </div>
          <form onSubmit={handleSubmit} className="bg-surface-container-low ghost-border p-6 space-y-5">
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
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Product Type</label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              >
                <option>20L Refill</option>
                <option>20L Single-Use</option>
                <option>20L Reusable Jar</option>
                <option>5L Single-Use</option>
              </select>
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

        <div className="bg-surface-container-low ghost-border p-6 flex flex-col justify-end relative overflow-hidden">
          <div className="absolute inset-0 z-0 opacity-10 grayscale brightness-50 bg-gradient-to-br from-primary-container/20 to-surface-container-lowest" />
          <div className="relative z-10">
            <p className="font-label text-[10px] text-slate-400 uppercase tracking-widest mb-1">Facility Authority</p>
            <p className="font-headline text-xl font-bold mb-3">Production Command Centre</p>
            <p className="text-xs text-slate-300 leading-relaxed font-label">
              All batches require QC sign-off before dispatch. A batch cannot be marked dispatched until
              a corresponding water_tests row exists with result = PASS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
