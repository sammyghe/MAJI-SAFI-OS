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

  useEffect(() => {
    loadBatches();
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
      setBatches(data || []);
    } catch (err) {
      console.error('Error loading batches:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.jar_count) {
        throw new Error('Jar count is required');
      }

      const batchId = `BATCH-${Date.now()}`;

      const { error: insertError } = await supabase
        .from('production_logs')
        .insert([
          {
            batch_id: batchId,
            jar_count: parseInt(formData.jar_count),
            product_type: formData.product_type,
            operator_name: user?.name || 'Unknown',
            location_id: 'buziga',
            notes: formData.notes,
          },
        ]);

      if (insertError) throw insertError;

      setFormData({
        jar_count: '',
        product_type: '20L Refill',
        notes: '',
      });

      await loadBatches();
    } catch (err: any) {
      setError(err.message || 'Error logging batch');
    } finally {
      setLoading(false);
    }
  };

  const jarsToday = batches.reduce((sum, b) => sum + (b.jar_count || 0), 0);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Production</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">Fill jars, log batches, monitor uptime</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Jar Count</label>
              <input
                type="number"
                value={formData.jar_count}
                onChange={(e) => setFormData({ ...formData, jar_count: e.target.value })}
                placeholder="e.g., 60"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Product Type</label>
              <select
                value={formData.product_type}
                onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
              >
                <option>20L Refill</option>
                <option>20L Single-Use</option>
                <option>20L Reusable Jar</option>
                <option>5L Single-Use</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
                rows={3}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded">
                <p className="text-red-400 text-xs font-label">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#0077B6] hover:brightness-110 disabled:opacity-50 text-white rounded font-semibold text-sm font-label transition-all"
            >
              {loading ? 'Logging...' : 'Log Batch'}
            </button>
          </form>
        </div>

        {/* Daily Stats */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Jars Today', value: jarsToday.toString(), target: '500' },
              { label: 'Batches', value: batches.length.toString(), target: '' },
              { label: 'Machine Uptime', value: '0%', target: '' },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-zinc-400 text-xs font-label">{stat.label}</p>
                <p className="text-2xl font-bold text-white font-headline">{stat.value}</p>
                {stat.target && <p className="text-xs text-zinc-500 mt-1 font-label">Target: {stat.target}</p>}
              </div>
            ))}
          </div>

          {/* Recent Logs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <h3 className="text-lg font-bold text-white p-4 border-b border-zinc-700 font-headline">Today's Batches</h3>
            {batches.length === 0 ? (
              <p className="text-zinc-400 text-center font-label p-6">No batches logged yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-label">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Batch ID</th>
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Product</th>
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Jars</th>
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => (
                      <tr key={batch.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-white font-mono text-xs">{batch.batch_id}</td>
                        <td className="px-4 py-3 text-zinc-300">{batch.product_type}</td>
                        <td className="px-4 py-3 text-zinc-300">{batch.jar_count}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${batch.status === 'halted' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                            {batch.status === 'halted' ? 'HALTED' : 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
