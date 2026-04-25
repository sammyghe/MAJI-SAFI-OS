'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Inbox, CheckCheck, Clock } from 'lucide-react';

interface Activity {
  id: string;
  activity_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  actor_name: string | null;
  department: string | null;
  visibility: string;
  read_by: string[];
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  sale: 'text-emerald-400',
  expense: 'text-amber-400',
  batch: 'text-blue-400',
  qc: 'text-purple-400',
  issue: 'text-red-400',
  rock: 'text-sky-400',
  default: 'text-zinc-400',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function InboxPanel({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [since, setSince] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const res = await fetch(`/api/inbox?user_id=${user.id}`);
    const data = await res.json();
    setActivities(data.activities ?? []);
    setSince(data.since ?? null);
    setUnread(data.unread_count ?? 0);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    if (!user?.id) return;
    await fetch('/api/inbox', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity_id: id, user_id: user.id }),
    });
    setActivities(prev => prev.map(a => a.id === id ? { ...a, read_by: [...(a.read_by ?? []), user.id] } : a));
    setUnread(u => Math.max(0, u - 1));
  };

  const markAllRead = async () => {
    const unreadItems = activities.filter(a => !(a.read_by ?? []).includes(user?.id ?? ''));
    await Promise.all(unreadItems.map(a => markRead(a.id)));
  };

  if (!user) return null;

  if (compact) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
            <Inbox className="w-3 h-3" /> What happened
            {unread > 0 && <span className="bg-[#0077B6] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{unread}</span>}
          </p>
          {since && <p className="text-[9px] text-zinc-700">since {new Date(since).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</p>}
        </div>
        {loading ? (
          <p className="text-zinc-700 text-[10px] animate-pulse">Loading…</p>
        ) : activities.length === 0 ? (
          <p className="text-zinc-700 text-[10px]">All clear since your last visit.</p>
        ) : (
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {activities.slice(0, 8).map(a => {
              const isUnread = !(a.read_by ?? []).includes(user.id ?? '');
              return (
                <div key={a.id} onClick={() => isUnread && markRead(a.id)}
                  className={`flex items-start gap-2 cursor-pointer rounded-lg px-2 py-1.5 transition-colors ${isUnread ? 'bg-zinc-800/60 hover:bg-zinc-800' : 'hover:bg-zinc-800/30'}`}>
                  {isUnread && <div className="w-1.5 h-1.5 rounded-full bg-[#0077B6] mt-1.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-[10px] leading-relaxed ${isUnread ? 'text-white' : 'text-zinc-500'} truncate`}>{a.description}</p>
                    <p className="text-[9px] text-zinc-700">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-[#0077B6]" />
          <p className="text-sm font-black text-white">Inbox</p>
          {unread > 0 && (
            <span className="bg-[#0077B6] text-white text-[10px] font-black px-2 py-0.5 rounded-full">{unread} new</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {since && (
            <p className="text-[10px] text-zinc-600 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Since {new Date(since).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          )}
          {unread > 0 && (
            <button onClick={markAllRead} className="text-[10px] text-[#7EC8E3] font-black hover:text-white flex items-center gap-1">
              <CheckCheck className="w-3 h-3" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="px-5 py-8 text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading inbox…</p>
      ) : activities.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <CheckCheck className="w-6 h-6 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-600 text-sm">All clear since your last visit.</p>
        </div>
      ) : (
        <div>
          {activities.map(a => {
            const isUnread = !(a.read_by ?? []).includes(user.id ?? '');
            const color = TYPE_COLORS[a.activity_type] ?? TYPE_COLORS.default;
            return (
              <div key={a.id} onClick={() => isUnread && markRead(a.id)}
                className={`flex items-start gap-3 px-5 py-4 border-b border-zinc-800/50 last:border-0 cursor-pointer transition-colors ${isUnread ? 'bg-zinc-800/40 hover:bg-zinc-800/60' : 'hover:bg-zinc-800/20'}`}>
                {isUnread && <div className="w-2 h-2 rounded-full bg-[#0077B6] mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{a.activity_type}</span>
                    {a.department && <span className="text-[10px] text-zinc-600">{a.department}</span>}
                  </div>
                  <p className={`text-sm ${isUnread ? 'text-white font-medium' : 'text-zinc-400'}`}>{a.description}</p>
                  {a.actor_name && <p className="text-[10px] text-zinc-600 mt-0.5">by {a.actor_name}</p>}
                </div>
                <p className="text-[10px] text-zinc-700 shrink-0 mt-0.5">{timeAgo(a.created_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
