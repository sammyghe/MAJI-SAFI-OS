'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export default function FounderOfficePage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    jarsToday: 0,
    jarsSource: '',
    qualityPassRate: 0,
    qualityTests: 0,
    cashPosition: 0,
    cashRecorded: false,
    cashSource: '',
    revenueToday: 0,
    revenueRecorded: false,
    revenueSource: '',
    inventoryAlerts: 0,
    inventorySource: '',
    complianceIssues: 0,
    complianceSource: '',
  });
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [
        { data: prodData },
        { data: qcData },
        { data: cashData },
        { data: salesData },
        { data: invData },
        { data: compData },
        { data: eventData },
      ] = await Promise.all([
        supabase
          .from('production_logs')
          .select('jar_count, id')
          .eq('production_date', today)
          .eq('location_id', 'buziga'),
        supabase
          .from('water_tests')
          .select('result, id')
          .eq('location_id', 'buziga')
          .gte('tested_at', today),
        supabase
          .from('daily_cash')
          .select('physical_cash_count_ugx, id, created_at')
          .eq('location_id', 'buziga')
          .eq('date', today)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('sales_ledger')
          .select('amount_ugx, id')
          .eq('location_id', 'buziga')
          .eq('sale_date', today),
        supabase
          .from('inventory_items')
          .select('id, item_name, quantity, reorder_threshold')
          .eq('location_id', 'buziga'),
        supabase
          .from('compliance_records')
          .select('id, status')
          .eq('location_id', 'buziga'),
        supabase
          .from('events')
          .select('*')
          .eq('location_id', 'buziga')
          .in('severity', ['critical', 'warning'])
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      const jarsToday = prodData?.reduce((sum, l) => sum + (l.jar_count || 0), 0) ?? 0;
      const jarsSourceId = prodData?.length ? prodData[0].id?.slice(0, 8) : '';

      const passCount = qcData?.filter((q) => q.result === 'PASS').length ?? 0;
      const passRate = qcData?.length
        ? Math.round((passCount / qcData.length) * 100)
        : 0;

      const revenueToday = salesData?.reduce((sum, s) => sum + (s.amount_ugx || 0), 0) ?? 0;
      const revSourceId = salesData?.length ? salesData[0].id?.slice(0, 8) : '';

      const invAlerts = (invData ?? []).filter(
        (i) => (i.quantity ?? 0) <= (i.reorder_threshold ?? 0)
      ).length;

      const compIssues = (compData ?? []).filter((c) => c.status !== 'active').length;

      setStats({
        jarsToday,
        jarsSource: jarsSourceId ? `production_logs row ${jarsSourceId}` : 'production_logs, buziga',
        qualityPassRate: passRate,
        qualityTests: qcData?.length ?? 0,
        cashPosition: cashData?.physical_cash_count_ugx ?? 0,
        cashRecorded: !!cashData,
        cashSource: cashData ? `daily_cash row ${cashData.id?.slice(0, 8)}` : '',
        revenueToday,
        revenueRecorded: (salesData?.length ?? 0) > 0,
        revenueSource: revSourceId ? `sales_ledger row ${revSourceId}` : '',
        inventoryAlerts: invAlerts,
        inventorySource: 'inventory_items, buziga',
        complianceIssues: compIssues,
        complianceSource: 'compliance_records, buziga',
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
    const iv = setInterval(load, 10000);

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

  const kpis = [
    {
      label: 'Jars Filled Today',
      value: loading ? '—' : stats.jarsToday === 0 ? 'No data — enter it.' : stats.jarsToday.toString(),
      suffix: stats.jarsToday > 0 ? ' jars' : '',
      color: stats.jarsToday >= 500
        ? 'text-secondary-fixed'
        : stats.jarsToday > 0
        ? 'text-on-surface'
        : 'text-on-surface-variant',
      source: `[source: production_logs, buziga]`,
      sub: stats.jarsToday > 0 ? `${Math.min(Math.round((stats.jarsToday / 500) * 100), 100)}% of 500-jar target` : '',
      pct: Math.min(Math.round((stats.jarsToday / 500) * 100), 100),
      barColor: stats.jarsToday >= 500 ? 'bg-secondary' : 'bg-primary',
    },
    {
      label: 'QC Pass Rate',
      value: loading
        ? '—'
        : stats.qualityTests === 0
        ? 'No data — enter it.'
        : `${stats.qualityPassRate}%`,
      suffix: '',
      color: stats.qualityPassRate === 100
        ? 'text-secondary'
        : stats.qualityPassRate > 0
        ? 'text-tertiary'
        : 'text-on-surface-variant',
      source: '[source: water_tests, buziga]',
      sub: stats.qualityTests > 0 ? `${stats.qualityTests} test${stats.qualityTests !== 1 ? 's' : ''} today` : '',
      pct: stats.qualityPassRate,
      barColor: stats.qualityPassRate === 100 ? 'bg-secondary' : 'bg-tertiary',
    },
    {
      label: 'Cash Position',
      value: loading
        ? '—'
        : !stats.cashRecorded
        ? 'No data — enter it.'
        : `${stats.cashPosition.toLocaleString()} UGX`,
      suffix: '',
      color: stats.cashRecorded ? 'text-secondary' : 'text-on-surface-variant',
      source: stats.cashRecorded ? `[source: ${stats.cashSource}]` : '[source: daily_cash, buziga]',
      sub: stats.cashRecorded ? 'Cash counted today' : '',
      pct: 0,
      barColor: '',
    },
    {
      label: 'Revenue Today',
      value: loading
        ? '—'
        : !stats.revenueRecorded
        ? 'No data — enter it.'
        : `${stats.revenueToday.toLocaleString()} UGX`,
      suffix: '',
      color: stats.revenueRecorded ? 'text-secondary' : 'text-on-surface-variant',
      source: stats.revenueRecorded ? `[source: ${stats.revenueSource}]` : '[source: sales_ledger, buziga]',
      sub: stats.revenueRecorded ? 'From sales ledger' : '',
      pct: 0,
      barColor: '',
    },
    {
      label: 'Inventory Alerts',
      value: loading ? '—' : stats.inventoryAlerts.toString(),
      suffix: '',
      color: stats.inventoryAlerts > 0 ? 'text-tertiary' : 'text-secondary',
      source: `[source: ${stats.inventorySource}]`,
      sub: stats.inventoryAlerts > 0
        ? `${stats.inventoryAlerts} item${stats.inventoryAlerts !== 1 ? 's' : ''} below reorder threshold`
        : 'All items above threshold',
      pct: 0,
      barColor: '',
    },
    {
      label: 'Compliance Issues',
      value: loading ? '—' : stats.complianceIssues.toString(),
      suffix: '',
      color: stats.complianceIssues > 0 ? 'text-tertiary' : 'text-secondary',
      source: `[source: ${stats.complianceSource}]`,
      sub: stats.complianceIssues > 0
        ? `${stats.complianceIssues} record${stats.complianceIssues !== 1 ? 's' : ''} not active`
        : 'All records active',
      pct: 0,
      barColor: '',
    },
  ];

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
          {!loading && (
            <>
              <span>/</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                <span className="text-secondary">Live</span>
              </span>
            </>
          )}
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

      {/* 6-KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-low ghost-border p-6 flex flex-col justify-between">
            <div>
              <p className="font-label text-[10px] text-outline uppercase tracking-[0.2em] mb-3">{kpi.label}</p>
              <p className={`font-body text-3xl font-bold leading-tight ${kpi.color}`}>
                {kpi.value}
                {kpi.suffix && <span className="text-base font-normal ml-1">{kpi.suffix}</span>}
              </p>
              {kpi.sub && (
                <p className="mt-1 text-xs text-outline/60 font-label">{kpi.sub}</p>
              )}
              {kpi.pct > 0 && kpi.barColor && (
                <div className="mt-3 w-full bg-surface-container-highest h-1 overflow-hidden">
                  <div
                    className={`${kpi.barColor} h-full transition-all`}
                    style={{ width: `${kpi.pct}%` }}
                  />
                </div>
              )}
            </div>
            <p className="mt-4 text-[10px] font-label text-outline/40">{kpi.source}</p>
          </div>
        ))}
      </div>

      {/* Bottom row: Production vs Target + Signal Summary + Live Events */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left: Production progress + WhatsApp brief */}
        <section className="xl:col-span-8 space-y-6">
          <div className="bg-surface-container-low ghost-border p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
            <div className="relative flex justify-between items-start mb-8 flex-wrap gap-4">
              <div>
                <h3 className="text-2xl font-headline font-bold mb-1">Morning Brief</h3>
                <p className="text-outline text-sm font-label">Production &amp; Liquidity Summary — {today}</p>
              </div>
              <button className="flex items-center gap-2 bg-[#25D366] text-[#0a0e14] px-4 py-2 font-label text-xs font-bold hover:brightness-105 transition-all">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                Send to WhatsApp
              </button>
            </div>

            {/* Production progress bar */}
            <div className="mb-6">
              <div className="flex justify-between text-[10px] font-label text-outline mb-2">
                <span>Jars filled</span>
                <span>{stats.jarsToday} / 500</span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 overflow-hidden">
                <div
                  className={`h-full transition-all ${stats.jarsToday >= 500 ? 'bg-secondary' : 'bg-primary'}`}
                  style={{ width: `${Math.min((stats.jarsToday / 500) * 100, 100)}%` }}
                />
              </div>
              <p className={`mt-2 text-2xl font-body font-bold ${stats.jarsToday >= 500 ? 'text-secondary-fixed' : 'text-tertiary'}`}>
                {stats.jarsToday === 0 ? 'No production data yet' : `${stats.jarsToday} / 500 jars`}
              </p>
              <p className="text-[10px] text-outline/50 font-label mt-1">[source: production_logs, buziga]</p>
            </div>

            {/* Inline signals */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-outline-variant/10">
              {[
                { label: 'Critical Alerts', value: criticalCount, warn: criticalCount > 0 },
                { label: 'Inventory Alerts', value: stats.inventoryAlerts, warn: stats.inventoryAlerts > 0 },
                { label: 'Compliance Issues', value: stats.complianceIssues, warn: stats.complianceIssues > 0 },
                { label: 'QC Tests Today', value: stats.qualityTests, warn: false },
              ].map((sig) => (
                <div key={sig.label} className="text-center">
                  <p className={`text-2xl font-body font-bold ${sig.warn ? 'text-tertiary' : 'text-secondary'}`}>{sig.value}</p>
                  <p className="text-[10px] text-outline/50 font-label mt-1">{sig.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Month 1 context */}
          <div className="bg-surface-container-low ghost-border p-6">
            <p className="text-[10px] font-label text-outline/60 leading-relaxed uppercase tracking-widest">
              Month 1 target: 500 jars/day T1 wholesale. Break-even at 220–240 jars/day. Commercial launch: May 3, 2026.
            </p>
          </div>
        </section>

        {/* Right: Signal bar chart + Live Event Feed */}
        <section className="xl:col-span-4 space-y-6">
          <div className="bg-surface-container-high ghost-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-primary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-primary-container text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              </div>
              <h3 className="text-lg font-headline font-bold">Signal Summary</h3>
            </div>
            <div className="space-y-5">
              {[
                {
                  label: 'Jars vs Target',
                  value: `${stats.jarsToday}/500`,
                  color: 'text-primary',
                  pct: Math.min(Math.round((stats.jarsToday / 500) * 100), 100),
                  barColor: 'bg-primary',
                },
                {
                  label: 'QC Pass Rate',
                  value: stats.qualityTests > 0 ? `${stats.qualityPassRate}%` : 'No data',
                  color: stats.qualityPassRate === 100 ? 'text-secondary-fixed' : 'text-tertiary',
                  pct: stats.qualityPassRate,
                  barColor: stats.qualityPassRate === 100 ? 'bg-secondary-fixed' : 'bg-tertiary',
                },
                {
                  label: 'Critical Alerts',
                  value: criticalCount.toString(),
                  color: criticalCount > 0 ? 'text-tertiary' : 'text-secondary',
                  pct: Math.min(criticalCount * 20, 100),
                  barColor: criticalCount > 0 ? 'bg-tertiary' : 'bg-secondary',
                },
                {
                  label: 'Inventory Alerts',
                  value: stats.inventoryAlerts.toString(),
                  color: stats.inventoryAlerts > 0 ? 'text-tertiary' : 'text-secondary',
                  pct: Math.min(stats.inventoryAlerts * 20, 100),
                  barColor: stats.inventoryAlerts > 0 ? 'bg-tertiary' : 'bg-secondary',
                },
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

          {/* Live Event Feed */}
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
              <div className="space-y-4 max-h-72 overflow-y-auto">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    className={`relative pl-4 border-l ${
                      evt.severity === 'critical' ? 'border-tertiary-container' : 'border-primary-container'
                    }`}
                  >
                    <div
                      className={`absolute -left-1 top-0 w-2 h-2 rounded-full ${
                        evt.severity === 'critical' ? 'bg-tertiary' : 'bg-primary'
                      }`}
                    />
                    <p className="text-[10px] font-label text-outline">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </p>
                    <p className={`text-sm font-body mt-0.5 ${evt.severity === 'critical' ? 'text-tertiary' : 'text-primary'}`}>
                      {evt.event_type?.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    {evt.department && (
                      <p className="text-[10px] text-outline/50 font-label">{evt.department}</p>
                    )}
                    {evt.batch_id && (
                      <p className="text-[10px] text-outline/40 font-label">Batch: {evt.batch_id}</p>
                    )}
                    <p className="text-[10px] text-outline/30 font-label">[source: events row {evt.id?.slice(0, 8)}]</p>
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
