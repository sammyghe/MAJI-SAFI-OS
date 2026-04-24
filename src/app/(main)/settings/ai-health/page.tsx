'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { RefreshCw, CheckCircle2, XCircle, Zap } from 'lucide-react';

interface ProviderResult {
  ok: boolean;
  ms: number;
  error?: string;
}

interface HealthData {
  status: string;
  active_provider: string;
  checked_at: string;
  providers: {
    groq: ProviderResult;
    gemini: ProviderResult;
    claude: ProviderResult;
  };
}

const PROVIDER_LABELS: Record<string, { label: string; model: string; tier: number }> = {
  groq:   { label: 'Groq',         model: 'llama-3.3-70b-versatile',         tier: 1 },
  gemini: { label: 'Gemini Flash', model: 'gemini-2.5-flash-preview-04-17',  tier: 2 },
  claude: { label: 'Claude Haiku', model: 'claude-haiku-4-5-20251001',        tier: 3 },
};

export default function AIHealthPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'founder') router.push('/settings');
    check();
  }, [user]);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/ask/health');
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth(null);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  if (user?.role !== 'founder') return null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
          <Zap className="w-7 h-7 text-brand-sky" />
          AI Provider <span className="text-brand-sky">Health</span>
        </h1>
        <p className="text-brand-steel font-bold text-xs uppercase tracking-widest mt-1">
          Founder Only · Live status of all 3 SAFI AI providers
        </p>
      </div>

      <div className="flex items-center justify-between">
        {health && (
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${health.status === 'ok' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <span className="text-xs font-bold text-white uppercase tracking-widest">
              {health.status === 'ok' ? 'System Online' : 'All Providers Down'}
            </span>
            {health.active_provider !== 'offline' && (
              <span className="text-[10px] text-brand-steel">
                Active: <strong className="text-brand-sky">{health.active_provider}</strong>
              </span>
            )}
          </div>
        )}
        <button
          onClick={check}
          disabled={checking}
          className="flex items-center gap-2 px-4 py-2 bg-brand-sky/10 border border-brand-sky/20 rounded-xl text-brand-sky text-xs font-black uppercase tracking-widest hover:bg-brand-sky/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          {checking ? 'Checking…' : 'Re-check'}
        </button>
      </div>

      {loading ? (
        <p className="text-brand-steel text-xs font-black uppercase tracking-widest animate-pulse">Pinging providers…</p>
      ) : !health ? (
        <div className="glass-panel rounded-[2rem] p-8 text-center">
          <p className="text-red-400 font-bold text-sm">Health check failed — could not reach /api/ask/health</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(['groq', 'gemini', 'claude'] as const).map((key) => {
            const result = health.providers[key];
            const meta = PROVIDER_LABELS[key];
            return (
              <section key={key} className="glass-panel rounded-[2rem] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {result.ok ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white">{meta.label}</span>
                        <span className="text-[10px] font-bold text-brand-steel/60 uppercase bg-white/5 px-2 py-0.5 rounded">
                          Tier {meta.tier}
                        </span>
                        {health.active_provider === key && (
                          <span className="text-[10px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-brand-steel/60 font-mono mt-0.5">{meta.model}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {result.ok ? (
                      <span className="text-emerald-400 font-black text-sm">{result.ms}ms</span>
                    ) : (
                      <span className="text-red-400 font-bold text-xs">{result.error ?? 'Error'}</span>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {health && (
        <p className="text-[10px] text-brand-steel/40 font-mono">
          Last checked: {new Date(health.checked_at).toLocaleString('en-GB')}
        </p>
      )}

      <div className="p-4 bg-brand-sky/10 border border-brand-sky/20 rounded-xl">
        <p className="text-brand-sky text-xs font-bold">
          Fallback chain: Groq → Gemini Flash → Claude Haiku. If Groq is down, SAFI automatically uses Gemini. If both are down, Claude Haiku takes over. All three failing means SAFI shows an offline message.
        </p>
      </div>
    </div>
  );
}
