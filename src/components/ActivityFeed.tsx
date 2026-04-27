'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowUp, ArrowDown, CheckCircle2 } from 'lucide-react';

interface ActivityItem {
  id: string;
  name: string;
  action: string;
  metric: string;
  trend: 'up' | 'down' | 'neutral';
  color: string;
  needsAction?: boolean;
  time: string;
}

const AVATAR_COLORS = [
  '#0077B6', '#10B981', '#8B5CF6', '#EC4899', '#F59E0B', '#06B6D4',
];

function getAvatarColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function InitialsAvatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const color = getAvatarColor(name);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: `linear-gradient(135deg, ${color}, ${color}aa)`, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

export default function ActivityFeed({ limit = 6 }: { limit?: number }) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [prodRes, qcRes, memberRes, eventsRes] = await Promise.all([
      supabase.from('production_logs').select('id, logged_by, jar_count, created_at').eq('location_id', 'buziga').eq('production_date', today).order('created_at', { ascending: false }).limit(3),
      supabase.from('water_tests').select('id, tested_by, result, tested_at').eq('location_id', 'buziga').gte('tested_at', today).order('tested_at', { ascending: false }).limit(3),
      supabase.from('team_members').select('id, name, last_seen_at').eq('contract_status', 'active').order('last_seen_at', { ascending: false }).limit(2),
      supabase.from('events').select('id, event_type, payload, created_at, severity').eq('location_id', 'buziga').order('created_at', { ascending: false }).limit(3),
    ]);

    const feed: ActivityItem[] = [];

    (prodRes.data ?? []).forEach((r) => {
      feed.push({
        id: `prod-${r.id}`,
        name: r.logged_by ?? 'Operator',
        action: `Logged batch — ${r.jar_count} jars produced`,
        metric: `+${r.jar_count} jars`,
        trend: 'up',
        color: '#10B981',
        time: new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      });
    });

    (qcRes.data ?? []).forEach((r) => {
      const pass = r.result === 'PASS';
      feed.push({
        id: `qc-${r.id}`,
        name: r.tested_by ?? 'QC Team',
        action: `Water test ${pass ? 'passed' : 'FAILED'}`,
        metric: r.result,
        trend: pass ? 'up' : 'down',
        color: pass ? '#10B981' : '#EF4444',
        needsAction: !pass,
        time: new Date(r.tested_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      });
    });

    (eventsRes.data ?? []).forEach((r) => {
      const isCritical = r.severity === 'critical';
      feed.push({
        id: `evt-${r.id}`,
        name: 'System',
        action: (r.event_type ?? 'event').replace(/_/g, ' '),
        metric: isCritical ? '!' : '✓',
        trend: isCritical ? 'down' : 'neutral',
        color: isCritical ? '#EF4444' : '#0077B6',
        needsAction: isCritical,
        time: new Date(r.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      });
    });

    feed.sort((a, b) => b.time.localeCompare(a.time));

    if (feed.length === 0) {
      (memberRes.data ?? []).forEach((m) => {
        feed.push({
          id: `member-${m.id}`,
          name: m.name ?? 'Team Member',
          action: 'Active and online',
          metric: 'Online',
          trend: 'neutral',
          color: '#0077B6',
          time: m.last_seen_at ? new Date(m.last_seen_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—',
        });
      });
    }

    setItems(feed.slice(0, limit));
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="glass-card p-5 space-y-3">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Today's Activity</p>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-9 h-9 rounded-full bg-slate-200/70" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-slate-200/70 rounded w-3/4" />
              <div className="h-2.5 bg-slate-100/70 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card p-5">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Today's Activity</p>
        <div className="text-center py-6">
          <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">No activity logged yet today</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Today's Activity</p>
        <button className="text-xs text-[#0077B6] font-semibold flex items-center gap-1 hover:gap-2 transition-all">
          View All <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div
            key={item.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/50 transition-all group cursor-default"
          >
            <InitialsAvatar name={item.name} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
              <p className="text-xs text-slate-500 truncate">{item.action}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.needsAction && (
                <span className="btn-gold text-[10px] py-1 px-2.5 rounded-full">Act</span>
              )}
              <div className="text-right">
                <span
                  className="text-xs font-bold flex items-center gap-0.5"
                  style={{ color: item.color }}
                >
                  {item.trend === 'up' && <ArrowUp className="w-3 h-3" />}
                  {item.trend === 'down' && <ArrowDown className="w-3 h-3" />}
                  {item.metric}
                </span>
                <span className="text-[10px] text-slate-400">{item.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
