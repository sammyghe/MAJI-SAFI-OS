'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { BookOpen, TrendingUp, CheckCircle2, AlertTriangle, XCircle, Minus, Edit2, X, Save } from 'lucide-react';
import { formatMoney } from '@/lib/currency';

interface Version {
  id: string; version_label: string; status: string; summary: string | null; created_at: string;
}

interface Assumption {
  id: string; version_id: string; category: string; label: string;
  assumption_text: string; source_table: string | null; source_metric: string | null;
  actual_value: number | null; target_value: number | null; unit: string | null;
  status: string; notes: string | null; sort_order: number;
}

const CATEGORIES = ['market', 'production', 'revenue', 'costs', 'team', 'funding', 'milestones', 'risks', 'regulatory'] as const;

const CAT_LABELS: Record<string, string> = {
  market: 'Market', production: 'Production', revenue: 'Revenue', costs: 'Costs',
  team: 'Team', funding: 'Funding & Cap Table', milestones: 'Milestones', risks: 'Risks', regulatory: 'Regulatory',
};

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string; label: string }> = {
  on_track:    { icon: TrendingUp,  color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'On Track' },
  at_risk:     { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10',   label: 'At Risk' },
  off_track:   { icon: XCircle,    color: 'text-red-400',    bg: 'bg-red-500/10',      label: 'Off Track' },
  achieved:    { icon: CheckCircle2, color: 'text-sky-400',   bg: 'bg-sky-500/10',     label: 'Achieved' },
  not_started: { icon: Minus,      color: 'text-zinc-500',   bg: 'bg-zinc-800',        label: 'Not Started' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_started;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  );
}

function formatValue(value: number | null, unit: string | null): string {
  if (value === null) return '—';
  if (unit === 'UGX') return formatMoney(value, { compact: true });
  if (unit === 'USD') return `$${value.toLocaleString()}`;
  if (unit === '%') return `${value}%`;
  return `${value.toLocaleString()} ${unit ?? ''}`.trim();
}

export default function BusinessPlanPage() {
  const { user } = useAuth();
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeVersion, setActiveVersion] = useState<Version | null>(null);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ status: '', notes: '', actual_value: '' });
  const [saving, setSaving] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const isFounder = user?.role === 'founder';

  const load = useCallback(async () => {
    setLoading(true);
    const { data: versionData } = await supabase
      .from('business_plan_versions')
      .select('*')
      .eq('location_id', 'buziga')
      .order('created_at', { ascending: false });

    const active = versionData?.find(v => v.status === 'active') ?? versionData?.[0] ?? null;
    setVersions(versionData ?? []);
    setActiveVersion(active);

    if (active) {
      const { data: assumptionData } = await supabase
        .from('business_plan_assumptions')
        .select('*')
        .eq('version_id', active.id)
        .order('sort_order');
      setAssumptions(assumptionData ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const startEdit = (a: Assumption) => {
    setEditingId(a.id);
    setEditForm({ status: a.status, notes: a.notes ?? '', actual_value: String(a.actual_value ?? '') });
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    await supabase.from('business_plan_assumptions').update({
      status: editForm.status,
      notes: editForm.notes || null,
      actual_value: editForm.actual_value ? Number(editForm.actual_value) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    setSaving(false);
    setEditingId(null);
    load();
  };

  // Summary stats
  const total = assumptions.length;
  const byStatus = assumptions.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1; return acc;
  }, {});

  const displayed = categoryFilter === 'all' ? assumptions : assumptions.filter(a => a.category === categoryFilter);
  const grouped = CATEGORIES.reduce<Record<string, Assumption[]>>((acc, cat) => {
    const items = displayed.filter(a => a.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0077B6]" /> Business Plan
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">
            {activeVersion ? activeVersion.version_label : 'No active plan'} · Living document
          </p>
        </div>
        {versions.length > 1 && (
          <select className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
            {versions.map(v => <option key={v.id} value={v.id}>{v.version_label}</option>)}
          </select>
        )}
      </div>

      {/* Summary scorecard */}
      {total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = byStatus[key] ?? 0;
            const Icon = cfg.icon;
            return (
              <div key={key} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <Icon className={`w-4 h-4 mb-2 ${cfg.color}`} />
                <p className="text-2xl font-black text-white">{count}</p>
                <p className={`text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCategoryFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${categoryFilter === 'all' ? 'bg-[#0077B6]/20 text-[#7EC8E3] border border-[#0077B6]/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'}`}>
          All
        </button>
        {CATEGORIES.filter(c => assumptions.some(a => a.category === c)).map(c => (
          <button key={c} onClick={() => setCategoryFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors ${categoryFilter === c ? 'bg-[#0077B6]/20 text-[#7EC8E3] border border-[#0077B6]/30' : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:text-zinc-300'}`}>
            {CAT_LABELS[c]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading plan…</p>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-800/30">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">{CAT_LABELS[cat]}</p>
              </div>
              <div>
                {items.map((a, i) => (
                  <div key={a.id} className={`${i < items.length - 1 ? 'border-b border-zinc-800/50' : ''}`}>
                    <div className="px-5 py-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="text-sm font-black text-white">{a.label}</p>
                          <StatusBadge status={a.status} />
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">{a.assumption_text}</p>
                        {(a.target_value !== null || a.actual_value !== null) && (
                          <div className="flex items-center gap-4 mt-2">
                            {a.target_value !== null && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-zinc-600 uppercase font-black">Target</span>
                                <span className="text-xs font-black text-zinc-400">{formatValue(a.target_value, a.unit)}</span>
                              </div>
                            )}
                            {a.actual_value !== null && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-zinc-600 uppercase font-black">Actual</span>
                                <span className={`text-xs font-black ${a.status === 'on_track' || a.status === 'achieved' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {formatValue(a.actual_value, a.unit)}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {a.notes && <p className="text-[11px] text-zinc-600 mt-1.5 italic">{a.notes}</p>}
                        {a.source_table && (
                          <p className="text-[9px] text-zinc-700 mt-1">[source: {a.source_table}]</p>
                        )}
                      </div>
                      {isFounder && editingId !== a.id && (
                        <button onClick={() => startEdit(a)} className="shrink-0 text-zinc-700 hover:text-zinc-400 transition-colors mt-0.5">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {editingId === a.id && (
                      <div className="px-5 pb-4 bg-zinc-800/30 border-t border-zinc-800/50">
                        <div className="flex flex-wrap gap-3 pt-3">
                          <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                          </select>
                          <input value={editForm.actual_value} onChange={e => setEditForm({ ...editForm, actual_value: e.target.value })}
                            type="number" placeholder={`Actual value${a.unit ? ` (${a.unit})` : ''}`}
                            className="w-40 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                          <input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                            placeholder="Notes"
                            className="flex-1 min-w-40 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                          <button onClick={() => saveEdit(a.id)} disabled={saving}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30 disabled:opacity-40">
                            <Save className="w-3 h-3" /> {saving ? '…' : 'Save'}
                          </button>
                          <button onClick={() => setEditingId(null)}><X className="w-4 h-4 text-zinc-500" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeVersion?.summary && (
        <p className="text-[10px] text-zinc-700">{activeVersion.summary}</p>
      )}
    </div>
  );
}
