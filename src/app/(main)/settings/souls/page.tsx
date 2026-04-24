'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Bot, Save, RefreshCw } from 'lucide-react';

interface Soul {
  id: string;
  department_slug: string;
  soul_name: string;
  personality: string;
  system_prompt: string;
  primary_provider: string;
  fallback_provider: string;
  updated_at: string;
  updated_by: string;
}

const DEPT_ORDER = [
  'founder-office', 'production', 'quality', 'inventory', 'dispatch',
  'sales', 'marketing', 'finance', 'compliance', 'technology',
];

export default function SoulsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [souls, setSouls] = useState<Soul[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user && user.role !== 'founder') router.push('/settings');
    load();
  }, [user]);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('department_souls')
      .select('*')
      .order('department_slug');
    setSouls(data ?? []);
    setLoading(false);
  };

  const handleEdit = (slug: string, value: string) => {
    setEdits((prev) => ({ ...prev, [slug]: value }));
  };

  const handleSave = async (soul: Soul) => {
    const newPrompt = edits[soul.department_slug] ?? soul.system_prompt;
    setSaving(soul.department_slug);
    const { error } = await supabase
      .from('department_souls')
      .update({
        system_prompt: newPrompt,
        updated_by: user?.name ?? 'founder',
        updated_at: new Date().toISOString(),
      })
      .eq('id', soul.id);

    if (!error) {
      setSaved(soul.department_slug);
      setTimeout(() => setSaved(null), 3000);
      setSouls((prev) => prev.map((s) => s.id === soul.id ? { ...s, system_prompt: newPrompt } : s));
      setEdits((prev) => { const n = { ...prev }; delete n[soul.department_slug]; return n; });
    }
    setSaving(null);
  };

  if (user?.role !== 'founder') return null;

  const sortedSouls = [...souls].sort((a, b) =>
    DEPT_ORDER.indexOf(a.department_slug) - DEPT_ORDER.indexOf(b.department_slug)
  );

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
          <Bot className="w-7 h-7 text-brand-sky" />
          Department <span className="text-brand-sky">Souls</span>
        </h1>
        <p className="text-brand-steel font-bold text-xs uppercase tracking-widest mt-1">
          Founder Only · Edit each department&apos;s AI personality and system prompt
        </p>
      </div>

      <div className="p-4 bg-brand-sky/10 border border-brand-sky/20 rounded-xl">
        <p className="text-brand-sky text-xs font-bold">
          ℹ️ Run SQL migration <code className="bg-black/20 px-1 py-0.5 rounded">20260423_department_souls.sql</code> in Supabase first to populate these souls. Changes take effect immediately on the next SAFI question.
        </p>
      </div>

      {loading ? (
        <p className="text-brand-steel text-xs font-black uppercase tracking-widest animate-pulse">Loading souls…</p>
      ) : sortedSouls.length === 0 ? (
        <div className="glass-panel rounded-[2rem] p-8 text-center">
          <p className="text-brand-steel font-bold text-sm">No souls found — run the SQL migration first.</p>
          <pre className="text-xs text-brand-sky mt-4 text-left bg-black/20 p-4 rounded-xl overflow-auto">
            {`-- In Supabase SQL Editor:\n-- Paste contents of supabase/migrations/20260423_department_souls.sql`}
          </pre>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedSouls.map((soul) => {
            const currentPrompt = edits[soul.department_slug] ?? soul.system_prompt ?? '';
            const isDirty = soul.department_slug in edits && edits[soul.department_slug] !== soul.system_prompt;
            const isSaving = saving === soul.department_slug;
            const isSaved = saved === soul.department_slug;

            return (
              <section key={soul.id} className="glass-panel rounded-[2rem] p-6 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold text-brand-sky uppercase tracking-widest font-mono bg-brand-sky/10 px-2 py-0.5 rounded">
                        {soul.department_slug}
                      </span>
                      <span className="text-[10px] text-brand-steel font-bold">{soul.soul_name}</span>
                    </div>
                    <p className="text-xs text-brand-steel/70 italic">{soul.personality}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-brand-steel/50">
                    <span>Provider: <strong className="text-brand-steel">{soul.primary_provider}</strong> → {soul.fallback_provider}</span>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-brand-steel font-bold uppercase tracking-widest mb-2">System Prompt</p>
                  <textarea
                    value={currentPrompt}
                    onChange={(e) => handleEdit(soul.department_slug, e.target.value)}
                    rows={8}
                    className="w-full bg-brand-navy/30 border border-white/10 rounded-xl px-4 py-3 text-xs text-white font-mono leading-relaxed focus:outline-none focus:border-brand-sky/40 resize-y"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-[10px] text-brand-steel/50">
                    {soul.updated_at && (
                      <span>
                        Last updated {new Date(soul.updated_at).toLocaleString('en-GB')}
                        {soul.updated_by ? ` by ${soul.updated_by}` : ''}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => handleSave(soul)}
                    disabled={isSaving || !isDirty}
                    className={`flex items-center gap-2 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                      isSaved
                        ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                        : isDirty
                        ? 'bg-brand-sky/20 border border-brand-sky/30 text-brand-pale hover:bg-brand-sky/30'
                        : 'bg-surface/20 border border-white/5 text-brand-steel/30 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {isSaved ? 'Saved!' : isSaving ? 'Saving…' : 'Save Soul'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
