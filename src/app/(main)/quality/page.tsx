'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function QualityPage() {
  const { user } = useAuth();
  const [testForm, setTestForm] = useState({
    batch_id: '',
    test_type: 'TDS',
    reading: '',
  });
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [passRate, setPassRate] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTests();
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

      setTests(data || []);

      // Calculate pass rate
      if (data && data.length > 0) {
        const passCount = data.filter(t => t.result === 'PASS').length;
        setPassRate(Math.round((passCount / data.length) * 100));
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
      if (!testForm.batch_id.trim()) {
        throw new Error('Batch ID is required');
      }
      if (!testForm.reading) {
        throw new Error('Reading is required');
      }

      const thresholds: Record<string, { min: number; max: number }> = {
        TDS: { min: 0, max: 150 },
        pH: { min: 6.5, max: 8.5 },
        Turbidity: { min: 0, max: 1 },
        Chlorine: { min: 0.2, max: 0.5 },
      };

      const threshold = thresholds[testForm.test_type];
      const reading = parseFloat(testForm.reading);
      const result = reading >= threshold.min && reading <= threshold.max ? 'PASS' : 'FAIL';

      // Insert test
      const { error: insertError } = await supabase
        .from('water_tests')
        .insert([
          {
            batch_id: testForm.batch_id,
            test_type: testForm.test_type,
            reading,
            result,
            location_id: 'buziga',
            tested_by: user?.name || 'Unknown',
          },
        ]);

      if (insertError) throw insertError;

      // Reset form
      setTestForm({
        batch_id: '',
        test_type: 'TDS',
        reading: '',
      });

      // Reload tests
      await loadTests();
    } catch (err: any) {
      setError(err.message || 'Error logging test');
    } finally {
      setLoading(false);
    }
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
                placeholder="e.g., BATCH-001"
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
                type="number"
                step="0.1"
                value={testForm.reading}
                onChange={(e) => setTestForm({ ...testForm, reading: e.target.value })}
                placeholder="Enter value"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
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
              {loading ? 'Logging...' : 'Log Test'}
            </button>
          </form>
        </div>

        {/* Stats & Results */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Pass Rate', value: `${passRate}%`, color: passRate === 100 ? 'text-green-400' : passRate >= 80 ? 'text-yellow-400' : 'text-red-400' },
              { label: 'Tests Today', value: tests.length.toString(), color: 'text-blue-400' },
              { label: 'Fails', value: tests.filter(t => t.result === 'FAIL').length.toString(), color: 'text-red-400' },
            ].map((stat, i) => (
              <div key={i} className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
                <p className="text-zinc-400 text-xs font-label">{stat.label}</p>
                <p className={`text-2xl font-bold font-headline ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            <h3 className="text-lg font-bold text-white p-4 border-b border-zinc-700 font-headline">Test Results</h3>
            {tests.length === 0 ? (
              <p className="text-zinc-400 text-center font-label p-6">No tests logged yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm font-label">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Batch ID</th>
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Test Type</th>
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Reading</th>
                      <th className="px-4 py-3 text-left text-zinc-300 font-semibold">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tests.map((test) => (
                      <tr key={test.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                        <td className="px-4 py-3 text-white font-mono text-xs">{test.batch_id}</td>
                        <td className="px-4 py-3 text-zinc-300">{test.test_type}</td>
                        <td className="px-4 py-3 text-zinc-300">{test.reading}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {test.result === 'PASS' ? (
                              <>
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                <span className="text-green-400 font-semibold">PASS</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                                <span className="text-red-400 font-semibold">FAIL</span>
                              </>
                            )}
                          </div>
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
