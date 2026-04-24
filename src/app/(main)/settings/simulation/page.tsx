'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { RefreshCw, Play, Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

const TABLE_LABELS: Record<string, string> = {
  production_logs: 'Production Logs',
  water_tests: 'Water Tests',
  sales_ledger: 'Sales Ledger',
  daily_cash: 'Daily Cash',
  distributors: 'Distributors',
  events: 'Events',
  capa_records: 'CAPA Records',
};

export default function SimulationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [simState, setSimState] = useState<{ is_active: boolean; activated_at?: string; row_counts: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'founder') router.push('/settings');
    loadState();
  }, [user]);

  const loadState = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('simulation_settings')
      .select('is_active, activated_at, row_counts')
      .eq('location_id', 'buziga')
      .maybeSingle();
    setSimState(data ?? { is_active: false, row_counts: {} });
    setLoading(false);
  };

  const handlePopulate = async () => {
    setPopulating(true);
    setResult(null);
    try {
      const res = await fetch('/api/simulation/populate', {
        method: 'POST',
        headers: { 'x-user-role': user?.role ?? '' },
      });
      const data = await res.json();
      if (data.ok) {
        setResult(`✅ Populated: ${Object.entries(data.counts).map(([k, v]) => `${TABLE_LABELS[k] ?? k}: ${v}`).join(' · ')}`);
        await loadState();
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setResult('❌ Connection error');
    }
    setPopulating(false);
  };

  const handleClear = async () => {
    setClearing(true);
    setResult(null);
    try {
      const res = await fetch('/api/simulation/clear', {
        method: 'POST',
        headers: { 'x-user-role': user?.role ?? '' },
      });
      const data = await res.json();
      if (data.ok) {
        const total = Object.values(data.deleted).reduce((s: number, n) => s + (n as number), 0);
        setResult(`✅ Cleared ${total.toLocaleString()} simulated rows. Real data untouched.`);
        await loadState();
      } else {
        setResult(`❌ Error: ${data.error}`);
      }
    } catch (err) {
      setResult('❌ Connection error');
    }
    setClearing(false);
  };

  if (user?.role !== 'founder') return null;

  const isActive = simState?.is_active ?? false;
  const rowCounts = simState?.row_counts ?? {};
  const totalRows = Object.values(rowCounts).reduce((s, n) => s + (n as number), 0);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
          Simulation <span className="text-amber-400">Mode</span>
        </h1>
        <p className="text-brand-steel font-bold text-xs uppercase tracking-widest mt-1">
          Founder Only · Fills OS with 30 days of realistic demo data
        </p>
      </div>

      {/* Status Card */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-6">
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${isActive ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
          <div>
            <p className="text-white font-black text-lg">{isActive ? 'Simulation Active' : 'Simulation Inactive'}</p>
            {isActive && simState?.activated_at && (
              <p className="text-amber-400/70 text-xs font-bold mt-0.5">
                Activated {new Date(simState.activated_at).toLocaleString('en-GB')}
              </p>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
          <p className="text-amber-400 text-xs font-bold">
            ⚠️ Real data (is_simulated = false) is <strong>never</strong> affected. Simulation rows are tagged separately and deleted cleanly on clear.
          </p>
        </div>

        {/* Row counts */}
        {isActive && totalRows > 0 && (
          <div>
            <p className="text-brand-steel text-[10px] font-bold uppercase tracking-widest mb-3">Simulated Rows</p>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(rowCounts).map(([table, count]) => (
                <div key={table} className="bg-brand-navy/20 rounded-xl px-4 py-2.5 border border-white/5 flex justify-between items-center">
                  <span className="text-xs text-brand-steel font-bold">{TABLE_LABELS[table] ?? table}</span>
                  <span className="text-sm text-amber-400 font-black">{(count as number).toLocaleString()}</span>
                </div>
              ))}
            </div>
            <p className="text-amber-400 font-black text-sm mt-3">{totalRows.toLocaleString()} total simulated rows</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={handlePopulate}
            disabled={populating || isActive}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-sm uppercase tracking-widest hover:bg-emerald-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {populating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {populating ? 'Populating…' : 'Populate 30 Days of Demo Data'}
          </button>

          <button
            onClick={handleClear}
            disabled={clearing || !isActive}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 font-black text-sm uppercase tracking-widest hover:bg-red-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {clearing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {clearing ? 'Clearing…' : 'Clear All Demo Data'}
          </button>
        </div>

        {result && (
          <div className={`p-3 rounded-xl text-xs font-bold border ${result.startsWith('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {result}
          </div>
        )}
      </section>

      {/* What gets populated */}
      <section className="glass-panel rounded-[2rem] p-8 space-y-4">
        <p className="text-white font-black text-sm uppercase tracking-widest">What Gets Populated</p>
        <div className="space-y-2 text-xs text-brand-steel font-bold">
          {[
            '30 days of production logs — 450–520 jars/day weekdays, 320–380 weekends, BATCH-YYYYMMDD-NNN numbering',
            '5 QC tests/day — TDS, pH, Turbidity, Chlorine, Bacteria — 95% PASS rate with realistic failure clusters',
            'Sales across 15 simulated distributors — realistic UGX at T1 pricing, 5–10 transactions/day',
            'Daily cash counts with realistic ±5,000 UGX variance from expected',
            '15 distributors: 10 active, 3 sleeping, 2 churned across Buziga, Kansanga, Makindye, Namuwongo, Muyenga',
            'Events: batch_created per batch, qc_fail per failure',
            'CAPA records: from QC fails — older ones resolved, recent ones open',
          ].map((item, i) => (
            <div key={i} className="flex gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-brand-sky flex-shrink-0 mt-0.5" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
