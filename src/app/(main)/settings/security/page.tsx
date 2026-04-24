'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Shield, RefreshCw } from 'lucide-react';

interface LoginEntry {
  id: string;
  user_id: string | null;
  user_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  created_at: string;
}

export default function SecurityPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [entries, setEntries] = useState<LoginEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'success' | 'failure'>('all');

  useEffect(() => {
    if (user && user.role !== 'founder') router.push('/settings');
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    const query = supabase
      .from('login_audit')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    const { data } = await query;
    setEntries(data ?? []);
    setLoading(false);
  };

  if (user?.role !== 'founder') return null;

  const filtered = entries.filter((e) => {
    if (filter === 'success') return e.success;
    if (filter === 'failure') return !e.success;
    return true;
  });

  const failCount = entries.filter((e) => !e.success).length;
  const successCount = entries.filter((e) => e.success).length;

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
          <Shield className="w-7 h-7 text-brand-sky" />
          Security <span className="text-brand-sky">Audit</span>
        </h1>
        <p className="text-brand-steel font-bold text-xs uppercase tracking-widest mt-1">
          Founder Only · Last 100 login attempts
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Attempts', value: entries.length, color: 'text-white' },
          { label: 'Successful', value: successCount, color: 'text-emerald-400' },
          { label: 'Failed', value: failCount, color: failCount > 10 ? 'text-red-400' : 'text-amber-400' },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-2xl p-5 text-center">
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-brand-steel uppercase tracking-widest mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Refresh */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'success', 'failure'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${
                filter === f
                  ? 'bg-brand-sky/20 border border-brand-sky/30 text-brand-sky'
                  : 'bg-white/5 border border-white/10 text-brand-steel hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-brand-steel text-xs font-black uppercase tracking-widest hover:text-white transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="glass-panel rounded-[2rem] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
          <Shield className="w-4 h-4 text-brand-sky" />
          <span className="text-xs font-black text-white uppercase tracking-widest">Login Audit Log</span>
          <span className="ml-auto text-[10px] text-brand-steel">{filtered.length} entries</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-brand-steel text-xs font-black uppercase tracking-widest animate-pulse">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-brand-steel text-sm">No login records found.</p>
            <p className="text-brand-steel/50 text-xs mt-1">Run the 20260424_login_audit.sql migration first.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((e) => (
              <div key={e.id} className="px-6 py-3 flex items-center gap-4 hover:bg-white/2 transition-colors">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-bold text-white">
                      {e.user_name ?? 'Unknown'}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                      e.success
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {e.success ? 'Success' : 'Failed'}
                    </span>
                    <span className="text-[10px] text-brand-steel font-mono">{e.ip_address}</span>
                  </div>
                  <p className="text-[10px] text-brand-steel/50 truncate mt-0.5">{e.user_agent}</p>
                </div>
                <span className="text-[10px] text-brand-steel/50 flex-shrink-0">
                  {new Date(e.created_at).toLocaleString('en-GB')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
