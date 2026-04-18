'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function FounderOfficePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    jarsToday: 0,
    qualityPassRate: 0,
    cashPosition: 0,
    cashRecorded: false,
  });
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [{ data: prodData }, { data: qcData }, { data: cashData }, { data: eventData }] =
        await Promise.all([
          supabase
            .from('production_logs')
            .select('jar_count')
            .eq('production_date', today)
            .eq('location_id', 'buziga'),
          supabase
            .from('water_tests')
            .select('result')
            .eq('location_id', 'buziga')
            .gte('tested_at', today),           // fixed: was created_at
          supabase
            .from('daily_cash')
            .select('physical_cash_count_ugx, created_at')
            .eq('location_id', 'buziga')
            .eq('date', today)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('events')
            .select('*')
            .eq('location_id', 'buziga')
            .in('severity', ['critical', 'warning'])
            .order('created_at', { ascending: false })
            .limit(10),
        ]);

      const jarsToday = prodData?.reduce((sum, l) => sum + (l.jar_count || 0), 0) ?? 0;
      const passRate = qcData?.length
        ? Math.round((qcData.filter((q) => q.result === 'PASS').length / qcData.length) * 100)
        : 0;

      setStats({
        jarsToday,
        qualityPassRate: passRate,
        cashPosition: cashData?.physical_cash_count_ugx ?? 0,
        cashRecorded: !!cashData,
      });
      setEvents(eventData ?? []);
    } catch (err) {
      console.error('Founder dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // Poll every 10s
    const iv = setInterval(load, 10000);

    // Realtime subscription for new events
    channelRef.current = supabase
      .channel('rt:founder-events')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'events' }, (payload) => {
        const evt = payload.new;
        if (evt.location_id !== 'buziga') return;
        setEvents((prev) => [evt, ...prev].slice(0, 10));
      })
      .subscribe();

    return () => {
      clearInterval(iv);
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();

  const criticalCount = events.filter((e) => e.severity === 'critical').length;
  const warningCount = events.filter((e) => e.severity === 'warning').length;

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {/* Page Header */}
      <header className="mb-12">
        <h2 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface mb-2">
          Executive – Strategic Briefing
        </h2>
        <div className="flex items-center gap-4 text-outline/60 text-xs font-label uppercase tracking-[0.2em] flex-wrap">
          <span>Maji Safi Operations</span>
          <span>/</span>
          <span>Operational Intelligence</span>
          <span>/</span>
          <span className="text-primary-container font-bold">{today}</span>
        </div>
      </header>

      {/* Critical alerts banner */}
      {criticalCount > 0 && (
        <div className="mb-6 p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary-container text-sm mt-0.5">warning</span>
          <div>
            <p className="text-tertiary-container font-body text-[10px] font-bold uppercase tracking-widest">
              {criticalCount} Critical Alert{criticalCount > 1 ? 's' : ''}
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              {events.filter(e => e.severity === 'critical')[0]?.event_type?.replace(/_/g, ' ').toUpperCase()}
            </p>
          </div>
        </div>
      )}

      {/* Warning alerts banner */}
      {warningCount > 0 && criticalCount === 0 && (
        <div className="mb-6 p-4 bg-primary-container/10 border-l-2 border-primary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-sm mt-0.5">info</span>
          <div>
            <p className="text-primary font-body text-[10px] font-bold uppercase tracking-widest">
              {warningCount} Warning{warningCount > 1 ? 's' : ''} — Action Recommended
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              {events.filter(e => e.severity === 'warning')[0]?.event_type?.replace(/_/g, ' ').toUpperCase()}
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
                <p className="text-outline text-sm font-label">Production &amp; Liquidity Summary</p>
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
                  ref: 'production_logs, buziga',
                },
                {
                  label: 'Quality Pass Rate',
                  value: loading ? '—' : `${stats.qualityPassRate}%`,
                  suffix: '',
                  color: stats.qualityPassRate >= 95 ? 'text-secondary' : stats.qualityPassRate > 0 ? 'text-tertiary' : 'text-on-surface-variant',
                  ref: 'water_tests, buziga',
                },
                {
                  label: 'Cash Position',
                  value: loading ? '—' : stats.cashRecorded ? stats.cashPosition.toLocaleString() : 'No data',
                  suffix: stats.cashRecorded ? ' UGX' : '',
                  color: stats.cashRecorded ? 'text-secondary' : 'text-on-surface-variant',
                  ref: 'daily_cash, buziga',
                },
              ].map((kpi) => (
                <div key={kpi.label} className="space-y-1">
                  <p className="text-outline text-[10px] font-label uppercase tracking-widest">{kpi.label}</p>
                  <p className={`text-3xl font-body font-bold ${kpi.color}`}>
                    {kpi.value}
                    {kpi.suffix && <span className="text-lg font-normal ml-1">{kpi.suffix}</span>}
                  </p>
                  <p className="text-[10px] text-outline/50 font-label">[source: {kpi.ref}]</p>
                </div>
              ))}
            </div>
          </div>

          {/* Secondary row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-surface-container-low ghost-border p-6">
              <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-4 font-label">
                Production vs Target (Today)
              </h4>
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-label text-outline mb-2">
                  <span>0</span>
                  <span>500 jars</span>
                </div>
                <div className="w-full bg-surface-container-highest h-2">
                  <div
                    className={`h-full transition-all ${stats.jarsToday >= 500 ? 'bg-secondary' : 'bg-primary'}`}
                    style={{ width: `${Math.min((stats.jarsToday / 500) * 100, 100)}%` }}
                  />
                </div>
              </div>
              <p className={`text-2xl font-body font-bold ${stats.jarsToday >= 500 ? 'text-secondary-fixed' : 'text-tertiary'}`}>
                {stats.jarsToday} / 500 jars
              </p>
              <p className="text-[10px] text-outline/50 font-label mt-1">[source: production_logs, buziga]</p>
            </div>

            <div className="bg-surface-container-low ghost-border p-6 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-2 font-label">
                  System Signals
                </h4>
                <div className="space-y-3 mt-4">
                  <div className="flex justify-between items-center text-xs font-label">
                    <span className="text-on-surface-variant">Critical alerts</span>
                    <span className={criticalCount > 0 ? 'text-tertiary font-bold' : 'text-secondary'}>{criticalCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-label">
                    <span className="text-on-surface-variant">Warnings</span>
                    <span className={warningCount > 0 ? 'text-primary font-bold' : 'text-secondary'}>{warningCount}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-label">
                    <span className="text-on-surface-variant">QC tests today</span>
                    <span className="text-on-surface">{loading ? '—' : `${stats.qualityPassRate > 0 ? 'Data' : 'None'}`}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t border-outline-variant/10">
                <p className="text-[10px] font-label text-outline/60 leading-relaxed uppercase">
                  Month 1 target: 500 jars/day T1 wholesale. Break-even at 220–240 jars.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Right column */}
        <section className="xl:col-span-4 space-y-8">
          <div className="bg-surface-container-high ghost-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <h3 className="text-lg font-headline font-bold">Signal Summary</h3>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Critical Alerts', value: criticalCount.toString(), color: 'text-tertiary', pct: Math.min(criticalCount * 20, 100), barColor: 'bg-tertiary' },
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
          </div>

          {/* Recent Events Feed — realtime */}
          <div className="bg-surface-container-low ghost-border p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold text-outline uppercase tracking-widest font-label">
                Live Event Feed
              </h4>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-[10px] font-label text-secondary uppercase">Live</span>
              </div>
            </div>
            {events.length === 0 ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-secondary" />
                <p className="text-xs text-secondary font-label">All systems operational</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto">
                {events.map((evt) => (
                  <div key={evt.id} className={`relative pl-4 border-l ${evt.severity === 'critical' ? 'border-tertiary-container' : 'border-primary-container'}`}>
                    <div className={`absolute -left-1 top-0 w-2 h-2 rounded-full ${evt.severity === 'critical' ? 'bg-tertiary' : 'bg-primary'}`} />
                    <p className="text-[10px] font-label text-outline">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </p>
                    <p className={`text-sm font-body mt-0.5 ${evt.severity === 'critical' ? 'text-tertiary' : 'text-primary'}`}>
                      {evt.event_type?.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    {evt.department && (
                      <p className="text-[10px] text-outline/50 font-label">{evt.department}</p>
                    )}
                    <p className="text-[10px] text-outline/40 font-label">[source: events row {evt.id?.slice(0, 8)}]</p>
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
