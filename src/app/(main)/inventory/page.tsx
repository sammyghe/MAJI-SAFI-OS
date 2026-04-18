'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';
import DeptTeamPanel from '@/components/DeptTeamPanel';

interface StockItem {
  id: string;
  item_name: string;
  category?: string;
  quantity: number;
  unit: string;
  reorder_threshold: number;
  location_id: string;
  last_updated?: string;
}

async function fireReorderEventIfNeeded(item: StockItem, newQty: number) {
  if (newQty <= item.reorder_threshold) {
    await supabase.from('events').insert([{
      location_id: 'buziga',
      event_type: 'reorder_required',
      department: 'inventory',
      severity: 'warning',
      payload: {
        items: [{
          id: item.id,
          name: item.item_name,
          quantity: newQty,
          threshold: item.reorder_threshold,
          unit: item.unit,
        }],
        count: 1,
      },
    }]);
  }
}

export default function InventoryPage() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');

  // Edit modal
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [editForm, setEditForm] = useState({ quantity: '', reorder_threshold: '' });
  const [editSaving, setEditSaving] = useState(false);

  // Stock forms tab: 'receive' | 'count'
  const [stockTab, setStockTab] = useState<'receive' | 'count'>('receive');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockNotes, setStockNotes] = useState('');
  const [stockSaving, setStockSaving] = useState(false);

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

  // Receive Stock — adds to existing quantity
  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !stockQty) {
      showToast({ type: 'error', message: 'Select an item and enter quantity received' });
      return;
    }
    setStockSaving(true);
    try {
      const item = stock.find((s) => s.id === selectedItemId);
      if (!item) throw new Error('Item not found');
      const received = parseInt(stockQty);
      if (isNaN(received) || received <= 0) throw new Error('Quantity must be a positive number');
      const newQty = (item.quantity ?? 0) + received;

      const { error } = await supabase
        .from('inventory_items')
        .update({ quantity: newQty, last_updated: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;

      await fireReorderEventIfNeeded(item, newQty);

      showToast({
        type: 'success',
        message: `Received ${received} ${item.unit} of ${item.item_name}. New stock: ${newQty} ${item.unit}.`,
      });
      setStockQty('');
      setStockNotes('');
      await loadStock();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message ?? 'Error updating stock' });
    } finally {
      setStockSaving(false);
    }
  };

  // Stock Count — overwrites quantity (physical reconciliation)
  const handleStockCount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || stockQty === '') {
      showToast({ type: 'error', message: 'Select an item and enter the actual count' });
      return;
    }
    setStockSaving(true);
    try {
      const item = stock.find((s) => s.id === selectedItemId);
      if (!item) throw new Error('Item not found');
      const actualCount = parseInt(stockQty);
      if (isNaN(actualCount) || actualCount < 0) throw new Error('Count must be zero or a positive number');
      const prev = item.quantity ?? 0;
      const diff = actualCount - prev;

      const { error } = await supabase
        .from('inventory_items')
        .update({ quantity: actualCount, last_updated: new Date().toISOString() })
        .eq('id', item.id);
      if (error) throw error;

      await fireReorderEventIfNeeded(item, actualCount);

      showToast({
        type: diff >= 0 ? 'success' : 'info',
        message: `Stock count recorded: ${actualCount} ${item.unit} of ${item.item_name}. ${
          diff !== 0 ? `Variance: ${diff > 0 ? '+' : ''}${diff} ${item.unit}.` : 'No variance.'
        }`,
      });
      setStockQty('');
      setStockNotes('');
      await loadStock();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message ?? 'Error recording count' });
    } finally {
      setStockSaving(false);
    }
  };

  // Reorder check (explicit, fires consolidated event for all low items)
  const runReorderCheck = async () => {
    await loadStock();
    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('location_id', 'buziga');

    const lowItems = (data ?? []).filter((s: StockItem) => s.quantity <= s.reorder_threshold);

    if (lowItems.length === 0) {
      showToast({ type: 'success', message: 'All items above threshold — no reorder needed.' });
      return;
    }

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
      const newQty = parseInt(editForm.quantity);
      const { error } = await supabase
        .from('inventory_items')
        .update({
          quantity: newQty,
          reorder_threshold: parseInt(editForm.reorder_threshold),
          last_updated: new Date().toISOString(),
        })
        .eq('id', editItem.id);
      if (error) throw error;
      await fireReorderEventIfNeeded(editItem, newQty);
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

  const selectedItem = stock.find((s) => s.id === selectedItemId);

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
          <h3 className="text-xs font-bold uppercase tracking-widest text-outline font-label">Material Ledger</h3>
          <span className="text-[10px] font-body text-outline/50">[source: inventory_items, buziga]</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/5">
                {['Item Name', 'Category', 'Current Qty', 'Reorder Threshold', 'Last Updated', 'Status', ''].map((h) => (
                  <th key={h} className="px-6 py-4 text-[10px] font-bold text-outline uppercase tracking-wider font-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5 font-body">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-outline/50 font-label text-sm">Loading inventory...</td>
                </tr>
              ) : stock.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center font-label text-sm">
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
                    <td className="px-6 py-5 text-[10px] font-label text-outline/50">
                      {item.last_updated
                        ? new Date(item.last_updated).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
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

      {/* Stock Write Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-surface-container-low ghost-border overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-outline-variant/10">
            {(['receive', 'count'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setStockTab(tab); setStockQty(''); setStockNotes(''); }}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest font-label transition-colors ${
                  stockTab === tab
                    ? 'bg-primary-container/20 text-primary border-b-2 border-primary'
                    : 'text-outline hover:text-on-surface'
                }`}
              >
                {tab === 'receive' ? 'Receive Stock' : 'Stock Count'}
              </button>
            ))}
          </div>
          <div className="p-6">
            <p className="text-[10px] text-outline/60 font-label mb-4">
              {stockTab === 'receive'
                ? 'Add incoming stock to existing quantity (delivery, purchase)'
                : 'Physical count — overwrites quantity in system (reconciliation)'}
            </p>
            <form onSubmit={stockTab === 'receive' ? handleReceiveStock : handleStockCount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Item</label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  <option value="">Select item...</option>
                  {stock.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.item_name} — current: {s.quantity} {s.unit}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">
                  {stockTab === 'receive' ? 'Quantity Received' : 'Actual Count'}
                  {selectedItem ? ` (${selectedItem.unit})` : ''}
                </label>
                <input
                  type="number"
                  min="0"
                  value={stockQty}
                  onChange={(e) => setStockQty(e.target.value)}
                  placeholder={stockTab === 'receive' ? 'e.g., 200' : 'e.g., 150'}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              {/* Preview */}
              {selectedItem && stockQty !== '' && !isNaN(parseInt(stockQty)) && (
                <div className="px-3 py-2 bg-surface-container text-[10px] font-label text-outline/70">
                  {stockTab === 'receive'
                    ? `New total: ${(selectedItem.quantity ?? 0) + parseInt(stockQty)} ${selectedItem.unit}`
                    : `Variance: ${parseInt(stockQty) - (selectedItem.quantity ?? 0) >= 0 ? '+' : ''}${parseInt(stockQty) - (selectedItem.quantity ?? 0)} ${selectedItem.unit}`}
                  {parseInt(stockQty) <= selectedItem.reorder_threshold && (
                    <span className="ml-2 text-tertiary font-bold">⚠ Below reorder threshold — event will fire</span>
                  )}
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Notes (optional)</label>
                <input
                  type="text"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  placeholder="e.g., Delivery from supplier"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <button
                type="submit"
                disabled={stockSaving || !selectedItemId || stockQty === ''}
                className="w-full py-2.5 bg-primary-container text-on-primary-container font-label text-xs font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {stockSaving
                  ? 'Saving...'
                  : stockTab === 'receive'
                  ? 'Record Delivery'
                  : 'Record Physical Count'}
              </button>
            </form>
          </div>
        </div>

        {/* Stats column */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Items', value: stock.length, color: 'text-on-surface' },
              { label: 'Below Threshold', value: belowThreshold.length, color: belowThreshold.length > 0 ? 'text-tertiary' : 'text-secondary' },
              { label: 'Near Limit', value: nearThreshold.length, color: nearThreshold.length > 0 ? 'text-primary' : 'text-outline' },
            ].map((s) => (
              <div key={s.label} className="bg-surface-container-high p-6 ghost-border">
                <p className="text-[10px] font-label text-outline uppercase tracking-widest mb-3">{s.label}</p>
                <p className={`text-3xl font-body font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] font-label text-outline/50 mt-2">[source: inventory_items, buziga]</p>
              </div>
            ))}
          </div>

          <div className="bg-surface-container border border-primary-container/20 p-6 flex flex-col justify-between">
            <div>
              <h4 className="text-sm font-bold text-primary mb-2 font-label">Automated Procurement Loop</h4>
              <div className="space-y-2 text-xs text-on-surface-variant font-label">
                <p>• Receive Stock: adds to existing quantity (inbound delivery)</p>
                <p>• Stock Count: overwrites with physical count (reconciliation)</p>
                <p>• Both: auto-fire reorder_required event if qty ≤ threshold</p>
                <p>• Production fills: increment on batch log</p>
                <p>• Dispatch sales: decrement on sale record</p>
              </div>
            </div>
            <p className="mt-4 text-[10px] font-label text-outline/40">[source: inventory_items, events — buziga]</p>
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
                <button type="button" onClick={() => setEditItem(null)}
                  className="flex-1 py-2 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <DeptTeamPanel departmentSlug="inventory" />
    </div>
  );
}
