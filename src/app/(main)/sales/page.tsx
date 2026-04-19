'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';
import { useCanEdit } from '@/hooks/useCanEdit';
import DeptTeamPanel from '@/components/DeptTeamPanel';
import { ShoppingCart, TrendingUp, Users, Zap, RefreshCw } from 'lucide-react';

// T1 pricing per CLAUDE.md §11
const T1_PRICES: Record<string, number> = {
  '20L Refill':       3000,
  '20L Single-Use':   7500,
  '20L Reusable Jar': 15000,
  '5L Single-Use':    2800,
};

const PRODUCT_TYPES = Object.keys(T1_PRICES);

interface SaleRow {
  id: string;
  distributor: string;
  jars_sold: number;
  amount_ugx: number;
  product_type: string;
  logged_by: string;
  sale_date: string;
  created_at: string;
  location_id: string;
}

interface LeaderboardEntry {
  name: string;
  totalRevenue: number;
  totalJars: number;
  saleCount: number;
}

interface DistributorPerf {
  name: string;
  totalRevenue: number;
  totalJars: number;
  lastSale: string;
}

export default function SalesPage() {
  const { user } = useAuth();
  const { canEdit, isReadOnly } = useCanEdit('sales');
  const isFounder = user?.role === 'founder';

  // KPI state
  const [todaySales, setTodaySales] = useState<SaleRow[]>([]);
  const [weeklySales, setWeeklySales] = useState<SaleRow[]>([]);
  const [monthlySales, setMonthlySales] = useState<SaleRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [distPerf, setDistPerf] = useState<DistributorPerf[]>([]);
  const [loading, setLoading] = useState(true);

  // Quick log form
  const [form, setForm] = useState({
    distributor: '',
    product_type: '20L Refill',
    jars: '',
    amount_ugx: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const today = new Date().toISOString().split('T')[0];
  const weekStart = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // For non-founders: filter to their own sales only
      const myName = user?.name;
      const baseQuery = () => {
        const q = supabase.from('sales_ledger').select('*').eq('location_id', 'buziga');
        return !isFounder && myName ? q.eq('logged_by', myName) : q;
      };

      const [
        { data: todayData },
        { data: weekData },
        { data: monthData },
        { data: allTodayData }, // for leaderboard (always all reps)
        { data: allMonthData }, // for distributor perf (always all)
      ] = await Promise.all([
        baseQuery().eq('sale_date', today).order('created_at', { ascending: false }),
        baseQuery().gte('sale_date', weekStart).order('sale_date', { ascending: false }),
        baseQuery().gte('sale_date', monthStart).order('sale_date', { ascending: false }),
        // Leaderboard always loads all reps (founders need full view; non-founders see their rank)
        supabase.from('sales_ledger').select('logged_by, amount_ugx, jars_sold').eq('location_id', 'buziga').eq('sale_date', today),
        supabase.from('sales_ledger').select('distributor, amount_ugx, jars_sold, sale_date').eq('location_id', 'buziga').gte('sale_date', monthStart),
      ]);

      setTodaySales(todayData ?? []);
      setWeeklySales(weekData ?? []);
      setMonthlySales(monthData ?? []);

      // Build leaderboard from today's all-rep data
      const board: Record<string, LeaderboardEntry> = {};
      (allTodayData ?? []).forEach((r) => {
        const n = r.logged_by ?? 'Unknown';
        if (!board[n]) board[n] = { name: n, totalRevenue: 0, totalJars: 0, saleCount: 0 };
        board[n].totalRevenue += r.amount_ugx ?? 0;
        board[n].totalJars += r.jars_sold ?? 0;
        board[n].saleCount += 1;
      });
      setLeaderboard(Object.values(board).sort((a, b) => b.totalRevenue - a.totalRevenue));

      // Build distributor performance from this month
      const distMap: Record<string, DistributorPerf> = {};
      (allMonthData ?? []).forEach((r) => {
        const n = r.distributor ?? 'Unknown';
        if (!distMap[n]) distMap[n] = { name: n, totalRevenue: 0, totalJars: 0, lastSale: '' };
        distMap[n].totalRevenue += r.amount_ugx ?? 0;
        distMap[n].totalJars += r.jars_sold ?? 0;
        if (!distMap[n].lastSale || r.sale_date > distMap[n].lastSale) distMap[n].lastSale = r.sale_date;
      });
      setDistPerf(Object.values(distMap).sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5));
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Sales load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJarsChange = (jars: string, type: string) => {
    const n = parseInt(jars);
    const amount = n > 0 && T1_PRICES[type] ? (n * T1_PRICES[type]).toString() : '';
    setForm((prev) => ({ ...prev, jars, product_type: type, amount_ugx: amount }));
  };

  const handleLogSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.distributor.trim()) { setFormError('Distributor name required'); return; }
    if (!form.jars || parseInt(form.jars) <= 0) { setFormError('Jar count required'); return; }
    if (!form.amount_ugx) { setFormError('Amount required'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('sales_ledger').insert([{
        distributor: form.distributor.trim(),
        jars_sold: parseInt(form.jars),
        amount_ugx: parseInt(form.amount_ugx),
        product_type: form.product_type,
        location_id: 'buziga',
        logged_by: user?.name ?? 'Unknown',
        notes: form.notes || null,
      }]);
      if (error) throw error;

      // Decrement inventory
      const { data: invRow } = await supabase
        .from('inventory_items')
        .select('id, quantity, reorder_threshold, unit')
        .eq('location_id', 'buziga')
        .eq('item_name', form.product_type)
        .maybeSingle();
      if (invRow) {
        const newQty = Math.max(0, (invRow.quantity ?? 0) - parseInt(form.jars));
        await supabase.from('inventory_items').update({ quantity: newQty, last_updated: new Date().toISOString() }).eq('id', invRow.id);
        if (newQty <= invRow.reorder_threshold) {
          await supabase.from('events').insert([{
            location_id: 'buziga',
            event_type: 'reorder_required',
            department: 'inventory',
            severity: 'warning',
            payload: { items: [{ name: form.product_type, quantity: newQty, threshold: invRow.reorder_threshold }], triggered_by: 'sales' },
          }]);
        }
      }

      showToast({ type: 'success', message: `Sale logged — ${form.jars} × ${form.product_type} to ${form.distributor} · UGX ${parseInt(form.amount_ugx).toLocaleString()}` });
      setForm({ distributor: '', product_type: '20L Refill', jars: '', amount_ugx: '', notes: '' });
      await loadAll();
    } catch (err: any) {
      setFormError(err.message ?? 'Error logging sale');
    } finally {
      setSaving(false);
    }
  };

  // KPI computed values
  const revenueToday = todaySales.reduce((s, r) => s + (r.amount_ugx ?? 0), 0);
  const jarsSoldToday = todaySales.reduce((s, r) => s + (r.jars_sold ?? 0), 0);
  const avgOrderValue = todaySales.length > 0 ? Math.round(revenueToday / todaySales.length) : 0;
  const activeDistributorsToday = new Set(todaySales.map((s) => s.distributor)).size;

  const revenueWeekly = weeklySales.reduce((s, r) => s + (r.amount_ugx ?? 0), 0);
  const revenueMonthly = monthlySales.reduce((s, r) => s + (r.amount_ugx ?? 0), 0);

  const myRank = leaderboard.findIndex((e) => e.name === user?.name) + 1;

  const kpis = [
    {
      label: "Revenue Today",
      value: revenueToday > 0 ? `UGX ${revenueToday.toLocaleString()}` : 'No data — enter it.',
      sub: `[source: sales_ledger, ${today}]`,
      color: revenueToday > 0 ? 'text-emerald-400' : 'text-outline',
    },
    {
      label: "Jars Sold Today",
      value: jarsSoldToday > 0 ? jarsSoldToday.toLocaleString() : '0',
      sub: `${todaySales.length} transaction${todaySales.length !== 1 ? 's' : ''} today`,
      color: jarsSoldToday > 0 ? 'text-sky-400' : 'text-outline',
    },
    {
      label: "Avg Order Value",
      value: avgOrderValue > 0 ? `UGX ${avgOrderValue.toLocaleString()}` : '—',
      sub: 'Per transaction today',
      color: 'text-on-surface',
    },
    {
      label: "Distributors Served",
      value: activeDistributorsToday.toString(),
      sub: 'Unique accounts today',
      color: activeDistributorsToday > 0 ? 'text-sky-400' : 'text-outline',
    },
    {
      label: "Weekly Revenue",
      value: revenueWeekly > 0 ? `UGX ${revenueWeekly.toLocaleString()}` : 'No data',
      sub: 'Rolling 7 days',
      color: revenueWeekly > 0 ? 'text-emerald-400' : 'text-outline',
    },
    {
      label: "Monthly Revenue",
      value: revenueMonthly > 0 ? `UGX ${revenueMonthly.toLocaleString()}` : 'No data',
      sub: `${new Date().toLocaleString('en-GB', { month: 'long', year: 'numeric' })} MTD`,
      color: revenueMonthly > 0 ? 'text-emerald-400' : 'text-outline',
    },
  ];

  const integrations = [
    {
      icon: '📱',
      name: 'WhatsApp Business',
      status: 'planned',
      desc: 'Auto-send order confirmation receipts to distributors via WhatsApp API after each logged sale.',
    },
    {
      icon: '💸',
      name: 'MTN Mobile Money',
      status: 'planned',
      desc: 'Pull MTN MoMo transaction confirmations via API and match to sales_ledger rows — zero manual reconciliation.',
    },
    {
      icon: '📊',
      name: 'Google Sheets',
      status: 'live',
      desc: 'Daily auto-sync of all sales data to Google Sheets at 6 AM Kampala. Manual sync available in Settings.',
    },
    {
      icon: '📡',
      name: 'Telegram Briefs',
      status: 'live',
      desc: 'Morning brief with yesterday\'s revenue, top distributor, and jars sold. Sent to founders at 6 AM Kampala.',
    },
    {
      icon: '🧾',
      name: 'PDF Receipts',
      status: 'planned',
      desc: 'Generate printable/WhatsApp-shareable PDF receipts per sale with Maji Safi branding for distributor records.',
    },
    {
      icon: '📍',
      name: 'Distributor GPS',
      status: 'future',
      desc: 'Map view of active distributor zones in Kampala. Track pickup frequency and dead zones for expansion planning.',
    },
    {
      icon: '🤖',
      name: 'SAFI AI',
      status: 'live',
      desc: 'Ask SAFI about revenue trends, top distributors, and product mix. Real-time answers from your sales_ledger data.',
    },
    {
      icon: '📲',
      name: 'SMS Gateway',
      status: 'planned',
      desc: 'Fallback for distributors without smartphones — send order confirmations and reorder reminders via SMS (Africa\'s Talking API).',
    },
  ];

  const statusBadge = (status: string) => {
    if (status === 'live') return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
    if (status === 'planned') return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
    return 'bg-surface-container text-outline border border-outline/20';
  };

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {isReadOnly && (
        <div className="mb-6 px-4 py-2.5 bg-surface-container border-l-2 border-outline/30 flex items-center gap-2">
          <span className="text-[10px] font-label text-outline uppercase tracking-widest">View only — you are not assigned to this department</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-2 text-outline mb-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-[10px] tracking-widest uppercase font-label">Revenue Operations</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold font-headline tracking-tighter text-on-surface">
            Sales – Revenue
          </h1>
          <p className="text-outline text-sm font-label mt-1">
            {isFounder ? 'All reps · All distributors · buziga' : `Your sales — ${user?.name ?? ''} · buziga`}
            {!isFounder && myRank > 0 && (
              <span className="ml-2 text-sky-400 font-bold">#{myRank} on today's leaderboard</span>
            )}
          </p>
        </div>
        <button
          onClick={loadAll}
          className="flex items-center gap-2 bg-surface-container-high text-on-surface font-label text-xs font-semibold px-4 py-3 hover:bg-surface-container-highest transition-all active:scale-95"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-10">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-surface-container-low ghost-border p-5">
            <p className="font-label text-[10px] text-outline uppercase tracking-[0.2em] mb-2 leading-tight">{kpi.label}</p>
            <p className={`font-body text-xl font-bold leading-tight ${kpi.color}`}>{loading ? '—' : kpi.value}</p>
            <p className="text-[10px] text-outline/40 font-label mt-1.5 leading-snug">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Two-column: Leaderboard + Distributor Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">

        {/* Leaderboard */}
        <div className="bg-surface-container-low ghost-border overflow-hidden">
          <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/10 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline font-label">Today's Leaderboard</h3>
            <span className="ml-auto text-[10px] font-body text-outline/40">[source: sales_ledger, {today}]</span>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-outline/40 text-sm font-label">Loading…</div>
          ) : leaderboard.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-outline/50 text-sm font-label">No sales logged today.</p>
              <p className="text-[10px] text-outline/30 mt-1">First rep to log a sale claims the top spot.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {leaderboard.map((entry, idx) => {
                const isMe = entry.name === user?.name;
                const medals = ['🥇', '🥈', '🥉'];
                return (
                  <div
                    key={entry.name}
                    className={`flex items-center gap-4 px-6 py-4 ${isMe ? 'bg-sky-500/5 border-l-2 border-sky-400' : ''}`}
                  >
                    <span className="text-lg w-8 flex-shrink-0 text-center">
                      {idx < 3 ? medals[idx] : `#${idx + 1}`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${isMe ? 'text-sky-300' : 'text-on-surface'}`}>
                        {entry.name} {isMe && <span className="text-[10px] text-sky-400/60 font-normal">(you)</span>}
                      </p>
                      <p className="text-[10px] text-outline/50 font-label">
                        {entry.saleCount} sale{entry.saleCount !== 1 ? 's' : ''} · {entry.totalJars} jars
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-400">UGX {entry.totalRevenue.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Distributors This Month */}
        <div className="bg-surface-container-low ghost-border overflow-hidden">
          <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/10 flex items-center gap-3">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline font-label">Top Distributors — MTD</h3>
            <span className="ml-auto text-[10px] font-body text-outline/40">[source: sales_ledger]</span>
          </div>
          {loading ? (
            <div className="px-6 py-8 text-center text-outline/40 text-sm font-label">Loading…</div>
          ) : distPerf.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-outline/50 text-sm font-label">No distributor data this month.</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {distPerf.map((dist, idx) => (
                <div key={dist.name} className="flex items-center gap-4 px-6 py-4">
                  <span className="text-sm font-bold text-outline/40 w-6 flex-shrink-0">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface truncate">{dist.name}</p>
                    <p className="text-[10px] text-outline/50 font-label">
                      {dist.totalJars} jars · Last: {dist.lastSale ? new Date(dist.lastSale).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-400">UGX {dist.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Log Sale Form */}
      {canEdit && (
        <section className="mb-10 bg-surface-container-low ghost-border overflow-hidden">
          <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/10 flex items-center gap-3">
            <ShoppingCart className="w-4 h-4 text-sky-400" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline font-label">Log a Sale</h3>
            <span className="ml-auto text-[10px] text-outline/40 font-label">Logged as {user?.name}</span>
          </div>
          <form onSubmit={handleLogSale} className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-label text-outline uppercase tracking-widest mb-1.5">Distributor Name</label>
              <input
                value={form.distributor}
                onChange={(e) => setForm((p) => ({ ...p, distributor: e.target.value }))}
                placeholder="e.g. Kato Supplies"
                className="w-full bg-surface-container border border-outline-variant/20 px-4 py-2.5 text-sm text-on-surface font-label focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-label text-outline uppercase tracking-widest mb-1.5">Product</label>
              <select
                value={form.product_type}
                onChange={(e) => handleJarsChange(form.jars, e.target.value)}
                className="w-full bg-surface-container border border-outline-variant/20 px-4 py-2.5 text-sm text-on-surface font-label focus:outline-none focus:border-primary/40"
              >
                {PRODUCT_TYPES.map((p) => (
                  <option key={p} value={p}>{p} — UGX {T1_PRICES[p].toLocaleString()}/jar</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-label text-outline uppercase tracking-widest mb-1.5">Jars Sold</label>
              <input
                value={form.jars}
                onChange={(e) => handleJarsChange(e.target.value, form.product_type)}
                placeholder="e.g. 50"
                type="number"
                min="1"
                className="w-full bg-surface-container border border-outline-variant/20 px-4 py-2.5 text-sm text-on-surface font-label focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-label text-outline uppercase tracking-widest mb-1.5">Amount (UGX) — T1</label>
              <input
                value={form.amount_ugx}
                onChange={(e) => setForm((p) => ({ ...p, amount_ugx: e.target.value }))}
                placeholder="Auto-computed"
                type="number"
                min="0"
                className="w-full bg-surface-container border border-outline-variant/20 px-4 py-2.5 text-sm text-on-surface font-label focus:outline-none focus:border-primary/40"
              />
            </div>
            <div>
              <label className="block text-[10px] font-label text-outline uppercase tracking-widest mb-1.5">Notes (optional)</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Payment method, special terms…"
                className="w-full bg-surface-container border border-outline-variant/20 px-4 py-2.5 text-sm text-on-surface font-label focus:outline-none focus:border-primary/40"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-container text-on-primary-container font-label text-sm font-semibold px-6 py-2.5 hover:brightness-110 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                {saving ? 'Logging…' : 'Log Sale'}
              </button>
            </div>
            {formError && (
              <div className="md:col-span-2 xl:col-span-3 text-red-400 text-xs font-bold font-label">{formError}</div>
            )}
          </form>
        </section>
      )}

      {/* Today's Sales Log */}
      <section className="mb-10 bg-surface-container-low ghost-border overflow-hidden">
        <div className="px-6 py-4 bg-surface-container border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-outline font-label">
            {isFounder ? "Today's Sales — All Reps" : "Your Sales Today"}
          </h3>
          <span className="text-[10px] font-body text-outline/40">[source: sales_ledger, buziga, {today}]</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-lowest">
                {['Time', 'Distributor', 'Product', 'Jars', 'Amount (UGX)', isFounder ? 'Rep' : ''].filter(Boolean).map((h) => (
                  <th key={h} className="px-6 py-3 text-[10px] font-label text-outline uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10 font-body">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-outline/40 text-sm font-label">Loading…</td></tr>
              ) : todaySales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <p className="text-outline/40 text-sm font-label">No sales logged today.</p>
                    <p className="text-[10px] text-outline/25 mt-1">Use the form above to log your first sale.</p>
                  </td>
                </tr>
              ) : todaySales.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container/50 transition-colors">
                  <td className="px-6 py-4 text-[11px] font-label text-outline/60">
                    {new Date(s.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-on-surface">{s.distributor}</td>
                  <td className="px-6 py-4 text-[11px] font-label text-outline/70">{s.product_type}</td>
                  <td className="px-6 py-4 text-sm text-on-surface">{(s.jars_sold ?? 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-emerald-400">{(s.amount_ugx ?? 0).toLocaleString()}</td>
                  {isFounder && (
                    <td className="px-6 py-4 text-[11px] font-label text-outline/60">{s.logged_by}</td>
                  )}
                </tr>
              ))}
            </tbody>
            {todaySales.length > 0 && (
              <tfoot>
                <tr className="bg-surface-container border-t border-outline-variant/10">
                  <td colSpan={isFounder ? 4 : 3} className="px-6 py-3 text-[10px] font-label text-outline uppercase tracking-widest">Total</td>
                  <td className="px-6 py-3 text-sm font-black text-emerald-400">{revenueToday.toLocaleString()}</td>
                  {isFounder && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* Integrations & Tools */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-outline font-label">Integrations & Tools</h2>
          <div className="flex gap-3 ml-4">
            {['live', 'planned', 'future'].map((s) => (
              <span key={s} className={`text-[9px] font-bold px-2 py-0.5 rounded font-label uppercase tracking-widest ${statusBadge(s)}`}>{s}</span>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {integrations.map((tool) => (
            <div key={tool.name} className="bg-surface-container-low ghost-border p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{tool.icon}</span>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-label uppercase tracking-widest ${statusBadge(tool.status)}`}>
                  {tool.status}
                </span>
              </div>
              <p className="text-sm font-bold text-on-surface font-headline">{tool.name}</p>
              <p className="text-[11px] text-outline/60 font-label leading-relaxed">{tool.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <DeptTeamPanel departmentSlug="sales" />
    </div>
  );
}
