"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';
import { Star, Send, ChevronDown, ChevronUp } from 'lucide-react';

interface Recognition {
  id: string;
  message: string;
  department: string;
  given_by: string;
  created_at: string;
}

const DEPARTMENTS = ['Operations', 'Quality', 'Sales', 'Inventory', 'Finance', 'Compliance'];

export default function RecognitionsWidget({ tgId }: { tgId?: string }) {
  const [recognitions, setRecognitions] = useState<Recognition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ message: '', department: '', given_by: tgId ?? '' });
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Initial fetch ────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from('recognitions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setRecognitions(data ?? []);
        setLoading(false);
      });
  }, []);

  // ── Realtime subscription ────────────────────────────────────────────
  useEffect(() => {
    channelRef.current = supabase
      .channel('rt:recognitions:widget')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'recognitions' },
        ({ new: record }) => {
          setRecognitions(prev => {
            if (prev.find(r => r.id === record.id)) return prev;
            return [record as Recognition, ...prev].slice(0, 10);
          });
          showToast({
            type: 'success',
            message: `🌟 Shout-out in ${record.department}: "${record.message}"`,
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim() || !form.department) return;
    setSubmitting(true);

    const { error } = await supabase.from('recognitions').insert([{
      message: form.message.trim(),
      department: form.department,
      given_by: form.given_by || tgId || 'anonymous',
    }]);

    if (error) {
      showToast({ type: 'error', message: 'Failed to send recognition: ' + error.message });
    } else {
      setForm(f => ({ ...f, message: '', department: '' }));
      setShowForm(false);
    }
    setSubmitting(false);
  };

  return (
    <div className="rounded-[2rem] bg-slate-900/10 backdrop-blur-md border border-white/20 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
            <Star className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-100">Team Recognitions</h2>
            <p className="text-xs text-gray-400">Shout-outs from the crew</p>
          </div>
        </div>
        <button
          id="toggle-recognition-form"
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-yellow-500/20 border border-yellow-400/30 text-yellow-200 text-sm font-semibold hover:bg-yellow-500/30 transition-all duration-200"
        >
          <Star className="w-4 h-4" />
          Give Shout-out
          {showForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Add form (collapsible) */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-5 border-b border-white/10 bg-yellow-500/5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Department</label>
              <select
                required
                value={form.department}
                onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 transition-colors"
              >
                <option value="">Select department...</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Your name / alias</label>
              <input
                type="text"
                placeholder="Your name..."
                value={form.given_by}
                onChange={e => setForm(f => ({ ...f, given_by: e.target.value }))}
                className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Recognition message</label>
            <textarea
              required
              placeholder="e.g. Big up to Aisha for hitting 600 jars today! 🙌"
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              className="w-full bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-400 min-h-[72px] resize-none transition-colors"
            />
          </div>
          <button
            type="submit"
            id="submit-recognition-btn"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-white font-bold text-sm transition-all disabled:opacity-50 shadow-lg shadow-yellow-500/20"
          >
            {submitting
              ? <span className="animate-pulse">Sending...</span>
              : <><Send className="w-4 h-4" /> Send Shout-out</>
            }
          </button>
        </form>
      )}

      {/* Feed */}
      <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm animate-pulse">Loading recognitions...</div>
        ) : recognitions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No shout-outs yet — be the first! 🌟
          </div>
        ) : recognitions.map(r => (
          <div key={r.id} className="p-4 hover:bg-yellow-500/5 transition-colors">
            <div className="flex items-start gap-3">
              <span className="text-xl mt-0.5">🌟</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-100 leading-snug">"{r.message}"</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-xs bg-yellow-500/10 border border-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">
                    {r.department}
                  </span>
                  {r.given_by && (
                    <span className="text-xs text-gray-500">
                      from {r.given_by}
                    </span>
                  )}
                  {r.created_at && (
                    <span className="text-xs text-gray-600">
                      {new Date(r.created_at).toLocaleDateString('en-UG', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
