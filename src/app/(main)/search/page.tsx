'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Package, BookOpen, AlertCircle, Target, Users, Truck } from 'lucide-react';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Product: Package,
  Account: BookOpen,
  Issue: AlertCircle,
  Rock: Target,
  Team: Users,
  Distributor: Truck,
};

const TYPE_COLORS: Record<string, string> = {
  Product: 'text-blue-400 bg-blue-500/10',
  Account: 'text-amber-400 bg-amber-500/10',
  Issue: 'text-red-400 bg-red-500/10',
  Rock: 'text-sky-400 bg-sky-500/10',
  Team: 'text-emerald-400 bg-emerald-500/10',
  Distributor: 'text-purple-400 bg-purple-500/10',
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults([]); return; }
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(r => r.json())
      .then(d => { setResults(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [debouncedQuery]);

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div className="px-6 py-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2 mb-4">
          <Search className="w-6 h-6 text-[#0077B6]" /> Universal Search
        </h1>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search products, accounts, issues, rocks, team, distributors…"
            className="w-full bg-white border border-slate-200 rounded-2xl pl-11 pr-4 py-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-[#0077B6]/50 focus:ring-1 focus:ring-[#0077B6]/30"
          />
          {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-slate-200 border-t-[#0077B6] rounded-full animate-spin" />
          )}
        </div>
      </div>

      {query.length >= 2 && results.length === 0 && !loading && (
        <p className="text-slate-600 text-sm text-center py-8">No results for "{query}"</p>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const Icon = TYPE_ICONS[type] ?? Package;
        const color = TYPE_COLORS[type] ?? 'text-slate-400 bg-slate-100';
        return (
          <div key={type} className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${color}`}>
                {type}
              </span>
              <span className="text-[10px] text-slate-700">{items.length} result{items.length > 1 ? 's' : ''}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              {items.map((r, i) => (
                <Link key={r.id} href={r.href}
                  className={`flex items-center gap-3 px-4 py-3.5 hover:bg-slate-100/50 transition-colors ${i < items.length - 1 ? 'border-b border-slate-200/50' : ''}`}>
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.title}</p>
                    {r.subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{r.subtitle}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {query.length < 2 && (
        <div className="text-center py-12">
          <Search className="w-10 h-10 text-slate-800 mx-auto mb-3" />
          <p className="text-slate-700 text-sm">Type at least 2 characters to search across the OS.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {['Products', 'Accounts', 'Issues', 'Rocks', 'Team', 'Distributors'].map(t => (
              <span key={t} className="text-[10px] text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-full">{t}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
