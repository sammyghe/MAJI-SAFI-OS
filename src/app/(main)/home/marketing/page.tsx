'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Plus } from 'lucide-react';
import TodaysFocus from '@/components/TodaysFocus';
import InboxPanel from '@/components/InboxPanel';

type PipelineStage = 'lead' | 'contacted' | 'qualified' | 'converted';

interface Prospect {
  id: string;
  name: string;
  zone: string | null;
  status: PipelineStage;
  last_contact_date: string | null;
  follow_up_date: string | null;
}

const STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'lead',      label: 'Lead',      color: '#475569' },
  { key: 'contacted', label: 'Contacted', color: '#0077B6' },
  { key: 'qualified', label: 'Qualified', color: '#f59e0b' },
  { key: 'converted', label: 'Converted', color: '#22c55e' },
];

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

export default function MarketingHome() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);
  const [showFollowups, setShowFollowups] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('distributors')
      .select('id, name, zone, status, last_order_date, created_at')
      .eq('location_id', 'buziga')
      .order('created_at', { ascending: false })
      .limit(40);

    // Map distributor status to pipeline stages
    const mapped: Prospect[] = (data ?? []).map((d) => {
      const stage: PipelineStage =
        d.status === 'active' ? 'converted' :
        d.status === 'sleeping' ? 'qualified' :
        d.status === 'churned' ? 'contacted' : 'lead';
      return {
        id: d.id,
        name: d.name,
        zone: d.zone,
        status: stage,
        last_contact_date: d.last_order_date ?? null,
        follow_up_date: null,
      };
    });
    setProspects(mapped);
    setLoading(false);
  };

  const moveStage = async (id: string, newStage: PipelineStage) => {
    setMoving(id);
    const dbStatus = newStage === 'converted' ? 'active' : newStage === 'qualified' ? 'sleeping' : newStage === 'contacted' ? 'churned' : 'churned';
    await supabase.from('distributors').update({ status: dbStatus }).eq('id', id);
    setProspects((prev) => prev.map((p) => p.id === id ? { ...p, status: newStage } : p));
    setMoving(null);
  };

  const stats = {
    total: prospects.length,
    thisWeek: prospects.filter((p) => {
      const d = p.last_contact_date;
      if (!d) return false;
      return new Date(d) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length,
    converted: prospects.filter((p) => p.status === 'converted').length,
  };

  const followupsToday = prospects.filter((p) => isOverdue(p.follow_up_date));

  return (
    <div className="px-5 py-6 max-w-7xl mx-auto">
      {/* Inbox */}
      <div className="mb-4">
        <InboxPanel compact />
      </div>

      {/* Today's Focus */}
      <div className="mb-6">
        <TodaysFocus department="marketing" compact />
      </div>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Pipeline</h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">{user?.name?.split(' ')[0]} · Marketing</p>
        </div>
        <div className="flex gap-4">
          {[
            { label: 'In Pipeline', value: stats.total },
            { label: 'Active This Week', value: stats.thisWeek },
            { label: 'Converted', value: stats.converted },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-white">{s.value}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Kanban */}
      {loading ? (
        <p className="text-slate-500 text-sm animate-pulse">Loading pipeline…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {STAGES.map((stage) => {
            const cards = prospects.filter((p) => p.status === stage.key);
            return (
              <div key={stage.key} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 min-h-48">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">{stage.label}</h3>
                  <span className="ml-auto text-[10px] text-slate-500">{cards.length}</span>
                </div>
                <div className="space-y-2">
                  {cards.map((p) => (
                    <div key={p.id} className="bg-zinc-800 rounded-xl p-3">
                      <p className="text-xs font-bold text-white">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.zone ?? 'Unknown zone'}</p>
                      {p.last_contact_date && (
                        <p className="text-[10px] text-slate-600 mt-1">
                          Last: {new Date(p.last_contact_date).toLocaleDateString('en-GB')}
                        </p>
                      )}
                      {/* Move dropdown */}
                      <select
                        value={p.status}
                        onChange={(e) => moveStage(p.id, e.target.value as PipelineStage)}
                        disabled={moving === p.id}
                        className="mt-2 w-full bg-zinc-700 text-[10px] text-slate-300 rounded px-1 py-1 border-0 outline-none"
                      >
                        {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Today's Follow-ups */}
      {followupsToday.length > 0 && (
        <button
          onClick={() => setShowFollowups(!showFollowups)}
          className="w-full text-left p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-4"
        >
          <p className="text-amber-400 font-bold text-xs uppercase tracking-widest">
            ⚠ {followupsToday.length} Follow-up{followupsToday.length > 1 ? 's' : ''} Overdue
          </p>
          {showFollowups && (
            <div className="mt-3 space-y-1">
              {followupsToday.map((p) => (
                <p key={p.id} className="text-xs text-amber-300">{p.name} — {p.zone}</p>
              ))}
            </div>
          )}
        </button>
      )}

      <a href="/marketing" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0077B6] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#0077B6]/90 transition-colors">
        <Plus className="w-4 h-4" />
        Add Prospect
      </a>
    </div>
  );
}
