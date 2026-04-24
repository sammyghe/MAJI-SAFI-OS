'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useCanEdit } from '@/hooks/useCanEdit';
import RecentActivity from '@/components/RecentActivity';

interface SystemEvent {
  id: string;
  event_type: string;
  batch_id?: string;
  department?: string;
  severity: string;
  payload?: any;
  location_id: string;
  created_at: string;
}

export default function TechnologyPage() {
  const { isReadOnly } = useCanEdit('technology');
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>('');
  const [completeness, setCompleteness] = useState<{ label: string; ok: boolean }[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    loadEvents();
    channelRef.current = supabase
      .channel('rt:events_tech')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => { loadEvents(); })
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('location_id', 'buziga')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setEvents(data ?? []);
      if (data && data.length > 0) {
        setLastEvent(new Date(data[0].created_at).toLocaleTimeString());
      }
      setConnected(true);

      // Data completeness check for today
      const today = new Date().toISOString().split('T')[0];
      const [
        { count: prodCount },
        { count: qcCount },
        { count: salesCount },
        { count: cashCount },
        { count: dispCount },
      ] = await Promise.all([
        supabase.from('production_logs').select('id', { count: 'exact', head: true }).eq('location_id', 'buziga').eq('production_date', today),
        supabase.from('water_tests').select('id', { count: 'exact', head: true }).eq('location_id', 'buziga').gte('tested_at', today),
        supabase.from('sales_ledger').select('id', { count: 'exact', head: true }).eq('location_id', 'buziga').eq('sale_date', today),
        supabase.from('daily_cash').select('id', { count: 'exact', head: true }).eq('location_id', 'buziga').eq('date', today),
        supabase.from('distributors').select('id', { count: 'exact', head: true }).eq('location_id', 'buziga').eq('status', 'active'),
      ]);
      setCompleteness([
        { label: 'Production logged', ok: (prodCount ?? 0) > 0 },
        { label: 'QC tests done', ok: (qcCount ?? 0) >= 5 },
        { label: 'Sales recorded', ok: (salesCount ?? 0) > 0 },
        { label: 'Cash counted', ok: (cashCount ?? 0) > 0 },
        { label: 'Active distributors', ok: (dispCount ?? 0) > 0 },
      ]);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Technology load error:', err);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const severityStyle = (severity: string) => {
    switch (severity) {
      case 'critical': return { dot: 'bg-tertiary', line: 'border-tertiary-container', text: 'text-tertiary' };
      case 'warning': return { dot: 'bg-primary', line: 'border-primary-container', text: 'text-primary' };
      default: return { dot: 'bg-secondary', line: 'border-secondary-container', text: 'text-secondary' };
    }
  };

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      {isReadOnly && (
        <div className="mb-6 px-4 py-2.5 bg-surface-container border-l-2 border-outline/30">
          <span className="text-[10px] font-label text-outline uppercase tracking-widest">View only — you are not assigned to this department</span>
        </div>
      )}
      {/* Header */}
      <header className="mb-12">
        <h2 className="text-4xl font-extrabold tracking-tight font-headline mb-2">
          Technology – System Intelligence
        </h2>
        <div className="flex items-center gap-4 text-outline text-xs font-label">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-secondary' : 'bg-tertiary'}`} />
            Supabase: {connected ? 'Connected' : 'Error'}
          </span>
          {lastEvent && <span>Last event: {lastEvent}</span>}
          <span>Location: buziga</span>
        </div>
      </header>

      {/* Data Completeness Score */}
      {completeness.length > 0 && (
        <div className="mb-10 bg-surface-container-low ghost-border p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <p className="font-label text-[10px] text-outline uppercase tracking-[0.2em]">Data Completeness — Today</p>
            <span className={`font-bold text-sm ${completeness.filter((c) => c.ok).length === 5 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {completeness.filter((c) => c.ok).length}/5 complete
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {completeness.map((c) => (
              <div key={c.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold ${c.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
                <span>{c.ok ? '✅' : '❌'}</span>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          {
            label: 'Supabase Connection',
            value: connected ? 'ONLINE' : 'ERROR',
            color: connected ? 'text-secondary-fixed' : 'text-tertiary',
            icon: 'cloud_done',
            ref: 'system-check',
          },
          {
            label: 'Events (Last 50)',
            value: events.length.toString(),
            color: 'text-on-surface',
            icon: 'receipt_long',
            ref: 'events, buziga',
          },
          {
            label: 'Critical Events',
            value: events.filter((e) => e.severity === 'critical').length.toString(),
            color: events.filter((e) => e.severity === 'critical').length > 0 ? 'text-tertiary' : 'text-secondary',
            icon: 'warning',
            ref: 'events, buziga',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-surface-container-low ghost-border p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-6xl">{stat.icon}</span>
            </div>
            <p className="font-label text-[11px] text-slate-500 uppercase tracking-[0.2em] mb-4">{stat.label}</p>
            <p className={`font-body text-4xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="mt-4 font-label text-xs text-outline/50">[source: {stat.ref}]</p>
          </div>
        ))}
      </div>

      {/* Events Log */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <span className="w-12 h-[1px] bg-primary-container" />
            <h3 className="font-headline text-xl font-bold">System Event Log</h3>
          </div>
          <button
            onClick={loadEvents}
            className="bg-surface-container-high text-on-surface text-xs font-bold px-4 py-2 font-label hover:bg-surface-container-highest transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>

        <div className="bg-surface-container-lowest ghost-border overflow-hidden">
          <div className="px-6 py-4 bg-surface-container-high border-b border-outline-variant/10 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl">psychology</span>
            <h4 className="text-sm font-bold font-headline text-primary uppercase tracking-tight">
              Shadow AI Log
            </h4>
            <span className="text-[10px] text-outline/50 font-label ml-auto">Last 50 events — all departments — buziga</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-outline/50 font-label text-sm">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-outline/50 font-label text-sm">No events logged yet.</p>
              <p className="text-[10px] text-outline/30 font-body mt-1">[source: events — no rows for buziga]</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {events.map((evt) => {
                const s = severityStyle(evt.severity);
                return (
                  <div
                    key={evt.id}
                    className={`px-6 py-4 flex items-start gap-4 hover:bg-surface-container-high/20 transition-colors ${evt.severity === 'critical' ? 'border-l-2 border-tertiary-container' : ''}`}
                  >
                    {/* Timeline dot */}
                    <div className="flex-shrink-0 pt-1">
                      <div className={`w-2 h-2 rounded-full ${s.dot}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-4 flex-wrap">
                        <p className={`text-sm font-body font-semibold ${s.text}`}>
                          {evt.event_type?.replace(/_/g, ' ').toUpperCase()}
                        </p>
                        <p className="text-[10px] font-label text-outline/50 flex-shrink-0">
                          {new Date(evt.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        {evt.batch_id && (
                          <span className="text-[10px] font-label text-outline">
                            Batch: {evt.batch_id}
                          </span>
                        )}
                        {evt.department && (
                          <span className="text-[10px] font-label text-outline">
                            Dept: {evt.department}
                          </span>
                        )}
                        <span className={`text-[10px] font-bold uppercase rounded-none px-1.5 py-0.5 font-label ${
                          evt.severity === 'critical' ? 'bg-tertiary-container text-on-tertiary-container' :
                          evt.severity === 'warning' ? 'bg-primary-container/20 text-primary' :
                          'bg-secondary-container/20 text-secondary'
                        }`}>
                          {evt.severity}
                        </span>
                        <span className="text-[10px] text-outline/40 font-label ml-auto">[source: events row {evt.id?.slice(0, 8)}, {evt.created_at.slice(0, 10)}]</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* System routes overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'QC Fail → Halt', desc: 'water_tests FAIL → production halt + quarantine + founder alert + CAPA', icon: 'biotech', status: 'active' },
          { label: 'EOD Cash Gate', desc: 'cash_counted ≠ cash_expected → EOD close disabled unless founder force-close', icon: 'lock', status: 'active' },
          { label: 'Reorder Trigger', desc: 'inventory qty ≤ threshold → reorder_triggers event fired', icon: 'inventory_2', status: 'active' },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-low ghost-border p-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="material-symbols-outlined text-primary-container text-xl">{item.icon}</span>
              <span className="text-xs font-bold font-label uppercase tracking-widest text-on-surface">{item.label}</span>
              <span className="ml-auto text-[10px] font-label text-secondary uppercase bg-secondary-container/20 px-1.5 py-0.5">{item.status}</span>
            </div>
            <p className="text-xs font-label text-on-surface-variant leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
      <RecentActivity tables={['events']} departmentSlug="technology" limit={30} />
    </div>
  );
}
