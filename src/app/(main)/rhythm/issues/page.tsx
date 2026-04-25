'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { AlertCircle, Plus, ChevronDown, CheckCircle2, ArrowRight } from 'lucide-react';

interface Issue {
  id: string;
  title: string;
  description: string | null;
  raised_by: string;
  owner_dept: string | null;
  stage: 'identified' | 'discussing' | 'solving' | 'resolved';
  priority: 'low' | 'medium' | 'high' | 'critical';
  resolution: string | null;
  created_at: string;
}

const STAGES = ['identified', 'discussing', 'solving'] as const;
const STAGE_CONFIG = {
  identified: {
    label: 'Identified',
    subtitle: 'I — Identify the issue',
    border: 'border-zinc-700',
    bg: 'bg-zinc-900',
    header: 'bg-zinc-800/50',
    dot: 'bg-zinc-500',
  },
  discussing: {
    label: 'Discussing',
    subtitle: 'D — Discuss root cause',
    border: 'border-amber-500/20',
    bg: 'bg-amber-500/5',
    header: 'bg-amber-500/10',
    dot: 'bg-amber-400',
  },
  solving: {
    label: 'Solving',
    subtitle: 'S — Solve with next action',
    border: 'border-[#0077B6]/20',
    bg: 'bg-[#0077B6]/5',
    header: 'bg-[#0077B6]/10',
    dot: 'bg-[#0077B6]',
  },
};

const PRIORITY_CONFIG = {
  low:      { label: 'Low',      color: 'text-zinc-500',   bg: 'bg-zinc-800' },
  medium:   { label: 'Medium',   color: 'text-zinc-300',   bg: 'bg-zinc-700' },
  high:     { label: 'High',     color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/10' },
};

function AddIssueModal({ onClose, onSave, userName }: {
  onClose: () => void;
  onSave: () => void;
  userName: string;
}) {
  const [form, setForm] = useState({
    title: '', description: '', owner_dept: '',
    priority: 'medium' as Issue['priority'],
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    await supabase.from('issues').insert({
      title: form.title.trim(),
      description: form.description.trim() || null,
      raised_by: userName,
      owner_dept: form.owner_dept.trim() || null,
      priority: form.priority,
      location_id: 'buziga',
    });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-sm font-black text-white uppercase tracking-widest">Identify Issue</h3>

        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Issue title *"
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50"
        />
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Describe the issue (optional)"
          rows={3}
          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50 resize-none"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            value={form.owner_dept}
            onChange={(e) => setForm({ ...form, owner_dept: e.target.value })}
            placeholder="Department (optional)"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50"
          />
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value as Issue['priority'] })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#0077B6]/50"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-xs font-black text-zinc-400 uppercase tracking-widest hover:bg-zinc-700 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.title.trim()}
            className="flex-1 py-2.5 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Add Issue'}
          </button>
        </div>
      </div>
    </div>
  );
}

function IssueCard({ issue, onUpdate }: { issue: Issue; onUpdate: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [resolution, setResolution] = useState(issue.resolution ?? '');
  const [saving, setSaving] = useState(false);

  const NEXT_STAGE: Record<string, Issue['stage'] | null> = {
    identified: 'discussing',
    discussing: 'solving',
    solving: 'resolved',
    resolved: null,
  };

  const handleMove = async (stage: Issue['stage']) => {
    setSaving(true);
    await supabase.from('issues').update({
      stage,
      updated_at: new Date().toISOString(),
      ...(stage === 'resolved' ? { resolved_at: new Date().toISOString(), resolution: resolution || null } : {}),
    }).eq('id', issue.id);
    setSaving(false);
    onUpdate();
  };

  const pcfg = PRIORITY_CONFIG[issue.priority];
  const nextStage = NEXT_STAGE[issue.stage];
  const daysAgo = Math.floor((Date.now() - new Date(issue.created_at).getTime()) / 86400000);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="px-4 py-3 cursor-pointer flex items-start gap-3" onClick={() => setExpanded(!expanded)}>
        <AlertCircle className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">{issue.title}</p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            {issue.raised_by} · {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
            {issue.owner_dept && ` · ${issue.owner_dept}`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${pcfg.color} ${pcfg.bg}`}>
            {pcfg.label}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800/50 pt-3 space-y-3">
          {issue.description && (
            <p className="text-xs text-zinc-400">{issue.description}</p>
          )}

          {issue.stage === 'solving' && (
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Document the solution / next action…"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50 resize-none"
            />
          )}

          {nextStage && (
            <button
              onClick={() => handleMove(nextStage)}
              disabled={saving || (issue.stage === 'solving' && !resolution.trim())}
              className="flex items-center gap-2 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#7EC8E3] hover:bg-[#0077B6]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowRight className="w-3 h-3" />
              {saving ? 'Moving…' : `Move to ${STAGE_CONFIG[nextStage as keyof typeof STAGE_CONFIG]?.label ?? 'Resolved'}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ResolvedSection({ issues, onUpdate }: { issues: Issue[]; onUpdate: () => void }) {
  const [open, setOpen] = useState(false);
  if (issues.length === 0) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-black text-white uppercase tracking-widest">
            Resolved ({issues.length})
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {issues.map((issue) => (
            <div key={issue.id} className="flex items-start gap-3 py-2 border-b border-zinc-800 last:border-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-zinc-400 line-through">{issue.title}</p>
                {issue.resolution && (
                  <p className="text-[10px] text-zinc-600 mt-0.5">→ {issue.resolution}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function IssuesPage() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('issues')
      .select('*')
      .eq('location_id', 'buziga')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);
    setIssues(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const active = issues.filter((i) => i.stage !== 'resolved');
  const resolved = issues.filter((i) => i.stage === 'resolved');

  return (
    <div className="px-5 py-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-amber-400" />
            Issues — IDS
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">
            {user?.name?.split(' ')[0]} · Identify · Discuss · Solve
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-xl text-xs font-black text-amber-400 uppercase tracking-widest hover:bg-amber-500/30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Identify Issue
        </button>
      </div>

      {loading ? (
        <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading issues…</p>
      ) : (
        <>
          {/* IDS Kanban */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {STAGES.map((stage) => {
              const stageIssues = active.filter((i) => i.stage === stage);
              const cfg = STAGE_CONFIG[stage];
              return (
                <div key={stage} className={`border ${cfg.border} ${cfg.bg} rounded-2xl overflow-hidden`}>
                  <div className={`${cfg.header} px-4 py-3 border-b ${cfg.border}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <p className="text-xs font-black text-white uppercase tracking-widest">{cfg.label}</p>
                      <span className="text-[10px] text-zinc-500 ml-auto">{stageIssues.length}</span>
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-0.5">{cfg.subtitle}</p>
                  </div>
                  <div className="p-3 space-y-2 min-h-[100px]">
                    {stageIssues.length === 0 ? (
                      <p className="text-[10px] text-zinc-700 text-center py-4">No issues</p>
                    ) : (
                      stageIssues.map((issue) => (
                        <IssueCard key={issue.id} issue={issue} onUpdate={load} />
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <ResolvedSection issues={resolved} onUpdate={load} />
        </>
      )}

      {showAdd && (
        <AddIssueModal
          onClose={() => setShowAdd(false)}
          onSave={load}
          userName={user?.name ?? 'Unknown'}
        />
      )}
    </div>
  );
}
