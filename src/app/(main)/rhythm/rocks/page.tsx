'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Target, Plus, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

interface Rock {
  id: string;
  title: string;
  description: string | null;
  owner_name: string;
  owner_dept: string;
  quarter: string;
  category: 'foundation' | 'execution' | 'scaling';
  status: 'on_track' | 'at_risk' | 'off_track' | 'complete';
  progress_pct: number;
  due_date: string | null;
}

const CATEGORIES = ['foundation', 'execution', 'scaling'] as const;
const CATEGORY_CONFIG = {
  foundation: { label: 'Foundation', color: 'text-[#7EC8E3]', border: 'border-[#7EC8E3]/20', bg: 'bg-[#7EC8E3]/5' },
  execution:  { label: 'Execution',  color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
  scaling:    { label: 'Scaling',    color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5' },
};

const STATUS_ICONS = {
  on_track:  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  at_risk:   <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  off_track: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  complete:  <CheckCircle2 className="w-3.5 h-3.5 text-[#0077B6]" />,
};

const STATUS_LABELS = {
  on_track: 'On Track', at_risk: 'At Risk', off_track: 'Off Track', complete: 'Complete',
};

function currentQuarter(): string {
  const d = new Date();
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()}-Q${q}`;
}

function AddRockModal({ quarter, onClose, onSave }: {
  quarter: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    title: '', description: '', owner_name: '', owner_dept: '',
    category: 'execution' as Rock['category'],
    due_date: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim() || !form.owner_name.trim()) return;
    setSaving(true);
    await supabase.from('rocks').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      owner_name: form.owner_name.trim(),
      owner_dept: form.owner_dept.trim() || 'founder-office',
      quarter,
      category: form.category,
      due_date: form.due_date || null,
      location_id: 'buziga',
    });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-black text-white uppercase tracking-widest">New Rock</h3>

        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Rock title *"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Description (optional)"
          rows={2}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50 resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={form.owner_name}
            onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
            placeholder="Owner name *"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50"
          />
          <input
            value={form.owner_dept}
            onChange={(e) => setForm({ ...form, owner_dept: e.target.value })}
            placeholder="Department"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value as Rock['category'] })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0077B6]/50"
          >
            <option value="foundation">Foundation</option>
            <option value="execution">Execution</option>
            <option value="scaling">Scaling</option>
          </select>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => setForm({ ...form, due_date: e.target.value })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0077B6]/50"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-black text-zinc-400 uppercase tracking-widest hover:bg-zinc-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim() || !form.owner_name.trim()}
            className="flex-1 py-2.5 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Add Rock'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RockCard({ rock, onUpdate }: { rock: Rock; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleProgressChange = async (pct: number) => {
    setUpdating(true);
    const status: Rock['status'] = pct === 100 ? 'complete' : pct >= 70 ? 'on_track' : pct >= 40 ? 'at_risk' : 'off_track';
    await supabase.from('rocks').update({
      progress_pct: pct,
      status,
      completed_at: pct === 100 ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq('id', rock.id);
    setUpdating(false);
    onUpdate();
  };

  const cfg = CATEGORY_CONFIG[rock.category];

  return (
    <div className={`border ${cfg.border} ${cfg.bg} rounded-2xl overflow-hidden`}>
      <div
        className="px-4 py-3 cursor-pointer flex items-center gap-3"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-shrink-0">{STATUS_ICONS[rock.status]}</div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-black text-white ${rock.status === 'complete' ? 'line-through text-zinc-500' : ''}`}>
            {rock.title}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {rock.owner_name} · {rock.owner_dept}
            {rock.due_date && ` · Due ${new Date(rock.due_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-black ${cfg.color}`}>{rock.progress_pct}%</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />}
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="w-full bg-zinc-800/60 rounded-full h-1">
          <div
            className={`h-1 rounded-full transition-all ${rock.status === 'complete' ? 'bg-[#0077B6]' : rock.status === 'on_track' ? 'bg-emerald-500' : rock.status === 'at_risk' ? 'bg-amber-500' : 'bg-red-500'}`}
            style={{ width: `${rock.progress_pct}%` }}
          />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-zinc-800/40 pt-3">
          {rock.description && (
            <p className="text-xs text-zinc-400">{rock.description}</p>
          )}
          <div>
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-2">Progress</p>
            <div className="flex gap-2 flex-wrap">
              {[0, 10, 25, 50, 75, 90, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => handleProgressChange(pct)}
                  disabled={updating}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    rock.progress_pct === pct
                      ? `${cfg.bg} ${cfg.color} border ${cfg.border}`
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RocksPage() {
  const { user } = useAuth();
  const [rocks, setRocks] = useState<Rock[]>([]);
  const [loading, setLoading] = useState(true);
  const [quarter, setQuarter] = useState(currentQuarter());
  const [showAdd, setShowAdd] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('rocks')
      .select('*')
      .eq('location_id', 'buziga')
      .eq('quarter', quarter)
      .order('category')
      .order('created_at');
    setRocks(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    channelRef.current = supabase
      .channel('rt:rocks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rocks' }, () => load())
      .subscribe();
    const handleVisibility = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [quarter]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevQuarters = [-1, 0, 1, 2].map((offset) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset * 3);
    const q = Math.ceil((d.getMonth() + 1) / 3);
    return `${d.getFullYear()}-Q${q}`;
  }).filter((v, i, a) => a.indexOf(v) === i);

  const complete = rocks.filter(r => r.status === 'complete').length;
  const total = rocks.length;

  return (
    <div className="px-5 py-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-[#0077B6]" />
            Quarterly Rocks
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">
            {user?.name?.split(' ')[0]} · What matters this quarter
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={quarter}
            onChange={(e) => setQuarter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none"
          >
            {prevQuarters.map((q) => (
              <option key={q} value={q}>{q}</option>
            ))}
          </select>
          {(user?.role === 'founder' || user?.permissions?.can_manage_rocks) && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Rock
            </button>
          )}
        </div>
      </div>

      {/* Progress summary */}
      {total > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center gap-4">
          <TrendingUp className="w-5 h-5 text-[#7EC8E3] flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-black text-white">{complete}/{total} Rocks Complete</p>
              <p className="text-xs font-black text-[#7EC8E3]">{Math.round((complete / total) * 100)}%</p>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-[#0077B6] transition-all" style={{ width: `${Math.round((complete / total) * 100)}%` }} />
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading rocks…</p>
      ) : total === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
          <Target className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-bold">No rocks for {quarter} yet.</p>
          <p className="text-zinc-600 text-xs mt-1">Add your quarterly priorities to get started.</p>
        </div>
      ) : (
        CATEGORIES.map((cat) => {
          const catRocks = rocks.filter((r) => r.category === cat);
          if (catRocks.length === 0) return null;
          const cfg = CATEGORY_CONFIG[cat];
          return (
            <div key={cat} className="space-y-2">
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${cfg.color} flex items-center gap-2`}>
                {cfg.label}
                <span className="text-zinc-600">({catRocks.length})</span>
              </p>
              {catRocks.map((rock) => (
                <RockCard key={rock.id} rock={rock} onUpdate={load} />
              ))}
            </div>
          );
        })
      )}

      {showAdd && <AddRockModal quarter={quarter} onClose={() => setShowAdd(false)} onSave={load} />}
    </div>
  );
}
