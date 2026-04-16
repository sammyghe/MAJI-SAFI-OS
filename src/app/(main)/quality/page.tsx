'use client';

import { useState } from 'react';

export default function QualityPage() {
  const [testForm, setTestForm] = useState({
    batch_id: '',
    test_type: 'TDS',
    reading: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Submit to Supabase
  };

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Quality Control</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">5 daily UNBS tests, 100% pass rate</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Test Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Batch ID</label>
              <input
                type="text"
                value={testForm.batch_id}
                onChange={(e) => setTestForm({ ...testForm, batch_id: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Test Type</label>
              <select
                value={testForm.test_type}
                onChange={(e) => setTestForm({ ...testForm, test_type: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
              >
                <option>TDS</option>
                <option>pH</option>
                <option>Turbidity</option>
                <option>Chlorine</option>
                <option>Bacteria</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Reading</label>
              <input
                type="text"
                value={testForm.reading}
                onChange={(e) => setTestForm({ ...testForm, reading: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-[#0077B6] hover:brightness-110 text-white rounded font-semibold text-sm font-label transition-all"
            >
              Log Test
            </button>
          </form>
        </div>

        {/* Stats & Results */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Pass Rate', value: '0%', color: 'text-green-400' },
              { label: 'Tests Today', value: '0', color: 'text-blue-400' },
              { label: 'Pending', value: '0', color: 'text-yellow-400' },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-zinc-400 text-xs font-label">{stat.label}</p>
                <p className={`text-2xl font-bold font-headline ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h3 className="text-lg font-bold text-white mb-4 font-headline">Test Results</h3>
            <p className="text-zinc-400 text-center font-label">No tests logged yet</p>
          </div>
        </div>
      </div>
    </div>
  );
}
