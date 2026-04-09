"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface FeedEvent {
  id: number;
  event_type: string;
  department_from: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
  created_at: string;
}

const ROW_STYLES = {
  info:     'bg-brand-navy/20 border-brand-sky/10',
  warning:  'bg-amber-400/5  border-amber-400/20',
  critical: 'bg-red-500/5    border-red-500/25 animate-row-critical',
};

function SeverityDot({ severity }: { severity: FeedEvent['severity'] }) {
  if (severity === 'critical') {
    return (
      <span className="relative mt-1.5 flex-shrink-0 w-2 h-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 animate-dot-critical" />
      </span>
    );
  }
  if (severity === 'warning') {
    return <span className="mt-1.5 w-2 h-2 flex-shrink-0 rounded-full bg-amber-400 animate-pulse" />;
  }
  return <span className="mt-1.5 w-2 h-2 flex-shrink-0 rounded-full bg-blue-400" />;
}

export default function TransparencyFeed() {
  const [events, setEvents] = useState<FeedEvent[]>([]);

  useEffect(() => {
    supabase
      .from('transparency_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setEvents(data as FeedEvent[]);
      });

    const channel = supabase
      .channel('transparency_feed_inserts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transparency_feed' },
        (payload) => {
          setEvents((prev) => [payload.new as FeedEvent, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div
      className="overflow-hidden p-8 rounded-[2.5rem] bg-brand-deep/40 backdrop-blur-xl border border-brand-sky/15"
      style={{ boxShadow: '0 0 40px rgba(125,160,202,0.07), inset 0 1px 0 rgba(193,232,255,0.06)' }}
    >
      <div className="flex items-center gap-3 mb-8">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <h2 className="text-xl font-black text-white italic uppercase">Transparency Feed</h2>
        <p className="text-[10px] font-bold text-brand-steel uppercase tracking-widest ml-1">Live Org Events</p>
      </div>

      {events.length === 0 ? (
        <p className="text-brand-steel font-black text-xs uppercase tracking-widest italic text-center py-10">
          No events yet.
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((ev) => (
            <div
              key={ev.id}
              className={`flex items-start gap-4 p-4 rounded-2xl border transition-colors duration-300 ${ROW_STYLES[ev.severity]}`}
            >
              <SeverityDot severity={ev.severity} />
              <span className="text-[11px] font-black text-brand-sky uppercase tracking-widest w-28 flex-shrink-0">
                {ev.department_from}
              </span>
              <span className="text-[12px] font-bold text-white flex-1 leading-relaxed">
                {ev.message}
              </span>
              <span className="text-[10px] font-black text-brand-steel uppercase tracking-widest flex-shrink-0 whitespace-nowrap">
                {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
