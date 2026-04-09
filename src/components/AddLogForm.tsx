"use client";

import { useState } from "react";
import { Plus, X, Send, Droplets, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { DEPARTMENTS_CONFIG } from "@/lib/deptConfig";

export default function AddLogForm({ department, tgId }: { department: string; tgId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const config = (DEPARTMENTS_CONFIG as any)[department];
  if (!config) return null;

  const set = (key: string, val: string) =>
    setFields(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const payload: Record<string, any> = {
        date: fields.date,
        notes: fields.notes || null,
        logged_by: tgId || 'team',
      };

      config.formFields.forEach((f: any) => {
        if (fields[f.name] !== undefined && fields[f.name] !== '') {
          const num = Number(fields[f.name]);
          payload[f.name] = isNaN(num) || f.type === 'text' ? fields[f.name] : num;
        }
      });

      const { error: dbErr } = await supabase
        .from(config.table)
        .insert([payload]);

      if (dbErr) throw dbErr;

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setIsOpen(false);
        setFields({ date: new Date().toISOString().split('T')[0], notes: '' });
      }, 1500);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save log.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-brand-navy/40 border border-brand-sky/20 text-white hover:bg-brand-navy transition-all duration-300 shadow-lg shadow-brand-sky/5 group"
      >
        <div className="p-1.5 bg-brand-sky/20 rounded-lg group-hover:scale-110 transition-transform">
          <Plus className="w-4 h-4 text-brand-sky" />
        </div>
        <span className="text-sm font-black uppercase tracking-widest italic">New Log Entry</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-deep/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-lg glass-panel p-10 rounded-[2.5rem] relative overflow-hidden">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-brand-sky/5 blur-[60px] rounded-full -ml-16 -mt-16" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-brand-navy/20 blur-[60px] rounded-full -mr-16 -mb-16" />

        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-brand-steel transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-brand-navy rounded-2xl border border-white/5">
            <config.icon className="w-8 h-8 text-brand-sky" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
              {config.title} Log
            </h3>
            <p className="text-[10px] font-bold text-brand-steel tracking-widest uppercase">Protocol Integrity System</p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 animate-in zoom-in duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <p className="text-emerald-400 font-black uppercase italic tracking-widest">Logged successfully</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-brand-steel uppercase tracking-[0.2em] ml-2">Reporting Date</label>
                <input
                  required
                  type="date"
                  value={fields.date}
                  onChange={e => set('date', e.target.value)}
                  className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-brand-sky/30 transition-all font-bold"
                />
              </div>

              {/* Dynamic fields */}
              {config.formFields.map((f: any) => (
                <div key={f.name} className="space-y-2">
                  <label className="text-[10px] font-black text-brand-steel uppercase tracking-[0.2em] ml-2">{f.label}</label>
                  {f.type === 'select' ? (
                    <select
                      required
                      value={fields[f.name] ?? ''}
                      onChange={e => set(f.name, e.target.value)}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-brand-sky/30 transition-all font-bold appearance-none cursor-pointer"
                    >
                      <option value="" className="bg-brand-deep">Select value...</option>
                      {f.options.map((opt: string) => (
                        <option key={opt} value={opt} className="bg-brand-deep uppercase italic">{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type={f.type}
                      placeholder={f.placeholder}
                      value={fields[f.name] ?? ''}
                      onChange={e => set(f.name, e.target.value)}
                      className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-3 text-sm text-white focus:outline-none focus:border-brand-sky/30 transition-all font-bold placeholder:text-brand-steel/30"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-brand-steel uppercase tracking-[0.2em] ml-2">Observations / Notes</label>
              <textarea
                placeholder="Briefly describe any anomalies or status notes..."
                value={fields.notes}
                onChange={e => set('notes', e.target.value)}
                className="w-full bg-brand-deep/50 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-brand-sky/30 min-h-[100px] resize-none transition-all font-medium placeholder:text-brand-steel/30"
              />
            </div>

            {error && (
              <p className="text-[10px] font-black uppercase text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 tracking-widest">
                System Error: {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full group flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-brand-sky text-brand-deep font-black text-xs uppercase tracking-[0.3em] transition-all hover:bg-brand-pale hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-brand-sky/10"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-brand-deep/30 border-t-brand-deep rounded-full animate-spin" />
                  Processing...
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Authorize & Commit
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-8 flex items-center justify-center gap-2">
          <Droplets className="w-3 h-3 text-brand-sky/40" />
          <span className="text-[8px] font-black text-brand-steel/40 uppercase tracking-[0.4em]">Blockchain-style immutable entry log</span>
        </div>
      </div>
    </div>
  );
}

