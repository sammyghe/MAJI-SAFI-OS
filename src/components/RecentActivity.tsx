'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, ChevronDown, ChevronRight } from 'lucide-react';

type ActivityRow = {
  id: string;
  table: string;
  summary: string;
  who: string;
  at: string;
};

const TABLE_CONFIG: Record<string, { label: string; whoField: string; summaryFn: (r: any) => string }> = {
  production_logs: {
    label: 'Production',
    whoField: 'operator_name',
    summaryFn: (r) => `Logged batch ${r.batch_id ?? 'N/A'} — ${r.jar_count ?? 0} jars × ${r.product_type ?? '—'}`,
  },
  water_tests: {
    label: 'Quality',
    whoField: 'tested_by',
    summaryFn: (r) => `${r.test_type ?? 'Test'} ${r.reading ?? '?'} → ${r.result ?? '—'} (batch ${r.batch_id?.slice(0, 12) ?? 'N/A'})`,
  },
  sales_ledger: {
    label: 'Sales',
    whoField: 'logged_by',
    summaryFn: (r) => `Sold ${r.jar_count ?? 0} × ${r.product_type ?? '—'} to ${r.distributor ?? 'unknown'} — UGX ${(r.amount_ugx ?? 0).toLocaleString()}`,
  },
  daily_cash: {
    label: 'Cash',
    whoField: 'recorded_by',
    summaryFn: (r) => `Cash count UGX ${(r.physical_cash_count_ugx ?? 0).toLocaleString()} for ${r.date ?? '—'}`,
  },
  inventory_items: {
    label: 'Inventory',
    whoField: '',
    summaryFn: (r) => `${r.item_name ?? 'Item'} stock: ${r.quantity ?? 0} ${r.unit ?? 'units'}`,
  },
  transactions: {
    label: 'Finance',
    whoField: 'recorded_by',
    summaryFn: (r) => `${r.transaction_type ?? 'Entry'}: ${r.category ?? '—'} — UGX ${(r.amount_ugx ?? 0).toLocaleString()}`,
  },
  prospects: {
    label: 'Marketing',
    whoField: '',
    summaryFn: (r) => `Prospect ${r.name ?? '—'} — ${r.status ?? 'new'} (${r.zone ?? 'unknown zone'})`,
  },
  compliance_records: {
    label: 'Compliance',
    whoField: '',
    summaryFn: (r) => `${r.document_name ?? 'Document'} — ${r.status ?? '—'} (expires ${r.expiry_date ?? 'N/A'})`,
  },
  capa_records: {
    label: 'CAPA',
    whoField: '',
    summaryFn: (r) => `CAPA for batch ${r.batch_id ?? 'N/A'} — ${r.status ?? 'open'}`,
  },
  events: {
    label: 'Event',
    whoField: '',
    summaryFn: (r) => `${r.event_type?.replace(/_/g, ' ') ?? 'event'} [${r.severity ?? 'info'}] — dept: ${r.department ?? '—'}`,
  },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  tables: string[];
  departmentSlug: string;
  limit?: number;
}

export default function RecentActivity({ tables, departmentSlug, limit = 20 }: Props) {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = async () => {
    const results: ActivityRow[] = [];

    for (const table of tables) {
      const config = TABLE_CONFIG[table];
      if (!config) continue;

      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('location_id', 'buziga')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (data) {
        data.forEach((row) => {
          const who = config.whoField ? (row[config.whoField] ?? 'System') : 'System';
          results.push({
            id: `${table}-${row.id}`,
            table: config.label,
            summary: config.summaryFn(row),
            who,
            at: row.created_at ?? row.updated_at ?? new Date().toISOString(),
          });
        });
      }
    }

    // Sort by timestamp desc, take top N
    results.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    setRows(results.slice(0, limit));
    setLoading(false);
  };

  useEffect(() => {
    load();

    const ch = supabase.channel(`rt:activity:${departmentSlug}`);
    for (const table of tables) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, () => { load(); });
    }
    ch.subscribe();
    channelRef.current = ch;

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [departmentSlug]);

  return (
    <div className="mt-8 border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-6 py-4 bg-surface-container-low hover:bg-surface-container transition-colors"
      >
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-outline" />
          <span className="text-xs font-bold text-outline uppercase tracking-widest">Recent Activity</span>
          {!loading && (
            <span className="text-[10px] text-outline/50 font-label ml-1">— last {rows.length} changes</span>
          )}
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-outline/50" /> : <ChevronRight className="w-4 h-4 text-outline/50" />}
      </button>

      {open && (
        <div className="divide-y divide-outline-variant/5">
          {loading ? (
            <div className="px-6 py-8 text-center text-outline/40 text-xs font-label">Loading activity…</div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-8 text-center text-outline/40 text-xs font-label">No activity yet — data will appear here as the team logs entries.</div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="px-6 py-3 flex items-start gap-4 hover:bg-surface-container-low/30 transition-colors">
                <div className="flex-shrink-0 pt-0.5">
                  <span className="inline-block px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest bg-surface-container border border-outline/10 text-outline/60 rounded">
                    {row.table}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-on-surface font-label leading-snug truncate">{row.summary}</p>
                  <p className="text-[10px] text-outline/50 font-label mt-0.5">
                    {row.who !== 'System' ? <span className="text-outline/70 font-bold">{row.who}</span> : 'System'}
                    {' · '}
                    {timeAgo(row.at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
