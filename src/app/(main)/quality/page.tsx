'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

const THRESHOLDS: Record<string, { min: number; max: number }> = {
  TDS: { min: 0, max: 150 },
  pH: { min: 6.5, max: 8.5 },
  Turbidity: { min: 0, max: 1 },
  Chlorine: { min: 0.2, max: 0.5 },
  Bacteria: { min: 0, max: 0 },
};

export default function QualityPage() {
  const { user } = useAuth();
  const [testForm, setTestForm] = useState({ batch_id: '', test_type: 'TDS', reading: '' });
  const [tests, setTests] = useState<any[]>([]);
  const [passRate, setPassRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadTests(); }, []);

  const loadTests = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('water_tests')
        .select('*')
        .eq('location_id', 'buziga')
        .gte('tested_at', today)
        .order('tested_at', { ascending: false });
      if (error) throw error;
      setTests(data ?? []);
      if (data?.length) {
        const passes = data.filter((t) => t.result === 'PASS').length;
        setPassRate(Math.round((passes / data.length) * 100));
      }
    } catch (err) {
      console.error('Error loading tests:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!testForm.batch_id.trim()) throw new Error('Batch ID is required');
      if (!testForm.reading) throw new Error('Reading is required');

      const threshold = THRESHOLDS[testForm.test_type];
      const reading = parseFloat(testForm.reading);
      const result =
        reading >= threshold.min && reading <= threshold.max ? 'PASS' : 'FAIL';

      const { error: insertError } = await supabase
        .from('water_tests')
        .insert([{
          batch_id: testForm.batch_id,
          test_type: testForm.test_type,
          reading,
          result,
          location_id: 'buziga',
          tested_by: user?.name ?? 'Unknown',
        }]);
      if (insertError) throw insertError;

      setTestForm({ batch_id: '', test_type: 'TDS', reading: '' });
      await loadTests();
    } catch (err: any) {
      setError(err.message ?? 'Error logging test');
    } finally {
      setLoading(false);
    }
  };

  const failCount = tests.filter((t) => t.result === 'FAIL').length;

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-12 flex-wrap gap-4">
        <div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-2">
            Quality Control
          </h2>
          <p className="text-slate-400 font-label text-sm">5 daily UNBS tests — 100% pass rate required</p>
        </div>
        <button
          onClick={() => (document.getElementById('log-test-form') as HTMLElement)?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-primary-container text-on-primary-container px-6 py-2.5 font-label text-sm font-semibold hover:brightness-110 flex items-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-lg">biotech</span>
          Log Water Test
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          {
            label: 'Pass Rate',
            value: `${passRate}`,
            suffix: '%',
            color: passRate === 100 ? 'text-secondary-fixed' : passRate >= 80 ? 'text-primary' : 'text-tertiary',
            ref: 'water_tests, buziga',
          },
          {
            label: 'Tests Today',
            value: tests.length.toString(),
            suffix: '',
            color: 'text-on-surface',
            ref: 'water_tests, buziga',
          },
          {
            label: 'Failures',
            value: failCount.toString(),
            suffix: '',
            color: failCount > 0 ? 'text-tertiary' : 'text-secondary',
            ref: 'water_tests, buziga',
          },
        ].map((m) => (
          <div key={m.label} className="bg-surface-container-low ghost-border p-8">
            <p className="font-label text-[11px] text-slate-500 uppercase tracking-[0.2em] mb-4">{m.label}</p>
            <div className="flex items-baseline gap-1">
              <span className={`font-body text-5xl font-bold ${m.color}`}>{m.value}</span>
              {m.suffix && <span className={`font-body text-xl ${m.color}`}>{m.suffix}</span>}
            </div>
            <p className="mt-4 font-label text-xs text-outline/50">[source: {m.ref}]</p>
          </div>
        ))}
      </div>

      {/* QC Results Table */}
      <div className="mb-12">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-12 h-[1px] bg-primary-container" />
          <h3 className="font-headline text-xl font-bold">Recent Water Quality Logs</h3>
        </div>
        <div className="bg-surface-container-lowest ghost-border overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262a31]/30">
                {['Batch ID', 'Test Type', 'Reading', 'Threshold', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-4 font-label text-[11px] uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-body">
              {tests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-outline/50 font-label text-sm">
                    No tests logged today
                  </td>
                </tr>
              ) : tests.map((t) => {
                const isFail = t.result === 'FAIL';
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-[#262a31]/10 transition-colors ${
                      isFail
                        ? 'bg-tertiary-container/10 border-l-2 border-tertiary-container hover:bg-tertiary-container/20'
                        : 'hover:bg-[#262a31]/20'
                    }`}
                  >
                    <td className={`px-6 py-4 text-sm font-semibold ${isFail ? 'text-error' : ''}`}>
                      {t.batch_id}
                      <span className="ml-2 text-[10px] font-label text-outline/50">[Ref: {t.id}]</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-label text-on-surface-variant">{t.test_type}</td>
                    <td className={`px-6 py-4 text-sm ${isFail ? 'text-error font-bold' : ''}`}>{t.reading}</td>
                    <td className="px-6 py-4 text-sm text-outline/50 font-label">
                      {THRESHOLDS[t.test_type]
                        ? `${THRESHOLDS[t.test_type].min}–${THRESHOLDS[t.test_type].max}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {isFail ? (
                        <span className="bg-tertiary-container text-on-tertiary-container text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                          BLOCKED
                        </span>
                      ) : (
                        <span className="bg-secondary-container text-secondary text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                          PASS
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Test Form */}
      <div id="log-test-form" className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div>
          <div className="flex items-center gap-4 mb-6">
            <span className="w-12 h-[1px] bg-outline-variant" />
            <h3 className="font-headline text-xl font-bold">Log Water Test</h3>
          </div>
          <form onSubmit={handleSubmit} className="bg-surface-container-low ghost-border p-6 space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Batch ID</label>
              <input
                type="text"
                value={testForm.batch_id}
                onChange={(e) => setTestForm({ ...testForm, batch_id: e.target.value })}
                placeholder="e.g., BATCH-001"
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">Test Type</label>
              <select
                value={testForm.test_type}
                onChange={(e) => setTestForm({ ...testForm, test_type: e.target.value })}
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              >
                {Object.keys(THRESHOLDS).map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase text-outline font-label tracking-widest">
                Reading{testForm.test_type && THRESHOLDS[testForm.test_type]
                  ? ` (limit: ${THRESHOLDS[testForm.test_type].max})` : ''}
              </label>
              <input
                type="number"
                step="0.1"
                value={testForm.reading}
                onChange={(e) => setTestForm({ ...testForm, reading: e.target.value })}
                placeholder="Enter value"
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
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
              {loading ? 'Logging...' : 'Log Test'}
            </button>
          </form>
        </div>

        <div className="bg-surface-container-low ghost-border p-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="w-12 h-[1px] bg-outline-variant" />
            <h3 className="font-headline text-xl font-bold">Compliance Checks</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'UNBS Recertification', note: 'Check compliance page for expiry', icon: 'verified_user' },
              { label: 'Daily Microbiological Sample', note: 'Collection at 14:00', icon: 'biotech' },
              { label: 'TDS Calibration Log', note: 'Sensor calibrated weekly', icon: 'tune' },
            ].map((item) => (
              <div key={item.label} className="p-5 bg-surface-container ghost-border flex justify-between items-center">
                <div className="flex gap-4 items-center">
                  <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center">
                    <span className="material-symbols-outlined text-outline">{item.icon}</span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface font-label text-sm">{item.label}</p>
                    <p className="text-xs text-slate-500 font-label">{item.note}</p>
                  </div>
                </div>
                <span className="font-body text-sm text-primary cursor-pointer hover:text-primary/70">VIEW</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
