'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';
import DeptTeamPanel from '@/components/DeptTeamPanel';
import { useCanEdit } from '@/hooks/useCanEdit';
import { SkeletonRows } from '@/components/SkeletonRows';
import RecentActivity from '@/components/RecentActivity';

const THRESHOLDS: Record<string, { min: number; max: number }> = {
  TDS:       { min: 0,   max: 150 },
  pH:        { min: 6.5, max: 8.5 },
  Turbidity: { min: 0,   max: 1   },
  Chlorine:  { min: 0.2, max: 0.5 },
  Bacteria:  { min: 0,   max: 0   },
};

export default function QualityPage() {
  const { user } = useAuth();
  const { canEdit, isReadOnly } = useCanEdit('quality');
  const [testForm, setTestForm] = useState({ batch_id: '', test_type: 'TDS', reading: '' });
  const [tests, setTests] = useState<any[]>([]);
  const [passRate, setPassRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadTests();
    channelRef.current = supabase
      .channel('rt:water_tests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_tests' }, () => { loadTests(); })
      .subscribe();
    const onVisible = () => { if (document.visibilityState === 'visible') loadTests(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

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
      if (process.env.NODE_ENV === 'development') console.error('Error loading tests:', err);
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
      const result = reading >= threshold.min && reading <= threshold.max ? 'PASS' : 'FAIL';

      // 1 — Insert water test (append-only per taxonomy rule)
      const { error: insertError } = await supabase
        .from('water_tests')
        .insert([{
          batch_id: testForm.batch_id.trim(),
          test_type: testForm.test_type,
          reading,
          result,
          location_id: 'buziga',
          tested_by: user?.name ?? 'Unknown',
        }]);
      if (insertError) throw insertError;

      // 2 — On PASS: update batch status to 'passed'
      if (result === 'PASS') {
        const { error: passError } = await supabase
          .from('production_logs')
          .update({ status: 'passed' })
          .eq('batch_id', testForm.batch_id.trim())
          .eq('location_id', 'buziga');
        if (passError && process.env.NODE_ENV === 'development') console.error('Batch status update error:', passError);
      }

      // 3 — If FAIL: halt batch + fire critical event
      if (result === 'FAIL') {
        // Halt the batch in production_logs
        const { error: haltError } = await supabase
          .from('production_logs')
          .update({ status: 'halted' })
          .eq('batch_id', testForm.batch_id.trim())
          .eq('location_id', 'buziga');

        if (haltError) {
          if (process.env.NODE_ENV === 'development') console.error('Halt error:', haltError);
        }

        // Fire critical event → Founder Office realtime picks this up
        const { error: eventError } = await supabase
          .from('events')
          .insert([{
            location_id: 'buziga',
            event_type: 'qc_fail',
            department: 'quality',
            batch_id: testForm.batch_id.trim(),
            severity: 'critical',
            payload: {
              test_type: testForm.test_type,
              reading,
              threshold_max: threshold.max,
              threshold_min: threshold.min,
              tested_by: user?.name ?? 'Unknown',
            },
          }]);

        if (eventError) {
          if (process.env.NODE_ENV === 'development') console.error('Event insert error:', eventError);
        }

        showToast({
          type: 'error',
          message: `QC FAIL — ${testForm.test_type} ${reading} (limit: ${threshold.max}). Batch ${testForm.batch_id} halted. Founder alert fired.`,
        });
      } else {
        showToast({ type: 'success', message: `QC PASS — ${testForm.test_type} ${reading}. Batch ${testForm.batch_id} cleared.` });
      }

      setTestForm({ batch_id: '', test_type: 'TDS', reading: '' });
      await loadTests();
    } catch (err: any) {
      setError(err.message ?? 'Error logging test');
    } finally {
      setLoading(false);
    }
  };

  const failCount = tests.filter((t) => t.result === 'FAIL').length;
  const REQUIRED_TESTS = ['TDS', 'pH', 'Turbidity', 'Chlorine', 'Bacteria'];
  const doneTests = REQUIRED_TESTS.filter((type) => tests.some((t) => t.test_type === type));
  const remainingTests = REQUIRED_TESTS.filter((type) => !tests.some((t) => t.test_type === type));

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

      {/* 5-test daily tracker */}
      <div className="mb-8 bg-surface-container-low ghost-border p-5">
        <p className="font-label text-[10px] text-outline uppercase tracking-[0.2em] mb-3">Daily UNBS Test Tracker — {doneTests.length}/5 Complete</p>
        <div className="flex gap-3 flex-wrap">
          {REQUIRED_TESTS.map((type) => {
            const done = doneTests.includes(type);
            const test = tests.find((t) => t.test_type === type);
            const passed = test?.result === 'PASS';
            return (
              <div key={type} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${
                done
                  ? passed ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-surface-container border-outline/20 text-outline/50'
              }`}>
                <span>{done ? (passed ? '✅' : '❌') : '⬜'}</span>
                <span>{type}</span>
              </div>
            );
          })}
        </div>
        {remainingTests.length > 0 && (
          <p className="mt-3 text-[10px] text-outline/50 font-label">Remaining: {remainingTests.join(' · ')}</p>
        )}
        {doneTests.length === 5 && failCount === 0 && (
          <p className="mt-3 text-[10px] text-emerald-400 font-bold">All 5 UNBS tests passed — batch cleared for dispatch.</p>
        )}
      </div>

      {/* Fail alert banner */}
      {failCount > 0 && (
        <div className="mb-8 p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary text-sm mt-0.5">warning</span>
          <div>
            <p className="text-tertiary font-body text-[10px] font-bold uppercase tracking-widest">
              {failCount} QC Failure{failCount > 1 ? 's' : ''} Today — Batches Halted
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              Critical event fired to Founder Office. Batches marked HALTED in production_logs.
            </p>
          </div>
        </div>
      )}

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
          <h3 className="font-headline text-xl font-bold">Water Quality Log — Today</h3>
        </div>
        <div className="bg-surface-container-lowest ghost-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#262a31]/30">
                  {['Batch ID', 'Test Type', 'Reading', 'Threshold', 'Result', 'Tested By'].map((h) => (
                    <th key={h} className="px-6 py-4 font-label text-[11px] uppercase tracking-widest text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="font-body">
                {tests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-outline/50 font-label text-sm">
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
                      <td className={`px-6 py-4 text-sm font-semibold ${isFail ? 'text-tertiary' : ''}`}>
                        {t.batch_id}
                        <span className="ml-2 text-[10px] font-label text-outline/50">[Ref: {t.id?.slice(0, 6)}]</span>
                      </td>
                      <td className="px-6 py-4 text-sm font-label text-on-surface-variant">{t.test_type}</td>
                      <td className={`px-6 py-4 text-sm ${isFail ? 'text-tertiary font-bold' : ''}`}>{t.reading}</td>
                      <td className="px-6 py-4 text-sm text-outline/50 font-label">
                        {THRESHOLDS[t.test_type]
                          ? `${THRESHOLDS[t.test_type].min}–${THRESHOLDS[t.test_type].max}`
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        {isFail ? (
                          <span className="bg-tertiary-container text-on-tertiary-container text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                            FAIL — HALTED
                          </span>
                        ) : (
                          <span className="bg-secondary-container text-secondary text-[10px] px-2 py-0.5 rounded-none font-bold font-label tracking-tighter">
                            PASS
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-label text-on-surface-variant">{t.tested_by ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Log Test Form */}
      {canEdit && <div id="log-test-form" className="grid grid-cols-1 lg:grid-cols-2 gap-10">
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
                Reading
                {testForm.test_type && THRESHOLDS[testForm.test_type]
                  ? ` (pass: ${THRESHOLDS[testForm.test_type].min}–${THRESHOLDS[testForm.test_type].max})` : ''}
              </label>
              <input
                type="number"
                step="0.01"
                value={testForm.reading}
                onChange={(e) => setTestForm({ ...testForm, reading: e.target.value })}
                placeholder="Enter value"
                className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              />
            </div>
            {/* Preview pass/fail */}
            {testForm.reading && THRESHOLDS[testForm.test_type] && (
              <div className={`px-3 py-2 text-[10px] font-label font-bold uppercase ${
                parseFloat(testForm.reading) >= THRESHOLDS[testForm.test_type].min &&
                parseFloat(testForm.reading) <= THRESHOLDS[testForm.test_type].max
                  ? 'bg-secondary-container/20 text-secondary'
                  : 'bg-tertiary-container/20 text-tertiary'
              }`}>
                {parseFloat(testForm.reading) >= THRESHOLDS[testForm.test_type].min &&
                 parseFloat(testForm.reading) <= THRESHOLDS[testForm.test_type].max
                  ? '✓ Will PASS'
                  : '✗ Will FAIL — batch will be halted'}
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
              className="w-full py-3 bg-primary-container text-on-primary-container font-label text-xs font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
            >
              {loading ? 'Logging...' : 'Log Test'}
            </button>
          </form>
        </div>

        <div className="bg-surface-container-low ghost-border p-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="w-12 h-[1px] bg-outline-variant" />
            <h3 className="font-headline text-xl font-bold">UNBS Thresholds</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(THRESHOLDS).map(([name, { min, max }]) => (
              <div key={name} className="flex items-center justify-between p-4 bg-surface-container ghost-border">
                <div>
                  <p className="font-bold text-on-surface font-label text-sm">{name}</p>
                  <p className="text-xs text-slate-500 font-label">UNBS permitted range</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-body font-semibold text-primary">{min} – {max}</p>
                  <p className="text-[10px] font-label text-outline/50">Fail if outside</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-outline/40 font-label">
            On FAIL: batch halted in production_logs + critical event → Founder Office
          </p>
        </div>
      </div>}
      <DeptTeamPanel departmentSlug="quality" />
      <RecentActivity tables={['water_tests', 'events']} departmentSlug="quality" />
    </div>
  );
}
