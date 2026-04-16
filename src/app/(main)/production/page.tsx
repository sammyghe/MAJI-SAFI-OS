'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

export default function ProductionPage() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    batch_id: '',
    jar_count: '',
    product_type: '20L Refill',
    operator_name: user?.name || '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit to Supabase
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Production</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">Fill jars, log batches, monitor uptime</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Batch ID</label>
              <input
                type="text"
                disabled
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-zinc-400 text-sm font-label"
                placeholder="Auto-generated"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Jar Count</label>
              <input
                type="number"
                value={formData.jar_count}
                onChange={(e) => setFormData({ ...formData, jar_count: e.target.value })}
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
            <button
              type="submit"
              className="w-full py-2 bg-[#0077B6] hover:brightness-110 text-white rounded font-semibold text-sm font-label transition-all"
            >
              Log Batch
            </button>
          </form>
        </div>

        {/* Daily Stats */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Jars Today', value: '0', target: '500' },
              { label: 'Batches', value: '0', target: '' },
              { label: 'Machine Uptime', value: '0%', target: '' },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-zinc-400 text-xs font-label">{stat.label}</p>
                <p className="text-2xl font-bold text-white font-headline">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Recent Logs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 font-headline">Today's Batches</h3>
            <p className="text-zinc-400 text-center font-label">No batches logged yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
