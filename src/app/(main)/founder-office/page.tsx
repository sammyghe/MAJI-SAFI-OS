'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function FounderOfficePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    jarsToday: 0,
    qualityPassRate: 0,
    cashPosition: 0,
    inventoryHealth: 75,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];

        const { data: prodData } = await supabase
          .from('production_logs')
          .select('jar_count')
          .eq('production_date', today)
          .eq('location_id', 'buziga');

        const jarsToday = prodData?.reduce((sum, l) => sum + (l.jar_count || 0), 0) ?? 0;

        const { data: qcData } = await supabase
          .from('water_tests')
          .select('result')
          .eq('location_id', 'buziga')
          .gte('created_at', new Date(Date.now() - 86400000).toISOString());

        const passRate = qcData?.length
          ? Math.round((qcData.filter((q) => q.result === 'PASS').length / qcData.length) * 100)
          : 0;

        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('location_id', 'buziga')
          .eq('severity', 'critical')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({ jarsToday, qualityPassRate: passRate, cashPosition: 0, inventoryHealth: 75 });
        setEvents(eventData ?? []);
      } catch (err) {
        console.error('Founder dashboard error:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => clearInterval(iv);
  }, []);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <header className="mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface mb-2">
          Executive – Strategic Briefing
        </h2>
        <div className="flex items-center gap-4 text-outline/60 text-xs font-label uppercase tracking-[0.2em]">
          <span>Maji Safi Operations</span>
          <span>/</span>
          <span>Operational Intelligence</span>
          <span>/</span>
          <span className="text-primary-container font-bold">{today}</span>
        </div>
      </header>

      {/* Critical alerts banner */}
      {events.length > 0 && (
        <div className="mb-8 p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary-container text-sm mt-0.5">warning</span>
          <div>
            <p className="text-tertiary-container font-body text-[10px] font-bold uppercase tracking-widest">
              {events.length} Critical Alert{events.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              {events[0]?.event_type?.replace(/_/g, ' ').toUpperCase()} — Batch {events[0]?.batch_id}
            </p>
          </div>
        </div>
      )}

      {/* Main bento grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left column — Morning Brief */}
        <section className="xl:col-span-8 space-y-8">
          {/* Morning Brief card */}
          <div className="bg-surface-container-low ghost-border p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
            <div className="relative flex justify-between items-start mb-10 flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-headline font-bold mb-1">Morning Brief</h3>
                <p className="text-outline text-sm font-label">AI-Powered Production &amp; Liquidity Vector</p>
              </div>
              <button className="flex items-center gap-2 bg-[#25D366] text-[#0a0e14] px-4 py-2 font-label text-xs font-bold hover:brightness-105 transition-all">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                Send to WhatsApp
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  label: 'Jars Filled Today',
                  value: loading ? '—' : stats.jarsToday.toString(),
                  suffix: '',
                  color: stats.jarsToday >= 500 ? 'text-secondary-fixed' : 'text-on-surface',
                  ref: 'production_logs',
                },
                {
                  label: 'Quality Pass Rate',
                  value: loading ? '—' : `${stats.qualityPassRate}%`,
                  suffix: '',
                  color: stats.qualityPassRate >= 95 ? 'text-secondary' : 'text-tertiary',
                  ref: 'water_tests',
                },
                {
                  label: 'Cash Position',
                  value: 'No data',
                  suffix: '',
                  color: 'text-on-surface-variant',
                  ref: 'daily_cash',
                },
              ].map((kpi) => (
                <div key={kpi.label} className="space-y-1">
                  <p className="text-outline text-[10px] font-label uppercase tracking-widest">{kpi.label}</p>
                  <p className={`text-3xl font-body font-bold ${kpi.color}`}>{kpi.value}{kpi.suffix}</p>
                  <p className="text-[10px] text-outline/50 font-label">[source: {kpi.ref}, buziga]</p>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-low ghost-border p-6">
              <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-4 font-label">
                Production Trend (Today)
              </h4>
              <div className="h-32 flex items-end gap-1.5 px-2">
                {[60, 75, 90, 85, 50, 100, 70].map((h, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t-sm ${i === 5 ? 'bg-primary-container' : 'bg-primary/20'}`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-3 text-[10px] font-body text-outline/50">
                <span>06:00</span><span>NOW</span>
              </div>
            </div>

            <div className="bg-surface-container-low ghost-border p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-2 font-label">
                  Target Status
                </h4>
                <p className={`text-2xl font-body font-bold ${stats.jarsToday >= 500 ? 'text-secondary-fixed' : 'text-tertiary'}`}>
                  {stats.jarsToday}/500 jars
                </p>
              </div>
              <div className="pt-4 border-t border-outline-variant/10">
                <p className="text-[10px] font-label text-outline/60 leading-relaxed uppercase">
                  Month 1 target: 500 jars/day T1 wholesale. Break-even at 220–240 jars.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right column — Shadow AI Summary */}
        <section className="xl:col-span-4 space-y-8">
          <div className="bg-surface-container-high ghost-border p-6 glow-accent">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <h3 className="text-lg font-headline font-bold">Shadow AI Summary</h3>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Critical Alerts', value: events.length.toString(), color: 'text-tertiary', pct: Math.min(events.length * 20, 100), barColor: 'bg-tertiary' },
                { label: 'Jars vs Target', value: `${stats.jarsToday}/500`, color: 'text-primary', pct: Math.min(Math.round((stats.jarsToday / 500) * 100), 100), barColor: 'bg-primary' },
                { label: 'QC Pass Rate', value: `${stats.qualityPassRate}%`, color: 'text-secondary-fixed', pct: stats.qualityPassRate, barColor: 'bg-secondary-fixed' },
              ].map((row) => (
                <div key={row.label}>
                  <div className="flex justify-between text-[10px] font-bold text-outline uppercase tracking-widest mb-1.5 font-label">
                    <span>{row.label}</span>
                    <span className={row.color}>{row.value}</span>
                  </div>
                  <div className="w-full bg-surface-container-highest h-1 overflow-hidden">
                    <div className={`${row.barColor} h-full transition-all`} style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-outline-variant/10">
              <p className="text-xs text-outline/80 font-label italic leading-relaxed mb-4">
                "I synthesize signals from all 9 departments. Ask me anything."
              </p>
              <button className="w-full py-3 bg-surface-container-highest text-on-surface text-[10px] font-bold uppercase tracking-widest hover:bg-surface-variant transition-colors font-label">
                Full Intelligence Report
              </button>
            </div>
          </div>

          {/* Recent Events Feed */}
          <div className="bg-surface-container-low ghost-border p-6">
            <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-4 font-label">
              Recent Critical Events
            </h4>
            {events.length === 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <p className="text-xs text-secondary font-label">All systems operational</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((evt, i) => (
                  <div key={i} className="relative pl-4 border-l border-tertiary-container">
                    <div className="absolute -left-1 top-0 w-2 h-2 bg-tertiary rounded-full" />
                    <p className="text-[10px] font-label text-outline">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </p>
                    <p className="text-sm font-body text-tertiary mt-1">
                      {evt.event_type?.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-[10px] text-outline/50 font-label">[Ref: {evt.batch_id}]</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
