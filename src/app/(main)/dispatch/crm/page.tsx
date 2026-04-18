'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';

interface Distributor {
  id: string;
  name: string;
  contact_person?: string;
  phone?: string;
  zone?: string;
  tier: string;
  status: string;
  total_orders: number;
  total_revenue_ugx: number;
  last_order_date?: string;
  created_at: string;
}

interface Sale {
  id: string;
  product_type: string;
  jar_count: number;
  amount_ugx: number;
  sale_date: string;
  notes?: string;
}

const TIERS = ['T1', 'T2', 'T3', 'T4'];
const emptyForm = { name: '', contact_person: '', phone: '', zone: '', tier: 'T1' };

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

function statusTag(dist: Distributor) {
  const days = daysSince(dist.last_order_date);
  if (days === null) return { label: 'No orders', color: 'text-slate-500 bg-slate-500/10' };
  if (days >= 30) return { label: `Churned (${days}d)`, color: 'text-red-400 bg-red-400/10' };
  if (days >= 7) return { label: `Sleeping (${days}d)`, color: 'text-amber-400 bg-amber-400/10' };
  return { label: `Active (${days}d ago)`, color: 'text-green-400 bg-green-400/10' };
}

export default function DistributorCRMPage() {
  const { user } = useAuth();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<Distributor | null>(null);
  const [history, setHistory] = useState<Sale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'sleeping' | 'churned'>('all');

  const canEdit = user?.role === 'founder' || user?.role === 'manager' || user?.department_slug === 'dispatch' || user?.departments?.includes('dispatch');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('distributors')
      .select('*')
      .eq('location_id', 'buziga')
      .order('last_order_date', { ascending: false, nullsFirst: false });
    setDistributors(data ?? []);
    setLoading(false);
  };

  const loadHistory = async (distId: string) => {
    setHistoryLoading(true);
    const { data } = await supabase
      .from('sales_ledger')
      .select('id, product_type, jar_count, amount_ugx, sale_date, notes')
      .eq('distributor_id', distId)
      .eq('location_id', 'buziga')
      .order('sale_date', { ascending: false })
      .limit(20);
    setHistory(data ?? []);
    setHistoryLoading(false);
  };

  const handleSelect = (dist: Distributor) => {
    setSelected(dist);
    loadHistory(dist.id);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) { showToast({ type: 'error', message: 'Name required' }); return; }
    setAdding(true);
    try {
      const { error } = await supabase.from('distributors').insert([{
        name: addForm.name.trim(),
        contact_person: addForm.contact_person.trim() || null,
        phone: addForm.phone.trim() || null,
        zone: addForm.zone.trim() || null,
        tier: addForm.tier,
        status: 'active',
        location_id: 'buziga',
      }]);
      if (error) throw error;
      showToast({ type: 'success', message: `${addForm.name} added to CRM.` });
      setAddForm({ ...emptyForm });
      setShowAdd(false);
      await load();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setAdding(false);
    }
  };

  const filtered = distributors.filter((d) => {
    if (filter === 'all') return true;
    const days = daysSince(d.last_order_date);
    if (filter === 'churned') return days !== null && days >= 30;
    if (filter === 'sleeping') return days !== null && days >= 7 && days < 30;
    if (filter === 'active') return days !== null && days < 7;
    return true;
  });

  const sleeping = distributors.filter((d) => { const days = daysSince(d.last_order_date); return days !== null && days >= 7 && days < 30; }).length;
  const churned = distributors.filter((d) => { const days = daysSince(d.last_order_date); return days !== null && days >= 30; }).length;

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-2">Distributor CRM</h2>
          <p className="text-slate-400 font-label text-sm">Sleeping ≥7d · Churned ≥30d · Full order history per partner</p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary-container text-on-primary-container px-6 py-2.5 font-label text-sm font-semibold hover:brightness-110 flex items-center gap-2 transition-all"
          >
            + Add Distributor
          </button>
        )}
      </div>

      {/* Alert banners */}
      {sleeping > 0 && (
        <div className="mb-4 p-4 bg-amber-500/10 border-l-2 border-amber-500 flex items-center gap-3">
          <span className="text-amber-400 font-bold text-xs uppercase tracking-widest">
            {sleeping} sleeping distributor{sleeping > 1 ? 's' : ''} — no order in 7+ days
          </span>
        </div>
      )}
      {churned > 0 && (
        <div className="mb-4 p-4 bg-red-500/10 border-l-2 border-red-500 flex items-center gap-3">
          <span className="text-red-400 font-bold text-xs uppercase tracking-widest">
            {churned} churned distributor{churned > 1 ? 's' : ''} — no order in 30+ days
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'active', 'sleeping', 'churned'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-[10px] px-3 py-1.5 font-label uppercase tracking-widest transition-colors ${
              filter === f
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container text-outline hover:bg-surface-container-high'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest ghost-border overflow-hidden mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262a31]/30">
                {['Name', 'Contact', 'Zone', 'Tier', 'Orders', 'Revenue (UGX)', 'Last Order', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-4 font-label text-[10px] uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-outline/50 font-label text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-8 text-center text-outline/50 font-label text-sm">No distributors — add the first one.</td></tr>
              ) : filtered.map((dist) => {
                const tag = statusTag(dist);
                return (
                  <tr
                    key={dist.id}
                    className="border-b border-[#262a31]/10 hover:bg-[#262a31]/20 cursor-pointer transition-colors"
                    onClick={() => handleSelect(dist)}
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-on-surface">{dist.name}</td>
                    <td className="px-5 py-4 text-sm font-label text-on-surface-variant">
                      {dist.contact_person && <div>{dist.contact_person}</div>}
                      {dist.phone && <div className="text-[10px] text-outline/50">{dist.phone}</div>}
                    </td>
                    <td className="px-5 py-4 text-sm font-label text-on-surface-variant">{dist.zone ?? '—'}</td>
                    <td className="px-5 py-4">
                      <span className="text-[10px] px-2 py-0.5 font-label bg-primary-container/20 text-primary">{dist.tier}</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-label text-on-surface-variant">{dist.total_orders}</td>
                    <td className="px-5 py-4 text-sm font-label text-on-surface-variant">
                      {dist.total_revenue_ugx > 0 ? dist.total_revenue_ugx.toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-sm font-label text-on-surface-variant">
                      {dist.last_order_date ?? 'Never'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2 py-0.5 font-label font-bold rounded ${tag.color}`}>{tag.label}</span>
                    </td>
                    <td className="px-5 py-4 text-xs font-label text-primary">View</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Distributor Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-md w-full">
            <h2 className="text-xl font-bold font-headline mb-1">Add Distributor</h2>
            <p className="text-[10px] text-outline/50 font-label mb-6">Writes to distributors table — buziga</p>
            <form onSubmit={handleAdd} className="space-y-4">
              {[
                { label: 'Name *', key: 'name', placeholder: 'e.g., Kampala Fresh Water Ltd' },
                { label: 'Contact Person', key: 'contact_person', placeholder: 'e.g., John Mukasa' },
                { label: 'Phone', key: 'phone', placeholder: '+256 7XX XXX XXX' },
                { label: 'Zone', key: 'zone', placeholder: 'e.g., Buziga / Makindye' },
              ].map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[10px] uppercase text-outline font-label tracking-widest">{f.label}</label>
                  <input
                    type="text"
                    value={(addForm as any)[f.key]}
                    onChange={(e) => setAddForm({ ...addForm, [f.key]: e.target.value })}
                    placeholder={f.placeholder}
                    className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Tier</label>
                <select
                  value={addForm.tier}
                  onChange={(e) => setAddForm({ ...addForm, tier: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {TIERS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-2.5 bg-surface-container-high text-on-surface text-xs font-bold font-label">Cancel</button>
                <button type="submit" disabled={adding} className="flex-1 py-2.5 bg-primary-container text-on-primary-container text-xs font-bold font-label disabled:opacity-50">
                  {adding ? 'Adding...' : 'Add Distributor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold font-headline">{selected.name}</h2>
                <p className="text-[10px] text-outline/50 font-label">[source: distributors row {selected.id?.slice(0, 8)}]</p>
                <div className="flex gap-3 mt-2 flex-wrap">
                  <span className="text-[10px] bg-primary-container/20 text-primary px-2 py-0.5 font-label">{selected.tier}</span>
                  <span className={`text-[10px] px-2 py-0.5 font-label font-bold rounded ${statusTag(selected).color}`}>{statusTag(selected).label}</span>
                  {selected.zone && <span className="text-[10px] text-outline/60 font-label">{selected.zone}</span>}
                  {selected.phone && <span className="text-[10px] text-outline/60 font-label">{selected.phone}</span>}
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs font-label text-outline hover:text-on-surface px-3 py-1.5 bg-surface-container-high">
                Close
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-surface-container p-4">
                <p className="text-[10px] font-label text-outline uppercase tracking-widest mb-1">Total Orders</p>
                <p className="text-2xl font-bold text-on-surface">{selected.total_orders}</p>
              </div>
              <div className="bg-surface-container p-4">
                <p className="text-[10px] font-label text-outline uppercase tracking-widest mb-1">Revenue (UGX)</p>
                <p className="text-2xl font-bold text-secondary">{selected.total_revenue_ugx > 0 ? selected.total_revenue_ugx.toLocaleString() : '—'}</p>
              </div>
              <div className="bg-surface-container p-4">
                <p className="text-[10px] font-label text-outline uppercase tracking-widest mb-1">Last Order</p>
                <p className="text-sm font-bold text-on-surface-variant">{selected.last_order_date ?? 'Never'}</p>
              </div>
            </div>

            <h3 className="text-xs font-bold text-outline uppercase tracking-widest font-label mb-3">Order History</h3>
            {historyLoading ? (
              <p className="text-sm text-outline/50 font-label italic">Loading history...</p>
            ) : history.length === 0 ? (
              <p className="text-sm text-outline/50 font-label italic">No sales recorded for this distributor yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((s) => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-surface-container text-sm border border-outline-variant/10">
                    <div>
                      <span className="font-semibold text-on-surface">{s.product_type}</span>
                      <span className="ml-2 text-outline/60 font-label text-xs">{s.jar_count} jars</span>
                      {s.notes && <span className="ml-2 text-outline/40 font-label text-xs">{s.notes}</span>}
                    </div>
                    <div className="text-right">
                      <div className="text-secondary font-bold">UGX {s.amount_ugx.toLocaleString()}</div>
                      <div className="text-[10px] text-outline/50 font-label">{s.sale_date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
