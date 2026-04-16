'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { AlertTriangle, DollarSign } from 'lucide-react';

export default function DispatchPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    distributor: '',
    jars: '',
    amount_ugx: '',
  });
  const [cashState, setCashState] = useState({
    systemTotal: 0,
    countedAmount: '0',
    mismatched: false,
    forceCloseReason: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEOD, setShowEOD] = useState(false);
  const [showForceClose, setShowForceClose] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('sales_ledger')
        .select('*')
        .eq('location_id', 'buziga')
        .eq('sale_date', today)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSales(data || []);
      const total = (data || []).reduce((sum, s) => sum + (s.amount_ugx || 0), 0);
      setCashState((prev) => ({ ...prev, systemTotal: total }));
    } catch (err) {
      console.error('Error loading sales:', err);
    }
  };

  const handleAddSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.distributor || !formData.jars || !formData.amount_ugx) {
        throw new Error('All fields required');
      }

      const { error: insertError } = await supabase.from('sales_ledger').insert([
        {
          distributor: formData.distributor,
          jars_sold: parseInt(formData.jars),
          amount_ugx: parseInt(formData.amount_ugx),
          location_id: 'buziga',
          logged_by: user?.name || 'Unknown',
        },
      ]);

      if (insertError) throw insertError;

      setFormData({ distributor: '', jars: '', amount_ugx: '' });
      await loadSales();
      setShowEOD(true);
    } catch (err: any) {
      setError(err.message || 'Error logging sale');
    } finally {
      setLoading(false);
    }
  };

  const handleEODCheck = () => {
    const counted = parseInt(cashState.countedAmount) || 0;
    const mismatched = Math.abs(counted - cashState.systemTotal) > 0;
    setCashState((prev) => ({ ...prev, mismatched }));
  };

  const handleEODClose = async () => {
    if (cashState.mismatched && !cashState.forceCloseReason) {
      setError('Force close requires a reason from founders');
      return;
    }

    try {
      if (cashState.mismatched) {
        // Log override
        await supabase.from('finance_overrides').insert([
          {
            reason: cashState.forceCloseReason,
            user_id: user?.id,
            location_id: 'buziga',
          },
        ]);
      }

      // TODO: Mark EOD closed in system
      alert('EOD reconciliation closed. Cash audit logged.');
      setShowEOD(false);
      setCashState((prev) => ({ ...prev, countedAmount: '0', forceCloseReason: '' }));
    } catch (err) {
      setError('Error closing EOD');
    }
  };

  const jarsDispatched = sales.reduce((sum, s) => sum + (s.jars_sold || 0), 0);

  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-white mb-2 font-headline">Dispatch</h1>
      <p className="text-zinc-400 text-sm mb-8 font-label">Sales logging, cash collection, EOD reconciliation</p>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Jars Dispatched', value: jarsDispatched.toString(), suffix: '' },
          { label: 'Cash Collected', value: `UGX ${cashState.systemTotal.toLocaleString()}`, suffix: '' },
          { label: 'Distributors', value: new Set(sales.map((s) => s.distributor)).size.toString(), suffix: '' },
          {
            label: 'Mismatch',
            value: cashState.mismatched ? 'YES' : 'NONE',
            suffix: '',
            color: cashState.mismatched ? 'red' : 'green',
          },
        ].map((stat, i) => {
          const bgColor =
            stat.color === 'red'
              ? 'bg-red-500/10 border-red-500/30'
              : stat.color === 'green'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-zinc-900 border-zinc-800';
          const textColor = stat.color === 'red' ? 'text-red-400' : stat.color === 'green' ? 'text-green-400' : 'text-white';

          return (
            <div key={i} className={`p-4 border rounded-lg ${bgColor}`}>
              <p className="text-xs text-zinc-400 font-label">{stat.label}</p>
              <p className={`text-2xl font-bold font-headline ${textColor}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Add Sale Form + Sales Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Add Sale Form */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 font-headline">Log Sale</h3>
          <form onSubmit={handleAddSale} className="space-y-3">
            <input
              type="text"
              value={formData.distributor}
              onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
              placeholder="Distributor name"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
            />
            <input
              type="number"
              value={formData.jars}
              onChange={(e) => setFormData({ ...formData, jars: e.target.value })}
              placeholder="Jars sold"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
            />
            <input
              type="number"
              value={formData.amount_ugx}
              onChange={(e) => setFormData({ ...formData, amount_ugx: e.target.value })}
              placeholder="Amount (UGX)"
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
            />
            {error && <p className="text-red-400 text-xs font-label">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-[#0077B6] hover:brightness-110 disabled:opacity-50 text-white rounded font-semibold text-xs font-label"
            >
              {loading ? 'Logging...' : 'Add Sale'}
            </button>
          </form>
        </div>

        {/* Sales Table */}
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          <h3 className="text-lg font-bold text-white p-4 border-b border-zinc-700 font-headline">Today's Sales</h3>
          {sales.length === 0 ? (
            <p className="text-zinc-400 text-center font-label p-6">No sales logged yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-label">
                <thead>
                  <tr className="border-b border-zinc-700">
                    <th className="px-3 py-2 text-left text-zinc-300 font-semibold">Distributor</th>
                    <th className="px-3 py-2 text-left text-zinc-300 font-semibold">Jars</th>
                    <th className="px-3 py-2 text-left text-zinc-300 font-semibold">Amount (UGX)</th>
                    <th className="px-3 py-2 text-left text-zinc-300 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-zinc-800 hover:bg-zinc-800/30">
                      <td className="px-3 py-2 text-white">{sale.distributor}</td>
                      <td className="px-3 py-2 text-zinc-300">{sale.jars_sold}</td>
                      <td className="px-3 py-2 text-zinc-300">{sale.amount_ugx.toLocaleString()}</td>
                      <td className="px-3 py-2 text-zinc-400 text-[10px]">{new Date(sale.created_at).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* EOD Reconciliation Modal */}
      {showEOD && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8 max-w-md">
            <h2 className="text-2xl font-bold text-white mb-4 font-headline">EOD Cash Reconciliation</h2>

            <div className="bg-zinc-800 p-4 rounded-lg mb-4">
              <p className="text-xs text-zinc-400 font-label mb-1">System Total:</p>
              <p className="text-xl font-bold text-[#0077B6] font-headline">UGX {cashState.systemTotal.toLocaleString()}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-zinc-300 mb-2 font-label">Physical Count (UGX)</label>
              <input
                type="number"
                value={cashState.countedAmount}
                onChange={(e) => setCashState({ ...cashState, countedAmount: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm font-label"
              />
            </div>

            <button
              onClick={handleEODCheck}
              className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-semibold text-sm mb-4 font-label"
            >
              Check Mismatch
            </button>

            {cashState.mismatched && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded">
                <div className="flex gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-semibold text-xs font-label">Cash Mismatch Detected</p>
                    <p className="text-red-300 text-xs font-label mt-1">
                      Difference: UGX {Math.abs(parseInt(cashState.countedAmount) - cashState.systemTotal).toLocaleString()}
                    </p>
                  </div>
                </div>

                {user?.role === 'founder' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-2 font-label">Force Close Reason (Required)</label>
                    <textarea
                      value={cashState.forceCloseReason}
                      onChange={(e) => setCashState({ ...cashState, forceCloseReason: e.target.value })}
                      className="w-full px-2 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-xs font-label"
                      rows={2}
                      placeholder="Explain the discrepancy..."
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowEOD(false)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded font-semibold text-sm font-label"
              >
                Cancel
              </button>
              <button
                onClick={handleEODClose}
                disabled={cashState.mismatched && !cashState.forceCloseReason}
                className="flex-1 py-2 bg-[#0077B6] hover:brightness-110 disabled:opacity-50 text-white rounded font-semibold text-sm font-label"
              >
                Confirm Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
