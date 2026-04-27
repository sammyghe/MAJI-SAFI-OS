'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Settings2, AlertTriangle } from 'lucide-react';

interface Toggle {
  id: string;
  feature_slug: string;
  feature_name: string;
  description: string | null;
  enabled: boolean;
  category: string | null;
  affects: string[] | null;
  updated_by: string | null;
  updated_at: string;
}

const CATEGORY_ORDER = ['inventory', 'production', 'quality', 'finance', 'dispatch', 'sales', 'marketing', 'compliance', 'technology', 'worker', 'qms'];
const CATEGORY_LABELS: Record<string, string> = {
  inventory: 'Inventory', production: 'Production', quality: 'Quality',
  finance: 'Finance', dispatch: 'Dispatch', sales: 'Sales', marketing: 'Marketing',
  compliance: 'Compliance', technology: 'Technology', worker: 'Worker Experience', qms: 'QMS / Documents',
};

export default function FeaturesPage() {
  const { user } = useAuth();
  const [toggles, setToggles] = useState<Toggle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('feature_toggles').select('*').order('category').order('feature_name');
    setToggles(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!['founder', 'operations_manager'].includes(user?.role ?? '')) {
    return (
      <div className="px-6 py-16 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
        <p className="text-slate-700 font-semibold">Founders only</p>
      </div>
    );
  }

  const toggle = async (slug: string, current: boolean) => {
    setSaving(slug);
    await supabase.from('feature_toggles').update({
      enabled: !current,
      updated_by: user?.name ?? 'unknown',
      updated_at: new Date().toISOString(),
    }).eq('feature_slug', slug);
    setToggles(prev => prev.map(t => t.feature_slug === slug ? { ...t, enabled: !current } : t));
    setSaving(null);
  };

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    items: toggles.filter(t => t.category === cat),
  })).filter(g => g.items.length > 0);

  const enabledCount = toggles.filter(t => t.enabled).length;

  return (
    <div className="px-4 md:px-8 py-8 max-w-4xl mx-auto space-y-8">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#0077B620' }}>
            <Settings2 className="w-5 h-5 text-[#0077B6]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Feature Toggles</h1>
            <p className="text-slate-500 text-sm">{enabledCount} of {toggles.length} features enabled</p>
          </div>
        </div>
        <p className="text-slate-500 text-sm mt-3 glass-card p-4 rounded-2xl">
          Toggle features on/off across the entire OS. Disabled features hide their UI sections immediately — no page refresh needed.
          Changes apply to all users.
        </p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass-card p-6 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-32 mb-4" />
              {[1, 2, 3].map(j => <div key={j} className="h-16 bg-slate-100 rounded-xl mb-2" />)}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items }, i) => (
            <motion.div key={cat} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <div className="glass-card-strong divide-y divide-slate-100/80">
                {items.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{t.feature_name}</p>
                        {!t.enabled && (
                          <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">OFF</span>
                        )}
                      </div>
                      {t.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{t.description}</p>}
                      {t.affects && (
                        <p className="text-[10px] text-slate-400 mt-1">Affects: {t.affects.join(', ')}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      {t.updated_by && (
                        <p className="text-[9px] text-slate-400">by {t.updated_by}</p>
                      )}
                      {/* Toggle switch */}
                      <button
                        onClick={() => toggle(t.feature_slug, t.enabled)}
                        disabled={saving === t.feature_slug}
                        className="relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#0077B6]/30 disabled:opacity-50"
                        style={{ background: t.enabled ? '#0077B6' : '#CBD5E1' }}
                        aria-label={`Toggle ${t.feature_name}`}
                      >
                        <span
                          className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                          style={{ transform: t.enabled ? 'translateX(24px)' : 'translateX(0)' }}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
