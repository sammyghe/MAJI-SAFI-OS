'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { FlaskConical, Plus, X, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { formatMoney } from '@/lib/currency';

interface Scenario {
  id: string; name: string; description: string | null; base_period: string;
  created_by: string; created_at: string;
}

interface ScenarioResult {
  scenario_name: string; base_period: string;
  base: { revenue: number; opex: number; gross_profit: number; net_margin_pct: number; jars: number };
  scenario: { revenue: number; opex: number; gross_profit: number; net_margin_pct: number; jars: number; opex_by_category: Record<string, number> };
  delta: { revenue: number; opex: number; gross_profit: number; net_margin_pct: number };
  products: Array<{ id: string; sku: string; name: string; price_ugx: number; cogs_ugx: number; contribution_margin: number; margin_pct: number }>;
  overrides: Array<{ id: string; override_type: string; product_id: string | null; category: string | null; override_value: number; products?: { name: string; sku: string } | null }>;
  source_tag: string;
}

const OVERRIDE_TYPES = [
  { value: 'jars_per_day', label: 'Jars per day', unit: 'jars', needsProduct: false, needsCategory: false },
  { value: 'revenue_pct_change', label: 'Revenue % change', unit: '%', needsProduct: false, needsCategory: false },
  { value: 'opex_pct_change', label: 'OpEx % change (all)', unit: '%', needsProduct: false, needsCategory: false },
  { value: 'opex_category_ugx', label: 'OpEx category amount', unit: 'UGX', needsProduct: false, needsCategory: true },
  { value: 'price_t2_ugx', label: 'T2 price override', unit: 'UGX', needsProduct: true, needsCategory: false },
  { value: 'cogs_ugx', label: 'COGS override', unit: 'UGX', needsProduct: true, needsCategory: false },
];

function DeltaBadge({ value, unit = 'UGX', invert = false }: { value: number; unit?: string; invert?: boolean }) {
  const positive = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  const color = neutral ? 'text-zinc-500' : positive ? 'text-emerald-400' : 'text-red-400';
  const Icon = neutral ? Minus : positive ? TrendingUp : TrendingDown;
  const display = unit === 'UGX' ? formatMoney(Math.abs(value), { compact: true }) : `${Math.abs(value)}${unit}`;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-black ${color}`}>
      <Icon className="w-3 h-3" />
      {value > 0 ? '+' : value < 0 ? '-' : ''}{display}
    </span>
  );
}

export default function ScenariosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isFounder = user?.role === 'founder';
  const isCFO = isFounder || user?.permissions?.can_view_financials;

  useEffect(() => { if (user && !isCFO) router.push('/finance'); }, [user, isCFO]);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [result, setResult] = useState<ScenarioResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showAddOverride, setShowAddOverride] = useState(false);
  const [products, setProducts] = useState<Array<{ id: string; name: string; sku: string }>>([]);

  const [newForm, setNewForm] = useState({ name: '', description: '', base_period: new Date().toISOString().slice(0, 7) });
  const [ovForm, setOvForm] = useState({ override_type: 'jars_per_day', product_id: '', category: '', override_value: '' });

  const periods = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  const loadScenarios = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/scenarios');
    setScenarios(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadScenarios(); }, [loadScenarios]);

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => setProducts(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const compute = useCallback(async (id: string) => {
    setComputing(true);
    const res = await fetch(`/api/scenarios/${id}/compute`);
    setResult(await res.json());
    setComputing(false);
  }, []);

  useEffect(() => { if (selected) compute(selected); }, [selected, compute]);

  const createScenario = async () => {
    if (!newForm.name) return;
    const res = await fetch('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newForm, created_by: user?.name }),
    });
    const s = await res.json();
    setShowNew(false);
    setNewForm({ name: '', description: '', base_period: new Date().toISOString().slice(0, 7) });
    await loadScenarios();
    setSelected(s.id);
  };

  const addOverride = async () => {
    if (!selected || !ovForm.override_value) return;
    const ovType = OVERRIDE_TYPES.find(t => t.value === ovForm.override_type)!;
    await fetch(`/api/scenarios/${selected}/overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        override_type: ovForm.override_type,
        product_id: ovType.needsProduct ? ovForm.product_id || null : null,
        category: ovType.needsCategory ? ovForm.category || null : null,
        override_value: ovForm.override_value,
      }),
    });
    setShowAddOverride(false);
    setOvForm({ override_type: 'jars_per_day', product_id: '', category: '', override_value: '' });
    compute(selected);
  };

  const removeOverride = async (ovId: string) => {
    if (!selected) return;
    await fetch(`/api/scenarios/${selected}/overrides?override_id=${ovId}`, { method: 'DELETE' });
    compute(selected);
  };

  const selectedOvType = OVERRIDE_TYPES.find(t => t.value === ovForm.override_type)!;

  if (!isCFO) return null;

  return (
    <div className="px-6 py-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-[#0077B6]" /> What-If Scenarios
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Model assumptions · Never touches real data</p>
        </div>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30">
          <Plus className="w-3.5 h-3.5" /> New Scenario
        </button>
      </div>

      {/* New scenario form */}
      {showNew && (
        <div className="bg-zinc-900 border border-[#0077B6]/30 rounded-2xl p-5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">New Scenario</p>
          <div className="flex flex-wrap gap-3">
            <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })}
              placeholder="Scenario name (e.g. Double volume, Price drop)" autoFocus
              className="flex-1 min-w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50" />
            <select value={newForm.base_period} onChange={e => setNewForm({ ...newForm, base_period: e.target.value })}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <input value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })}
              placeholder="Description (optional)"
              className="flex-1 min-w-48 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none" />
            <button onClick={createScenario} className="px-5 py-2 bg-[#0077B6] rounded-lg text-xs font-black text-white hover:bg-[#0077B6]/80">Create</button>
            <button onClick={() => setShowNew(false)}><X className="w-4 h-4 text-zinc-500" /></button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: scenario list */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scenarios</p>
          {loading ? (
            <p className="text-zinc-700 text-xs animate-pulse">Loading…</p>
          ) : scenarios.length === 0 ? (
            <p className="text-zinc-700 text-xs">No scenarios yet. Create one to start modeling.</p>
          ) : scenarios.map(s => (
            <button key={s.id} onClick={() => setSelected(s.id)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${selected === s.id ? 'bg-[#0077B6]/10 border-[#0077B6]/40 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'}`}>
              <p className="text-sm font-black">{s.name}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">{s.base_period} · {s.created_by}</p>
              {s.description && <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{s.description}</p>}
            </button>
          ))}
        </div>

        {/* Right: results */}
        <div className="lg:col-span-2 space-y-4">
          {!selected ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center">
              <FlaskConical className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-600 text-sm">Select or create a scenario to see what-if projections.</p>
            </div>
          ) : computing ? (
            <p className="text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Computing scenario…</p>
          ) : result ? (
            <>
              {/* KPI comparison cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Revenue', base: result.base.revenue, scenario: result.scenario.revenue, delta: result.delta.revenue, unit: 'UGX' },
                  { label: 'OpEx', base: result.base.opex, scenario: result.scenario.opex, delta: result.delta.opex, unit: 'UGX', invert: true },
                  { label: 'Gross Profit', base: result.base.gross_profit, scenario: result.scenario.gross_profit, delta: result.delta.gross_profit, unit: 'UGX' },
                  { label: 'Net Margin', base: result.base.net_margin_pct, scenario: result.scenario.net_margin_pct, delta: result.delta.net_margin_pct, unit: '%' },
                ].map(card => (
                  <div key={card.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{card.label}</p>
                    <p className="text-lg font-black text-white mt-1">
                      {card.unit === 'UGX' ? formatMoney(card.scenario, { compact: true }) : `${card.scenario}%`}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5">
                      Base: {card.unit === 'UGX' ? formatMoney(card.base, { compact: true }) : `${card.base}%`}
                    </p>
                    <div className="mt-2">
                      <DeltaBadge value={card.delta} unit={card.unit === '%' ? '%' : 'UGX'} invert={card.invert} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Overrides */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Assumptions ({result.overrides.length})</p>
                  <button onClick={() => setShowAddOverride(!showAddOverride)}
                    className="text-[10px] text-[#7EC8E3] font-black flex items-center gap-1 hover:text-white">
                    <Plus className="w-3 h-3" /> Add Assumption
                  </button>
                </div>

                {showAddOverride && (
                  <div className="mb-4 p-4 bg-zinc-800/50 rounded-xl flex flex-wrap gap-3 items-end">
                    <div>
                      <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Type</p>
                      <select value={ovForm.override_type} onChange={e => setOvForm({ ...ovForm, override_type: e.target.value })}
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                        {OVERRIDE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {selectedOvType.needsProduct && (
                      <div>
                        <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Product</p>
                        <select value={ovForm.product_id} onChange={e => setOvForm({ ...ovForm, product_id: e.target.value })}
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
                          <option value="">Select…</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </div>
                    )}
                    {selectedOvType.needsCategory && (
                      <div>
                        <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Category</p>
                        <input value={ovForm.category} onChange={e => setOvForm({ ...ovForm, category: e.target.value })}
                          placeholder="e.g. Salaries"
                          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none w-32" />
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] text-zinc-500 font-black uppercase mb-1">Value ({selectedOvType.unit})</p>
                      <input type="number" value={ovForm.override_value} onChange={e => setOvForm({ ...ovForm, override_value: e.target.value })}
                        placeholder="Enter value"
                        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none w-32" />
                    </div>
                    <button onClick={addOverride} className="px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-lg text-xs font-black text-[#7EC8E3] hover:bg-[#0077B6]/30">Apply</button>
                    <button onClick={() => setShowAddOverride(false)}><X className="w-4 h-4 text-zinc-500" /></button>
                  </div>
                )}

                {result.overrides.length === 0 ? (
                  <p className="text-zinc-700 text-xs">No assumptions yet. Add assumptions to see how they change the numbers.</p>
                ) : (
                  <div className="space-y-2">
                    {result.overrides.map(ov => {
                      const ovType = OVERRIDE_TYPES.find(t => t.value === ov.override_type);
                      return (
                        <div key={ov.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                          <div>
                            <p className="text-xs font-medium text-white">{ovType?.label ?? ov.override_type}</p>
                            {ov.products && <p className="text-[10px] text-zinc-600">{ov.products.name} ({ov.products.sku})</p>}
                            {ov.category && <p className="text-[10px] text-zinc-600">Category: {ov.category}</p>}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-black text-white tabular-nums">
                              {ovType?.unit === 'UGX' ? formatMoney(ov.override_value, { compact: true }) : `${ov.override_value}${ovType?.unit ?? ''}`}
                            </p>
                            <button onClick={() => removeOverride(ov.id)} className="text-zinc-700 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Product margins under scenario */}
              {result.products.filter(p => p.price_ugx > 0).length > 0 && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Product Margins under Scenario</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {result.products.filter(p => p.price_ugx > 0).map(p => (
                      <div key={p.id} className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase truncate">{p.name}</p>
                        <p className={`text-lg font-black ${p.margin_pct >= 40 ? 'text-emerald-400' : p.margin_pct >= 20 ? 'text-amber-400' : 'text-red-400'}`}>{p.margin_pct}%</p>
                        <div className="w-full bg-zinc-800 rounded-full h-1.5">
                          <div className={`h-1.5 rounded-full ${p.margin_pct >= 40 ? 'bg-emerald-500' : p.margin_pct >= 20 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(p.margin_pct, 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-zinc-600">{formatMoney(p.contribution_margin, { compact: true })} / unit</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-zinc-700">{result.source_tag}</p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
