'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { GitBranch, Edit2, X, Save, Plus, Download, ToggleLeft, ToggleRight, Info } from 'lucide-react';

interface Relationship {
  id: string;
  source_dept_slug: string;
  target_dept_slug: string;
  data_category: string;
  share_type: 'summary' | 'detail' | 'alert' | 'none';
  entity_table: string | null;
  refresh_frequency: string;
  why_shared: string;
  active: boolean;
}

const DEPTS = [
  'founder-office', 'production', 'quality', 'inventory',
  'dispatch', 'sales', 'marketing', 'finance', 'compliance', 'technology',
];

const DEPT_LABELS: Record<string, string> = {
  'founder-office': 'Founder', 'production': 'Production', 'quality': 'Quality',
  'inventory': 'Inventory', 'dispatch': 'Dispatch', 'sales': 'Sales',
  'marketing': 'Marketing', 'finance': 'Finance', 'compliance': 'Compliance',
  'technology': 'Technology',
};

const SHARE_TYPE_STYLE: Record<string, { cell: string; badge: string; label: string }> = {
  detail:  { cell: 'bg-[#0077B6]/20 hover:bg-[#0077B6]/30', badge: 'bg-[#0077B6]/20 text-[#7EC8E3]',   label: 'Detail' },
  summary: { cell: 'bg-emerald-500/10 hover:bg-emerald-500/20', badge: 'bg-emerald-500/10 text-emerald-400', label: 'Summary' },
  alert:   { cell: 'bg-red-500/10 hover:bg-red-500/20', badge: 'bg-red-500/10 text-red-400',            label: 'Alert' },
  none:    { cell: 'bg-slate-100/30', badge: 'bg-slate-100 text-slate-600',                                 label: 'None' },
};

function ShareTypeBadge({ type }: { type: string }) {
  const s = SHARE_TYPE_STYLE[type] ?? SHARE_TYPE_STYLE.none;
  return <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${s.badge}`}>{s.label}</span>;
}

export default function DataFlowPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isFounder = user?.role === 'founder';
  const isCFO = isFounder || user?.permissions?.can_view_financials;

  useEffect(() => { if (user && !isCFO) router.push('/'); }, [user, isCFO]);

  const [rels, setRels] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Relationship | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ why_shared: '', share_type: 'summary', entity_table: '' });
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    source_dept_slug: 'production', target_dept_slug: 'finance',
    data_category: '', share_type: 'summary', entity_table: '', why_shared: '',
  });
  const [filterSource, setFilterSource] = useState('');
  const [filterTarget, setFilterTarget] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('information_relationships').select('*').order('source_dept_slug').order('target_dept_slug');
    setRels(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build matrix: source rows × target columns, cell = first active relationship
  const matrix: Record<string, Record<string, Relationship[]>> = {};
  for (const rel of rels) {
    if (!matrix[rel.source_dept_slug]) matrix[rel.source_dept_slug] = {};
    if (!matrix[rel.source_dept_slug][rel.target_dept_slug]) matrix[rel.source_dept_slug][rel.target_dept_slug] = [];
    matrix[rel.source_dept_slug][rel.target_dept_slug].push(rel);
  }

  const toggleActive = async (rel: Relationship) => {
    await supabase.from('information_relationships').update({ active: !rel.active, updated_at: new Date().toISOString() }).eq('id', rel.id);
    load();
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from('information_relationships').update({
      why_shared: editForm.why_shared,
      share_type: editForm.share_type,
      entity_table: editForm.entity_table || null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id);
    setSaving(false);
    setEditing(false);
    setSelected(null);
    load();
  };

  const addRelationship = async () => {
    if (!addForm.data_category || !addForm.why_shared) return;
    setSaving(true);
    await supabase.from('information_relationships').insert({
      source_dept_slug: addForm.source_dept_slug,
      target_dept_slug: addForm.target_dept_slug,
      data_category: addForm.data_category,
      share_type: addForm.share_type,
      entity_table: addForm.entity_table || null,
      why_shared: addForm.why_shared,
      created_by: user?.name ?? 'founder',
    });
    setSaving(false);
    setShowAdd(false);
    setAddForm({ source_dept_slug: 'production', target_dept_slug: 'finance', data_category: '', share_type: 'summary', entity_table: '', why_shared: '' });
    load();
  };

  const exportCSV = () => {
    const headers = ['Source', 'Target', 'Category', 'Share Type', 'Entity Table', 'Frequency', 'Active', 'Why Shared'];
    const rows = rels.map(r => [r.source_dept_slug, r.target_dept_slug, r.data_category, r.share_type, r.entity_table ?? '', r.refresh_frequency, r.active ? 'Yes' : 'No', `"${r.why_shared}"`]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = 'maji-safi-data-flow-matrix.csv'; a.click();
  };

  const filteredRels = rels.filter(r =>
    (!filterSource || r.source_dept_slug === filterSource) &&
    (!filterTarget || r.target_dept_slug === filterTarget)
  );

  // Summary stats
  const totalActive = rels.filter(r => r.active).length;
  const byType = rels.reduce<Record<string, number>>((acc, r) => { acc[r.share_type] = (acc[r.share_type] ?? 0) + 1; return acc; }, {});

  if (!isCFO) return null;

  return (
    <div className="px-6 py-6 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-[#0077B6]" /> Data Flow Matrix
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">
            {totalActive} active flows · {rels.length} total · Click cell → edit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30">
            <Plus className="w-3.5 h-3.5" /> Add Flow
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-400 hover:text-white">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {/* Type summary */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(SHARE_TYPE_STYLE).map(([type, s]) => (
          <span key={type} className={`text-[10px] font-black px-3 py-1.5 rounded-lg ${s.badge}`}>
            {s.label}: {byType[type] ?? 0}
          </span>
        ))}
      </div>

      {/* Add flow form */}
      {showAdd && (
        <div className="bg-white border border-[#0077B6]/30 rounded-2xl p-5 space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">New Data Flow</p>
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-black mb-1">Source Dept</p>
              <select value={addForm.source_dept_slug} onChange={e => setAddForm({...addForm, source_dept_slug: e.target.value})}
                className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                {DEPTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-black mb-1">Target Dept</p>
              <select value={addForm.target_dept_slug} onChange={e => setAddForm({...addForm, target_dept_slug: e.target.value})}
                className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                {DEPTS.map(d => <option key={d} value={d}>{DEPT_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <p className="text-[9px] text-slate-600 uppercase font-black mb-1">Data Category</p>
              <input value={addForm.data_category} onChange={e => setAddForm({...addForm, data_category: e.target.value})}
                placeholder="e.g. daily_jar_count"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>
            <div>
              <p className="text-[9px] text-slate-600 uppercase font-black mb-1">Share Type</p>
              <select value={addForm.share_type} onChange={e => setAddForm({...addForm, share_type: e.target.value})}
                className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                <option value="summary">Summary</option>
                <option value="detail">Detail</option>
                <option value="alert">Alert</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="flex-1 min-w-40">
              <p className="text-[9px] text-slate-600 uppercase font-black mb-1">Entity Table</p>
              <input value={addForm.entity_table} onChange={e => setAddForm({...addForm, entity_table: e.target.value})}
                placeholder="e.g. production_logs"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3">
            <input value={addForm.why_shared} onChange={e => setAddForm({...addForm, why_shared: e.target.value})}
              placeholder="Why is this data shared? (required)"
              className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
            <button onClick={addRelationship} disabled={saving || !addForm.data_category || !addForm.why_shared}
              className="px-5 py-2 bg-[#0077B6] rounded-lg text-xs font-black text-white hover:bg-[#0077B6]/80 disabled:opacity-40">
              {saving ? '…' : 'Add'}
            </button>
            <button onClick={() => setShowAdd(false)}><X className="w-4 h-4 text-slate-500" /></button>
          </div>
        </div>
      )}

      {/* Matrix view */}
      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading matrix…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-max text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left px-3 py-2 text-[10px] text-slate-600 font-black uppercase tracking-widest w-28 border-b border-slate-200">
                  Source ↓ / Target →
                </th>
                {DEPTS.map(target => (
                  <th key={target} className="px-2 py-2 text-center border-b border-slate-200 min-w-[90px]">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                      {DEPT_LABELS[target]}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DEPTS.map(source => (
                <tr key={source} className="border-b border-zinc-900">
                  <td className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap border-r border-slate-200">
                    {DEPT_LABELS[source]}
                  </td>
                  {DEPTS.map(target => {
                    if (source === target) {
                      return <td key={target} className="px-2 py-1 text-center bg-white/50"><span className="text-slate-800">—</span></td>;
                    }
                    const cellRels = matrix[source]?.[target] ?? [];
                    const activeRels = cellRels.filter(r => r.active);
                    const topRel = activeRels[0] ?? cellRels[0];

                    if (!topRel) {
                      return <td key={target} className="px-2 py-1"><div className="w-full h-8 rounded" /></td>;
                    }

                    const style = SHARE_TYPE_STYLE[topRel.active ? topRel.share_type : 'none'];
                    return (
                      <td key={target} className="px-2 py-1">
                        <button
                          onClick={() => { setSelected(topRel); setEditing(false); setEditForm({ why_shared: topRel.why_shared, share_type: topRel.share_type, entity_table: topRel.entity_table ?? '' }); }}
                          className={`w-full rounded-lg px-2 py-1.5 text-center transition-colors ${style.cell} ${!topRel.active ? 'opacity-30' : ''}`}
                          title={topRel.data_category}
                        >
                          <span className={`text-[9px] font-black uppercase block truncate ${topRel.active ? '' : 'text-slate-600'}`}>
                            {topRel.data_category.replace(/_/g, ' ')}
                          </span>
                          {activeRels.length > 1 && (
                            <span className="text-[8px] text-slate-600">+{activeRels.length - 1}</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-slate-600">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#0077B6]/20" />Detail — row-level data</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500/10" />Summary — aggregated totals</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/10" />Alert — triggers/notifications</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-100/30" />None / inactive</span>
      </div>

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setSelected(null); setEditing(false); }}>
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">
                  {DEPT_LABELS[selected.source_dept_slug]} → {DEPT_LABELS[selected.target_dept_slug]}
                </p>
                <h3 className="text-lg font-black text-white mt-1">{selected.data_category.replace(/_/g, ' ')}</h3>
              </div>
              <button onClick={() => { setSelected(null); setEditing(false); }}><X className="w-5 h-5 text-slate-500" /></button>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <ShareTypeBadge type={selected.share_type} />
              {selected.entity_table && (
                <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">{selected.entity_table}</span>
              )}
              <span className="text-[10px] text-slate-600">{selected.refresh_frequency === 'realtime' ? '⚡ Live' : `↻ ${selected.refresh_frequency}`}</span>
              <span className={`text-[10px] font-black ${selected.active ? 'text-emerald-400' : 'text-slate-600'}`}>
                {selected.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {editing ? (
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Why shared</p>
                  <textarea value={editForm.why_shared} onChange={e => setEditForm({...editForm, why_shared: e.target.value})}
                    rows={3}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-white resize-none focus:outline-none focus:border-[#0077B6]/50" />
                </div>
                <div className="flex gap-3">
                  <select value={editForm.share_type} onChange={e => setEditForm({...editForm, share_type: e.target.value})}
                    className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                    <option value="summary">Summary</option>
                    <option value="detail">Detail</option>
                    <option value="alert">Alert</option>
                    <option value="none">None</option>
                  </select>
                  <input value={editForm.entity_table} onChange={e => setEditForm({...editForm, entity_table: e.target.value})}
                    placeholder="Entity table"
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div className="flex gap-3">
                  <button onClick={saveEdit} disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30 disabled:opacity-40">
                    <Save className="w-3 h-3" /> {saving ? '…' : 'Save'}
                  </button>
                  <button onClick={() => setEditing(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-slate-100/50 rounded-xl p-4">
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-1 flex items-center gap-1">
                    <Info className="w-2.5 h-2.5" /> Why this data is shared
                  </p>
                  <p className="text-sm text-slate-300 leading-relaxed">{selected.why_shared}</p>
                </div>
                {isFounder && (
                  <div className="flex gap-3">
                    <button onClick={() => setEditing(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs font-black text-slate-400 hover:text-white">
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                    <button onClick={() => toggleActive(selected)}
                      className={`flex items-center gap-1.5 px-4 py-2 border rounded-lg text-xs font-black ${selected.active ? 'bg-slate-100 border-slate-200 text-slate-400 hover:text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'}`}>
                      {selected.active ? <ToggleLeft className="w-3 h-3" /> : <ToggleRight className="w-3 h-3" />}
                      {selected.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
