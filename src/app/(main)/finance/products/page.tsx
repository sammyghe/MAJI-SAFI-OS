'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Package, Plus, Edit2, X, ChevronDown, ChevronUp, DollarSign, BarChart2, Target } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  unit_type: string | null;
  active: boolean;
  display_order: number;
}

interface Pricing {
  id: string;
  product_id: string;
  tier: string;
  price_ugx: number;
  effective_from: string;
  effective_to: string | null;
  delivery_included: boolean;
  notes: string | null;
}

interface UnitEcon {
  id: string;
  product_id: string;
  cost_component: string;
  cost_ugx: number;
  effective_from: string;
  effective_to: string | null;
}

interface ProductTarget {
  id: string;
  product_id: string;
  target_type: string;
  target_value: number;
  period: string | null;
}

const TIERS = ['T1', 'T2', 'T3', 'T4', 'wholesale', 'retail'];
const COST_COMPONENTS = ['jar', 'cap', 'label', 'chemical', 'electricity', 'water', 'labor', 'packaging', 'other'];
const CATEGORIES = ['volume_jar', 'premium_bottle', 'service', 'franchise'];
const TARGET_TYPES = ['daily_units', 'monthly_units', 'monthly_revenue', 'daily_profit'];
const TABS = ['Products', 'Pricing', 'Unit Economics', 'Targets'] as const;

function fmtUGX(n: number) {
  return `UGX ${n.toLocaleString()}`;
}

function AddProductModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ sku: '', name: '', description: '', category: '', unit: '20L', unit_type: 'refill' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.sku.trim() || !form.name.trim()) return;
    setSaving(true);
    await supabase.from('products').insert({
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category || null,
      unit: form.unit,
      unit_type: form.unit_type || null,
      created_by: user?.name,
    });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Add Product</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} placeholder="SKU (e.g. 20L-RF) *" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50" />
          <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Product name *" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50" />
        </div>
        <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description (optional)" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50" />
        <div className="grid grid-cols-3 gap-3">
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
            <option value="">Category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={form.unit} onChange={e => setForm({...form, unit: e.target.value})} placeholder="Unit (20L, 5L…)" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none" />
          <input value={form.unit_type} onChange={e => setForm({...form, unit_type: e.target.value})} placeholder="Unit type" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none" />
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-zinc-700">Cancel</button>
          <button onClick={save} disabled={saving || !form.sku || !form.name} className="flex-1 py-2.5 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30 disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PricingCell({ productId, tier, pricings, onRefresh }: {
  productId: string; tier: string; pricings: Pricing[]; onRefresh: () => void;
}) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const active = pricings.find(p => p.product_id === productId && p.tier === tier && p.effective_from <= today && (!p.effective_to || p.effective_to >= today));
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(active?.price_ugx ?? ''));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!val || isNaN(Number(val))) return;
    setSaving(true);
    if (active) {
      await supabase.from('product_pricing').update({ effective_to: today }).eq('id', active.id);
    }
    await supabase.from('product_pricing').insert({
      product_id: productId, tier, price_ugx: Number(val),
      effective_from: today, created_by: user?.name,
    });
    setSaving(false);
    setEditing(false);
    onRefresh();
  };

  if (editing) return (
    <div className="flex items-center gap-1">
      <input value={val} onChange={e => setVal(e.target.value)} type="number" className="w-24 bg-zinc-700 border border-[#0077B6]/50 rounded px-2 py-1 text-xs text-white focus:outline-none" autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
      <button onClick={save} disabled={saving} className="text-[10px] text-[#7EC8E3] font-black">OK</button>
    </div>
  );

  return (
    <button onClick={() => { setVal(String(active?.price_ugx ?? '')); setEditing(true); }} className="text-xs text-slate-300 hover:text-white tabular-nums w-full text-left">
      {active ? active.price_ugx.toLocaleString() : <span className="text-slate-700">—</span>}
    </button>
  );
}

function UnitEconCell({ productId, component, econRows, onRefresh }: {
  productId: string; component: string; econRows: UnitEcon[]; onRefresh: () => void;
}) {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const active = econRows.find(e => e.product_id === productId && e.cost_component === component && e.effective_from <= today && (!e.effective_to || e.effective_to >= today));
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(active?.cost_ugx ?? ''));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!val || isNaN(Number(val))) return;
    setSaving(true);
    if (active) await supabase.from('product_unit_economics').update({ effective_to: today }).eq('id', active.id);
    await supabase.from('product_unit_economics').insert({
      product_id: productId, cost_component: component, cost_ugx: Number(val),
      effective_from: today,
    });
    setSaving(false);
    setEditing(false);
    onRefresh();
  };

  if (editing) return (
    <div className="flex items-center gap-1">
      <input value={val} onChange={e => setVal(e.target.value)} type="number" className="w-20 bg-zinc-700 border border-amber-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none" autoFocus onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }} />
      <button onClick={save} disabled={saving} className="text-[10px] text-amber-400 font-black">OK</button>
    </div>
  );

  return (
    <button onClick={() => { setVal(String(active?.cost_ugx ?? '')); setEditing(true); }} className="text-xs text-slate-300 hover:text-white tabular-nums w-full text-left">
      {active ? active.cost_ugx.toLocaleString() : <span className="text-slate-700">—</span>}
    </button>
  );
}

export default function ProductsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]>('Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [pricings, setPricings] = useState<Pricing[]>([]);
  const [econRows, setEconRows] = useState<UnitEcon[]>([]);
  const [targets, setTargets] = useState<ProductTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addingTarget, setAddingTarget] = useState<string | null>(null);
  const [targetForm, setTargetForm] = useState({ target_type: 'daily_units', target_value: '', period: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [pr, pp, pe, pt] = await Promise.all([
      supabase.from('products').select('*').order('display_order').order('created_at'),
      supabase.from('product_pricing').select('*').order('effective_from', { ascending: false }),
      supabase.from('product_unit_economics').select('*').order('effective_from', { ascending: false }),
      supabase.from('product_targets').select('*').order('created_at', { ascending: false }),
    ]);
    setProducts(pr.data ?? []);
    setPricings(pp.data ?? []);
    setEconRows(pe.data ?? []);
    setTargets(pt.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);

  // Contribution margin per product (T2 price - sum unit economics)
  const getMargin = (productId: string) => {
    const t2 = pricings.find(p => p.product_id === productId && p.tier === 'T2' && p.effective_from <= today && (!p.effective_to || p.effective_to >= today));
    const totalCost = econRows
      .filter(e => e.product_id === productId && e.effective_from <= today && (!e.effective_to || e.effective_to >= today))
      .reduce((a, e) => a + e.cost_ugx, 0);
    if (!t2) return null;
    return { margin: t2.price_ugx - totalCost, price: t2.price_ugx, cost: totalCost };
  };

  const addTarget = async (productId: string) => {
    if (!targetForm.target_value) return;
    await supabase.from('product_targets').insert({
      product_id: productId,
      target_type: targetForm.target_type,
      target_value: Number(targetForm.target_value),
      period: targetForm.period || 'ongoing',
    });
    setAddingTarget(null);
    setTargetForm({ target_type: 'daily_units', target_value: '', period: '' });
    load();
  };

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-[#0077B6]" /> Products & Pricing
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">No hardcoded prices — all UI-entered</p>
        </div>
        {tab === 'Products' && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30">
            <Plus className="w-3.5 h-3.5" /> Add Product
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-slate-200 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${tab === t ? 'bg-[#0077B6]/20 text-[#7EC8E3] border border-[#0077B6]/30' : 'text-slate-500 hover:text-slate-300'}`}>{t}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading…</p>
      ) : (
        <>
          {/* PRODUCTS TAB */}
          {tab === 'Products' && (
            <div className="space-y-3">
              {products.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                  <Package className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm font-bold">No products yet.</p>
                  <p className="text-slate-600 text-xs mt-1">Click "Add Product" to create your first product SKU.</p>
                </div>
              ) : products.map(p => {
                const margin = getMargin(p.id);
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{p.sku}</span>
                        <p className="text-sm font-black text-white">{p.name}</p>
                        {!p.active && <span className="text-[10px] text-slate-600 font-black">INACTIVE</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{p.unit}{p.unit_type ? ` · ${p.unit_type}` : ''}{p.category ? ` · ${p.category}` : ''}</p>
                    </div>
                    {margin && (
                      <div className="text-right">
                        <p className={`text-sm font-black tabular-nums ${margin.margin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {fmtUGX(margin.margin)}
                        </p>
                        <p className="text-[10px] text-slate-600">contribution margin @ T2</p>
                        {margin.price > 0 && (
                          <p className="text-[10px] text-slate-500">{Math.round((margin.margin / margin.price) * 100)}% margin</p>
                        )}
                      </div>
                    )}
                    <button onClick={() => supabase.from('products').update({ active: !p.active }).eq('id', p.id).then(() => load())}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition-colors ${p.active ? 'border-slate-200 text-slate-500 hover:text-red-400 hover:border-red-500/30' : 'border-emerald-500/30 text-emerald-400'}`}>
                      {p.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* PRICING TAB */}
          {tab === 'Pricing' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 pr-4 text-slate-500 font-black uppercase tracking-widest">Product</th>
                    {TIERS.map(t => <th key={t} className="text-right py-3 px-3 text-slate-500 font-black uppercase tracking-widest min-w-[100px]">{t}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.active).map(p => (
                    <tr key={p.id} className="border-b border-slate-200/50 hover:bg-white/50">
                      <td className="py-3 pr-4">
                        <p className="font-bold text-white">{p.name}</p>
                        <p className="text-slate-600">{p.sku}</p>
                      </td>
                      {TIERS.map(t => (
                        <td key={t} className="py-3 px-3 text-right">
                          <PricingCell productId={p.id} tier={t} pricings={pricings} onRefresh={load} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-600 mt-4">Click any cell to edit. Changes are time-bounded — old price is preserved in history.</p>
            </div>
          )}

          {/* UNIT ECONOMICS TAB */}
          {tab === 'Unit Economics' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 pr-4 text-slate-500 font-black uppercase tracking-widest">Product</th>
                    {COST_COMPONENTS.map(c => <th key={c} className="text-right py-3 px-2 text-slate-500 font-black uppercase tracking-widest min-w-[80px]">{c}</th>)}
                    <th className="text-right py-3 px-3 text-amber-500 font-black uppercase tracking-widest">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {products.filter(p => p.active).map(p => {
                    const total = econRows
                      .filter(e => e.product_id === p.id && e.effective_from <= today && (!e.effective_to || e.effective_to >= today))
                      .reduce((a, e) => a + e.cost_ugx, 0);
                    return (
                      <tr key={p.id} className="border-b border-slate-200/50 hover:bg-white/50">
                        <td className="py-3 pr-4">
                          <p className="font-bold text-white">{p.name}</p>
                          <p className="text-slate-600">{p.sku}</p>
                        </td>
                        {COST_COMPONENTS.map(c => (
                          <td key={c} className="py-3 px-2 text-right">
                            <UnitEconCell productId={p.id} component={c} econRows={econRows} onRefresh={load} />
                          </td>
                        ))}
                        <td className="py-3 px-3 text-right font-black text-amber-400 tabular-nums">
                          {total > 0 ? total.toLocaleString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-slate-600 mt-4">Click any cell to update cost. All values in UGX. Changes are time-bounded.</p>
            </div>
          )}

          {/* TARGETS TAB */}
          {tab === 'Targets' && (
            <div className="space-y-4">
              {products.filter(p => p.active).map(p => {
                const pt = targets.filter(t => t.product_id === p.id);
                const isAdding = addingTarget === p.id;
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
                      <p className="text-xs font-black text-white">{p.name} <span className="text-slate-600">{p.sku}</span></p>
                      <button onClick={() => setAddingTarget(isAdding ? null : p.id)} className="flex items-center gap-1 text-[10px] font-black text-[#7EC8E3] uppercase tracking-widest hover:text-white">
                        <Plus className="w-3 h-3" /> Add Target
                      </button>
                    </div>
                    {isAdding && (
                      <div className="px-5 py-3 border-b border-slate-200 bg-slate-100/30 flex gap-3 flex-wrap items-end">
                        <select value={targetForm.target_type} onChange={e => setTargetForm({...targetForm, target_type: e.target.value})} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                          {TARGET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input value={targetForm.target_value} onChange={e => setTargetForm({...targetForm, target_value: e.target.value})} type="number" placeholder="Value" className="w-28 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none" />
                        <input value={targetForm.period} onChange={e => setTargetForm({...targetForm, period: e.target.value})} placeholder="Period (2026-05 or ongoing)" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none" />
                        <button onClick={() => addTarget(p.id)} className="px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30">Save</button>
                        <button onClick={() => setAddingTarget(null)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
                      </div>
                    )}
                    {pt.length === 0 && !isAdding && (
                      <p className="px-5 py-3 text-[10px] text-slate-700">No targets set</p>
                    )}
                    {pt.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-5 py-2.5 border-b border-slate-200/50 last:border-0">
                        <p className="text-xs text-slate-300">{t.target_type.replace(/_/g, ' ')}</p>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-slate-600">{t.period}</span>
                          <span className="text-sm font-black text-white tabular-nums">{t.target_value.toLocaleString()}</span>
                          <button onClick={() => supabase.from('product_targets').delete().eq('id', t.id).then(() => load())} className="text-slate-700 hover:text-red-400">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
      {showAdd && <AddProductModal onClose={() => setShowAdd(false)} onSave={load} />}
    </div>
  );
}
