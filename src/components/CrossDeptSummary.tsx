'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  Factory, CheckCircle2, Package, Truck, ShoppingCart,
  TrendingUp, DollarSign, Shield, Zap, Users2, AlertTriangle, Info,
} from 'lucide-react';

interface SummaryCard {
  id: string;
  source_dept: string;
  data_category: string;
  share_type: string;
  entity_table: string | null;
  why_shared: string;
  refresh_frequency: string;
  value: string | number;
  unit: string;
  updated_at: string;
}

const DEPT_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  'production':    { icon: Factory,     color: 'text-emerald-400', label: 'Production' },
  'quality':       { icon: CheckCircle2, color: 'text-purple-400', label: 'Quality' },
  'inventory':     { icon: Package,     color: 'text-blue-400',    label: 'Inventory' },
  'dispatch':      { icon: Truck,       color: 'text-cyan-400',    label: 'Dispatch' },
  'sales':         { icon: ShoppingCart, color: 'text-pink-400',   label: 'Sales' },
  'marketing':     { icon: TrendingUp,  color: 'text-orange-400',  label: 'Marketing' },
  'finance':       { icon: DollarSign,  color: 'text-emerald-400', label: 'Finance' },
  'compliance':    { icon: Shield,      color: 'text-slate-400',   label: 'Compliance' },
  'technology':    { icon: Zap,         color: 'text-sky-400',     label: 'Technology' },
  'founder-office':{ icon: Users2,      color: 'text-[#0077B6]',   label: 'Founder Office' },
};

const SHARE_TYPE_COLOR: Record<string, string> = {
  alert:   'border-red-500/30 bg-red-500/5',
  summary: 'border-zinc-800',
  detail:  'border-[#0077B6]/20 bg-[#0077B6]/5',
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function CrossDeptSummary({ deptSlug }: { deptSlug: string }) {
  const [cards, setCards] = useState<SummaryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/cross-dept-summary?dept=${deptSlug}`);
    if (res.ok) setCards(await res.json());
    setLoading(false);
  }, [deptSlug]);

  useEffect(() => {
    load();

    // Subscribe to changes on any source table that feeds this dept
    channelRef.current = supabase
      .channel(`cross-dept:${deptSlug}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_logs' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'water_tests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_ledger' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'distributors' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, load)
      .subscribe();

    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [deptSlug, load]);

  if (!loading && cards.length === 0) return null;

  return (
    <div>
      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-3">
        From other departments
      </p>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {cards.map(card => {
            const meta = DEPT_META[card.source_dept];
            const Icon = meta?.icon ?? Factory;
            const borderClass = SHARE_TYPE_COLOR[card.share_type] ?? 'border-zinc-800';

            return (
              <div
                key={card.id}
                className={`relative bg-zinc-900 border rounded-xl p-4 ${borderClass}`}
              >
                {/* Alert badge */}
                {card.share_type === 'alert' && (
                  <span className="absolute top-2 right-2">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                  </span>
                )}

                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`w-3 h-3 ${meta?.color ?? 'text-zinc-500'}`} />
                  <span className={`text-[9px] font-black uppercase tracking-widest ${meta?.color ?? 'text-zinc-500'}`}>
                    {meta?.label ?? card.source_dept}
                  </span>
                  <button
                    className="ml-auto text-zinc-700 hover:text-zinc-400 transition-colors"
                    onMouseEnter={() => setTooltip(card.id)}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <Info className="w-2.5 h-2.5" />
                  </button>
                </div>

                <p className="text-xl font-black text-white tabular-nums leading-none">
                  {card.value}
                </p>
                <p className="text-[9px] text-zinc-500 mt-1 leading-snug truncate">
                  {card.unit}
                </p>

                {/* Why shared tooltip */}
                {tooltip === card.id && (
                  <div className="absolute bottom-full left-0 mb-2 w-56 bg-zinc-800 border border-zinc-700 rounded-xl p-3 z-50 shadow-xl">
                    <p className="text-[10px] text-zinc-400 leading-relaxed">{card.why_shared}</p>
                    <p className="text-[9px] text-zinc-600 mt-1.5">
                      {card.refresh_frequency === 'realtime' ? '⚡ Live' : `↻ ${card.refresh_frequency}`}
                      {' · '}updated {timeAgo(card.updated_at)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
