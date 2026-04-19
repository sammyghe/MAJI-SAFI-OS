'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Log Batch', emoji: '🏭', href: '/production', hint: 'Log filled jars by batch' },
  { label: 'Log QC Test', emoji: '🔬', href: '/quality', hint: 'Record TDS / turbidity test' },
  { label: 'Log Sale', emoji: '🚚', href: '/dispatch', hint: 'Record a dispatch + cash' },
  { label: 'Add Prospect', emoji: '📋', href: '/marketing', hint: 'New distributor lead' },
  { label: 'Log Expense', emoji: '💰', href: '/finance', hint: 'Record a budget expense' },
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
      {/* Floating + button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0077B6] text-white shadow-lg hover:bg-[#0077B6]/90 hover:shadow-[0_0_20px_rgba(0,119,182,0.4)] transition-all flex items-center justify-center"
        aria-label="Add anything"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center z-50 p-4">
          <div className="bg-[#10141a] border border-[#262a31]/50 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#262a31]/30">
              <div>
                <p className="text-white font-bold text-sm">Add Anything</p>
                <p className="text-slate-500 text-[10px] font-label uppercase tracking-widest">Quick actions · AI routing coming soon</p>
              </div>
              <button
                onClick={() => { setOpen(false); setQuery(''); setAiMsg(''); }}
                className="text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Text input */}
            <div className="px-6 py-4 border-b border-[#262a31]/20">
              <form onSubmit={handleQuery} className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setAiMsg(''); }}
                  placeholder="e.g., Log 60 jars of 20L Refill..."
                  className="flex-1 bg-[#1a1f28] border border-[#262a31]/50 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-[#0077B6]/50"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#0077B6]/20 border border-[#0077B6]/30 text-[#7EC8E3] text-xs font-bold rounded-xl hover:bg-[#0077B6]/30 transition-colors"
                >
                  Route
                </button>
              </form>
              {aiMsg && (
                <p className="mt-2 text-[11px] text-amber-400 font-label">{aiMsg}</p>
              )}
            </div>

            {/* Quick actions */}
            <div className="px-6 py-5 grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleAction(action.href)}
                  className="flex items-center gap-3 px-4 py-3 bg-[#1a1f28] border border-[#262a31]/40 rounded-xl hover:border-[#0077B6]/40 hover:bg-[#0077B6]/5 transition-all text-left group"
                >
                  <span className="text-xl flex-shrink-0">{action.emoji}</span>
                  <div>
                    <p className="text-white text-xs font-bold group-hover:text-[#7EC8E3] transition-colors">{action.label}</p>
                    <p className="text-slate-600 text-[9px] font-label">{action.hint}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
