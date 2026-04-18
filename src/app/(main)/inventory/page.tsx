'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';

interface StockItem {
  id: string;
  item_name: string;
  category?: string;
  quantity: number;
  unit: string;
  reorder_threshold: number;
  location_id: string;
}

export default function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: '', reorder_threshold: '' });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { loadStock(); }, []);

  const loadStock = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('location_id', 'buziga')
        .order('item_name', { ascending: true });

      if (error) throw error;
      setStock(data ?? []);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Error loading inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  // Explicit reorder check — fires events for items below threshold
  const runReorderCheck = async () => {
    await loadStock();
    // Re-fetch directly so we have latest data synchronously
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('location_id', 'buziga');

    const lowItems = (data ?? []).filter((s: StockItem) => s.quantity <= s.reorder_threshold);

    if (lowItems.length === 0) {
      showToast({ type: 'success', message: 'All items above threshold — no reorder needed.' });
      return;
    }

    // Write one event per low item (or one consolidated event)
    const { error: eventError } = await supabase.from('events').insert([{
      location_id: 'buziga',
      event_type: 'reorder_required',
      department: 'inventory',
      severity: 'warning',
      payload: {
        items: lowItems.map((i: StockItem) => ({
          id: i.id,
          name: i.item_name,
          quantity: i.quantity,
          threshold: i.reorder_threshold,
          unit: i.unit,
        })),
        count: lowItems.length,
      },
    }]);

    if (eventError) {
      showToast({ type: 'error', message: 'Reorder check failed: ' + eventError.message });
    } else {
      showToast({
        type: 'info',
        message: `Reorder alert fired for ${lowItems.length} item${lowItems.length > 1 ? 's' : ''}: ${lowItems.map((i: StockItem) => i.item_name).join(', ')}`,
      });
    }
  };

  const openEdit = (item: StockItem) => {
    setEditItem(item);
    setEditForm({ quantity: item.quantity.toString(), reorder_threshold: item.reorder_threshold.toString() });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          quantity: parseInt(editForm.quantity),
          reorder_threshold: parseInt(editForm.reorder_threshold),
          last_updated: new Date().toISOString(),
        })
        .eq('id', editItem.id);
      if (error) throw error;
      setEditItem(null);
      await loadStock();
    } catch (err) {
      console.error('Error saving inventory item:', err);
    } finally {
      setEditSaving(false);
    }
  };

  const belowThreshold = stock.filter((s) => s.quantity <= s.reorder_threshold);
  const nearThreshold = stock.filter(
    (s) => s.quantity > s.reorder_threshold && s.quantity <= s.reorder_threshold * 1.2,
  );

  const getStatus = (item: StockItem) => {
    if (item.quantity <= item.reorder_threshold) return 'REORDER';
    if (item.quantity <= item.reorder_threshold * 1.2) return 'NEAR LIMIT';
    return 'OK';
  };

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-headline tracking-tight text-on-surface mb-2">
            Inventory – Materials &amp; Supply
          </h2>
          <div className="flex items-center gap-4 text-outline text-xs font-label">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-secondary" />
              System Online
            </span>
            {lastSync && (
              <span>
                Last Synced: {lastSync}
                <span className="font-body text-[10px] opacity-40 ml-1">[source: inventory_items, buziga]</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadStock}
            className="bg-surface-container-high text-on-surface font-label text-xs font-semibold px-4 py-3 flex items-center gap-2 hover:bg-surface-container-highest transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
          <button
            onClick={runReorderCheck}
            className="bg-primary text-on-primary font-label text-xs font-semibold px-6 py-3 flex items-center gap-2 hover:brightness-110 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">inventory_2</span>
            Run Reorder Check
          </button>
        </div>
      </header>

      {/* Reorder Alert Banner */}
      {belowThreshold.length > 0 && (
        <div className="mb-8 p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary-container text-sm mt-0.5">warning</span>
          <div>
            <p className="text-tertiary-container font-body text-[10px] font-bold uppercase tracking-widest">
              Reorder Required — {belowThreshold.length} item{belowThreshold.length > 1 ? 's' : ''} below threshold
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              {belowThreshold.map((s) => s.item_name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Material Ledger Table */}
      <section className="mb-8 bg-surface border border-outline-variant/15 overflow-hidden">
        <div className="px-6 py-4 bg-surface-container-high border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-outline font-label">
            Material Ledger
          </h3>
          <span className="text-[10px] font-body text-outline/50">[source: inventory_items, buziga]</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/5">
                {['Item Name', 'Category', 'Current Qty', 'Reorder Threshold', 'Status', ''].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider font-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5 font-body">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-outline/50 font-label text-sm">
                    Loading inventory...
                  </td>
                </tr>
              ) : stock.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center font-label text-sm">
                    <p className="text-outline/50">No data — enter it.</p>
                    <p className="text-[10px] text-outline/30 mt-1 font-body">[source: inventory_items — no rows found for buziga]</p>
                  </td>
                </tr>
              ) : stock.map((item) => {
                const status = getStatus(item);
                const isLow = status === 'REORDER';
                const isNear = status === 'NEAR LIMIT';
                return (
                  <tr
                    key={item.id}
                    className={`transition-colors cursor-pointer ${
                      isLow
                        ? 'bg-tertiary-container/10 border-l-2 border-tertiary-container hover:bg-tertiary-container/20'
                        : isNear
                        ? 'bg-primary/5 border-l-2 border-primary hover:bg-primary/10'
                        : 'hover:bg-surface-container-low/50'
                    }`}
                    onClick={() => openEdit(item)}
                  >
                    <td className="px-6 py-5">
                      <span className="text-on-surface text-sm font-semibold">{item.item_name}</span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-[9px] font-label text-outline/60 uppercase">{item.category ?? '—'}</span>
                    </td>
                    <td className={`px-6 py-5 text-lg ${isLow ? 'text-tertiary font-bold' : isNear ? 'text-primary font-bold' : 'text-on-surface'}`}>
                      {item.quantity.toLocaleString()} {item.unit}
                      <span className="text-[10px] font-label text-outline/40 ml-1">[Ref:{item.id?.slice(0, 6)}]</span>
                    </td>
                    <td className="px-6 py-5 text-outline text-sm">
                      {item.reorder_threshold.toLocaleString()} {item.unit}
                    </td>
                    <td className="px-6 py-5">
                      {isLow ? (
                        <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 text-[10px] font-bold uppercase rounded-none tracking-tighter flex items-center gap-1 w-fit font-label">
                          <span className="material-symbols-outlined text-[12px]">warning</span> REORDER
                        </span>
                      ) : isNear ? (
                        <span className="bg-primary-container text-on-primary-container px-3 py-1 text-[10px] font-bold uppercase rounded-none tracking-tighter flex items-center gap-1 w-fit font-label">
                          <span className="material-symbols-outlined text-[12px]">warning</span> NEAR LIMIT
                        </span>
                      ) : (
                        <span className="bg-secondary-container text-secondary px-3 py-1 text-[10px] font-bold uppercase rounded-none tracking-tighter font-label">
                          OK
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-label text-primary hover:text-primary/70">Edit</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface-container-high p-8 ghost-border relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-3xl" />
          <p className="text-[10px] font-label text-outline uppercase tracking-widest mb-4">Total Items</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-body font-bold text-on-surface">{stock.length}</span>
          </div>
          <p className="text-[10px] font-label text-outline/50 mt-2">[source: inventory_items, buziga]</p>
        </div>
        <div className="bg-surface-container-high p-8 ghost-border relative overflow-hidden">
          <p className="text-[10px] font-label text-outline uppercase tracking-widest mb-4">Below Threshold</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-body font-bold ${belowThreshold.length > 0 ? 'text-tertiary' : 'text-secondary'}`}>
              {belowThreshold.length}
            </span>
          </div>
          <p className="text-[10px] font-label text-outline/50 mt-2">[source: inventory_items, buziga]</p>
        </div>
        <div className="bg-surface-container border border-primary-container/20 p-8 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-primary mb-2 font-label">Automated Procurement</h4>
            <p className="text-xs text-on-surface-variant font-label leading-relaxed">
              System triggers reorder alerts when any item drops below its threshold. Founders receive a critical event notification.
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold font-headline mb-1">{editItem.item_name}</h2>
            <p className="text-[10px] text-outline/50 font-label mb-6">[source: inventory_items row {editItem.id?.slice(0, 8)}]</p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Current Quantity ({editItem.unit})</label>
                <input
                  type="number"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Reorder Threshold ({editItem.unit})</label>
                <input
                  type="number"
                  value={editForm.reorder_threshold}
                  onChange={(e) => setEditForm({ ...editForm, reorder_threshold: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="flex-1 py-2 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
