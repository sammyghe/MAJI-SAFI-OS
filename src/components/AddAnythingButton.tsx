'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, ArrowRight } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Log Batch',       emoji: '🏭', href: '/production',   hint: 'Log filled jars by batch' },
  { label: 'Log QC Test',     emoji: '🔬', href: '/quality',      hint: 'Record TDS / turbidity test' },
  { label: 'Log Sale',        emoji: '🚚', href: '/dispatch',     hint: 'Record a dispatch + cash' },
  { label: 'Add Prospect',    emoji: '📋', href: '/marketing',    hint: 'New distributor lead' },
  { label: 'Log Expense',     emoji: '💰', href: '/finance',      hint: 'Record a budget expense' },
  { label: 'Add Distributor', emoji: '🤝', href: '/dispatch/crm', hint: 'Add to distributor CRM' },
];

export default function AddAnythingButton() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [aiMsg, setAiMsg] = useState('');
  const router = useRouter();

  const handleAction = (href: string) => {
    setOpen(false);
    setQuery('');
    setAiMsg('');
    router.push(href);
  };

  const handleQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setAiMsg('AI routing coming soon — use the quick actions below.');
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0077B6] text-white shadow-lg hover:bg-[#005F92] hover:shadow-[0_0_24px_rgba(0,119,182,0.45)] transition-all flex items-center justify-center"
        aria-label="Add anything"
      >
        <Plus className="w-6 h-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: 'rgba(15,28,46,0.45)', backdropFilter: 'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setQuery(''); setAiMsg(''); } }}
        >
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            style={{ animation: 'scaleIn 0.18s ease-out' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div>
                <p className="text-slate-900 font-black text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>Quick Actions</p>
                <p className="text-slate-400 text-xs mt-0.5">Navigate to any form</p>
              </div>
              <button
                onClick={() => { setOpen(false); setQuery(''); setAiMsg(''); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search input */}
            <div className="px-6 py-4 border-b border-slate-100">
              <form onSubmit={handleQuery} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setAiMsg(''); }}
                  placeholder="e.g., Log 60 jars of 20L Refill..."
                  className="flex-1 bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 py-2.5 px-4 rounded-xl focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/15 outline-none transition-all text-sm"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#0077B6] text-white text-xs font-bold rounded-xl hover:bg-[#005F92] transition-colors"
                >
                  Route
                </button>
              </form>
              {aiMsg && <p className="mt-2 text-[11px] text-amber-600 font-medium">{aiMsg}</p>}
            </div>

            {/* Quick actions grid */}
            <div className="px-6 py-5 grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleAction(action.href)}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-[#0077B6]/30 hover:bg-blue-50 transition-all text-left group"
                >
                  <span className="text-xl flex-shrink-0">{action.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-900 text-xs font-bold group-hover:text-[#0077B6] transition-colors">{action.label}</p>
                    <p className="text-slate-400 text-[9px] mt-0.5 truncate">{action.hint}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-[#0077B6] transition-colors flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
