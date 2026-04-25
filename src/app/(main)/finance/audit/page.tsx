'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { History, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditEntry {
  id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  row_id: string | null;
  changed_by: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  diff: Record<string, { from: unknown; to: unknown }> | null;
  created_at: string;
}

const OP_COLOR: Record<string, string> = {
  INSERT: 'text-emerald-400 bg-emerald-500/10',
  UPDATE: 'text-amber-400 bg-amber-500/10',
  DELETE: 'text-red-400 bg-red-500/10',
};

const WATCHED_TABLES = [
  'products', 'product_pricing', 'product_unit_economics',
  'chart_of_accounts', 'budgets', 'bank_accounts',
  'transactions', 'sales_ledger', 'scenarios', 'rocks', 'issues', 'team_members',
];

function DiffView({ diff }: { diff: Record<string, { from: unknown; to: unknown }> }) {
  const keys = Object.keys(diff);
  if (!keys.length) return null;
  return (
    <div className="mt-2 space-y-1">
      {keys.map(k => (
        <div key={k} className="flex items-start gap-2 text-[10px] font-mono">
          <span className="text-zinc-500 shrink-0 w-32 truncate">{k}</span>
          <span className="text-red-400 line-through truncate max-w-[140px]">{String(diff[k].from ?? '—')}</span>
          <span className="text-zinc-600">→</span>
          <span className="text-emerald-400 truncate max-w-[140px]">{String(diff[k].to ?? '—')}</span>
        </div>
      ))}
    </div>
  );
}

function EntryRow({ entry }: { entry: AuditEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDiff = entry.diff && Object.keys(entry.diff).length > 0;

  return (
    <div className="border-b border-zinc-800/50 last:border-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest shrink-0 ${OP_COLOR[entry.operation]}`}>
          {entry.operation}
        </span>
        <span className="text-xs font-mono text-zinc-400 shrink-0 w-36 truncate">{entry.table_name}</span>
        <span className="text-xs text-zinc-600 font-mono truncate flex-1">{entry.row_id?.slice(0, 8)}…</span>
        <span className="text-[10px] text-zinc-600 shrink-0">
          {new Date(entry.created_at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
        {hasDiff && (expanded ? <ChevronDown className="w-3 h-3 text-zinc-600 shrink-0" /> : <ChevronRight className="w-3 h-3 text-zinc-600 shrink-0" />)}
      </button>
      {expanded && entry.diff && hasDiff && (
        <div className="px-4 pb-3">
          <DiffView diff={entry.diff as Record<string, { from: unknown; to: unknown }>} />
        </div>
      )}
      {expanded && !hasDiff && entry.new_data && (
        <div className="px-4 pb-3">
          <pre className="text-[10px] font-mono text-zinc-500 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
            {JSON.stringify(entry.new_data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AuditPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isFounder = user?.role === 'founder';
  const isCFO = isFounder || user?.permissions?.can_view_financials;

  useEffect(() => { if (user && !isCFO) router.push('/finance'); }, [user, isCFO]);

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [tableFilter, setTableFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (tableFilter) params.set('table', tableFilter);
    const res = await fetch(`/api/audit?${params}`);
    const data = await res.json();
    setEntries(data.entries ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [tableFilter, page]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [tableFilter]);

  if (!isCFO) return null;

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#0077B6]" /> Audit Log
          </h1>
          <p className="text-zinc-500 text-xs uppercase tracking-widest mt-1">Every change · Immutable · Trigger-written</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={tableFilter} onChange={e => setTableFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none">
            <option value="">All tables</option>
            {WATCHED_TABLES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-xs text-zinc-600">{total.toLocaleString()} entries</span>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-zinc-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading audit log…</p>
        ) : entries.length === 0 ? (
          <p className="px-4 py-8 text-zinc-700 text-sm text-center">
            {tableFilter ? `No audit entries for table "${tableFilter}" yet.` : 'No audit entries yet. Entries appear after the first DB write.'}
          </p>
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-zinc-800 grid grid-cols-4 gap-3">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Op</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Table</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Row</p>
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-right">Time</p>
            </div>
            {entries.map(e => <EntryRow key={e.id} entry={e} />)}
          </>
        )}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-4">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-black text-zinc-400 hover:text-white disabled:opacity-30">
            ← Prev
          </button>
          <span className="text-xs text-zinc-600">Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}</span>
          <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-black text-zinc-400 hover:text-white disabled:opacity-30">
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
