'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { BookOpen, Plus, ChevronRight, ChevronDown, X, Zap } from 'lucide-react';

interface Account {
  id: string;
  code: string;
  name: string;
  account_type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_account_id: string | null;
  expense_phase: string | null;
  product_id: string | null;
  active: boolean;
  description: string | null;
  display_order: number;
  children?: Account[];
}

const TYPE_COLORS: Record<string, string> = {
  asset:     'text-[#7EC8E3] border-[#7EC8E3]/20',
  liability: 'text-red-400 border-red-500/20',
  equity:    'text-purple-400 border-purple-500/20',
  revenue:   'text-emerald-400 border-emerald-500/20',
  expense:   'text-amber-400 border-amber-500/20',
};

const SUGGESTED_ACCOUNTS = [
  { code: '1100', name: 'Bank — Stanbic UGX',      parent: '1000', type: 'asset',   phase: null },
  { code: '1101', name: 'Bank — Stanbic USD',      parent: '1000', type: 'asset',   phase: null },
  { code: '1102', name: 'Cash on Hand',             parent: '1000', type: 'asset',   phase: null },
  { code: '1103', name: 'Mobile Money (MTN)',       parent: '1000', type: 'asset',   phase: null },
  { code: '1200', name: 'Accounts Receivable',      parent: '1000', type: 'asset',   phase: null },
  { code: '1300', name: 'Inventory — Jars',         parent: '1000', type: 'asset',   phase: null },
  { code: '1301', name: 'Inventory — Chemicals',    parent: '1000', type: 'asset',   phase: null },
  { code: '2100', name: 'Accounts Payable',         parent: '2000', type: 'liability', phase: null },
  { code: '2200', name: 'VAT Payable',              parent: '2000', type: 'liability', phase: null },
  { code: '2300', name: 'PAYE Payable',             parent: '2000', type: 'liability', phase: null },
  { code: '3100', name: 'Founder Capital — Samuel', parent: '3000', type: 'equity',  phase: null },
  { code: '3200', name: 'Investor — Mike',          parent: '3000', type: 'equity',  phase: null },
  { code: '3300', name: 'Retained Earnings',        parent: '3000', type: 'equity',  phase: null },
  { code: '4100', name: 'Revenue — 20L Refill',     parent: '4000', type: 'revenue', phase: null },
  { code: '4101', name: 'Revenue — 20L Single-Use', parent: '4000', type: 'revenue', phase: null },
  { code: '4102', name: 'Revenue — 5L Single-Use',  parent: '4000', type: 'revenue', phase: null },
  { code: '5100', name: 'COGS — Chemicals',         parent: '5000', type: 'expense', phase: 'ongoing' },
  { code: '5101', name: 'COGS — Jars & Caps',       parent: '5000', type: 'expense', phase: 'ongoing' },
  { code: '5200', name: 'Salaries — Production',    parent: '5000', type: 'expense', phase: 'ongoing' },
  { code: '5300', name: 'Rent & Utilities',         parent: '5000', type: 'expense', phase: 'ongoing' },
  { code: '5400', name: 'UNBS Certification Fees',  parent: '5000', type: 'expense', phase: 'pre_unbs' },
  { code: '5500', name: 'Transport & Delivery',     parent: '5000', type: 'expense', phase: 'ongoing' },
  { code: '5600', name: 'Marketing & Sales',        parent: '5000', type: 'expense', phase: 'ongoing' },
];

function buildTree(accounts: Account[]): Account[] {
  const map = new Map(accounts.map(a => [a.id, { ...a, children: [] as Account[] }]));
  const roots: Account[] = [];
  for (const a of map.values()) {
    if (a.parent_account_id && map.has(a.parent_account_id)) {
      map.get(a.parent_account_id)!.children!.push(a);
    } else {
      roots.push(a);
    }
  }
  roots.sort((a, b) => a.display_order - b.display_order);
  return roots;
}

function AccountRow({ account, depth, onAdd, onToggle, onRefresh }: {
  account: Account; depth: number;
  onAdd: (parentId: string, type: string) => void;
  onToggle: (id: string) => void;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = (account.children?.length ?? 0) > 0;
  const col = TYPE_COLORS[account.account_type] ?? 'text-slate-400';

  return (
    <>
      <tr className="border-b border-slate-200/40 hover:bg-white/40 group">
        <td className="py-2.5 pr-2" style={{ paddingLeft: `${16 + depth * 24}px` }}>
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button onClick={() => setExpanded(!expanded)} className="text-slate-600 hover:text-slate-300 flex-shrink-0">
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : <span className="w-3.5 h-3.5 flex-shrink-0" />}
            <span className="text-[10px] font-black text-slate-600 font-mono w-12 flex-shrink-0">{account.code}</span>
            <span className={`text-sm font-medium ${account.active ? 'text-white' : 'text-slate-600 line-through'}`}>{account.name}</span>
            {account.expense_phase && (
              <span className="text-[9px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{account.expense_phase}</span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3">
          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${col}`}>{account.account_type}</span>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onAdd(account.id, account.account_type)} className="text-[10px] text-[#7EC8E3] hover:text-white font-black flex items-center gap-1">
              <Plus className="w-3 h-3" /> Sub-account
            </button>
            <button onClick={() => supabase.from('chart_of_accounts').update({ active: !account.active }).eq('id', account.id).then(onRefresh)} className="text-[10px] text-slate-500 hover:text-slate-300">
              {account.active ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
      {expanded && account.children?.map(child => (
        <AccountRow key={child.id} account={child} depth={depth + 1} onAdd={onAdd} onToggle={onToggle} onRefresh={onRefresh} />
      ))}
    </>
  );
}

function AddAccountModal({ parentId, parentType, accounts, onClose, onSave }: {
  parentId: string | null; parentType: string; accounts: Account[]; onClose: () => void; onSave: () => void;
}) {
  const [form, setForm] = useState({
    code: '', name: '', description: '', account_type: parentType,
    parent_account_id: parentId ?? '', expense_phase: '',
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.code.trim() || !form.name.trim()) return;
    setSaving(true);
    await supabase.from('chart_of_accounts').insert({
      code: form.code.trim(),
      name: form.name.trim(),
      account_type: form.account_type,
      parent_account_id: form.parent_account_id || null,
      expense_phase: form.expense_phase || null,
      description: form.description || null,
    });
    setSaving(false);
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-white uppercase tracking-widest">Add Account</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-slate-500" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input value={form.code} onChange={e => setForm({...form, code: e.target.value})} placeholder="Code (e.g. 5100) *" className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50" />
          <select value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
            {['asset','liability','equity','revenue','expense'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Account name *" className="w-full bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#0077B6]/50" />
        <div className="grid grid-cols-2 gap-3">
          <select value={form.parent_account_id} onChange={e => setForm({...form, parent_account_id: e.target.value})} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
            <option value="">No parent (root)</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
          <select value={form.expense_phase} onChange={e => setForm({...form, expense_phase: e.target.value})} className="bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
            <option value="">No phase</option>
            <option value="pre_unbs">Pre-UNBS</option>
            <option value="post_unbs">Post-UNBS</option>
            <option value="ongoing">Ongoing</option>
          </select>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-black text-slate-400 uppercase tracking-widest hover:bg-zinc-700">Cancel</button>
          <button onClick={save} disabled={saving || !form.code || !form.name} className="flex-1 py-2.5 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30 disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : 'Add Account'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState<{ parentId: string | null; type: string } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [suggestPreview, setSuggestPreview] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('chart_of_accounts').select('*').order('display_order').order('code');
    setAccounts(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const generateSuggested = async () => {
    setGenerating(true);
    for (const acct of SUGGESTED_ACCOUNTS) {
      const parent = accounts.find(a => a.code === acct.parent);
      if (!parent) continue;
      const exists = accounts.find(a => a.code === acct.code);
      if (exists) continue;
      await supabase.from('chart_of_accounts').insert({
        code: acct.code, name: acct.name,
        account_type: acct.type as Account['account_type'],
        parent_account_id: parent.id,
        expense_phase: acct.phase,
      });
    }
    setGenerating(false);
    setSuggestPreview(false);
    load();
  };

  const tree = buildTree(accounts);

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#0077B6]" /> Chart of Accounts
          </h1>
          <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">User-built — 5 roots seeded</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setSuggestPreview(!suggestPreview)} className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs font-black text-purple-400 uppercase tracking-widest hover:bg-purple-500/20">
            <Zap className="w-3.5 h-3.5" /> Generate Template
          </button>
          <button onClick={() => setShowAdd({ parentId: null, type: 'expense' })} className="flex items-center gap-2 px-4 py-2 bg-[#0077B6]/20 border border-[#0077B6]/30 rounded-xl text-xs font-black text-[#7EC8E3] uppercase tracking-widest hover:bg-[#0077B6]/30">
            <Plus className="w-3.5 h-3.5" /> Add Account
          </button>
        </div>
      </div>

      {suggestPreview && (
        <div className="mb-6 bg-purple-500/5 border border-purple-500/20 rounded-2xl p-5">
          <p className="text-xs font-black text-purple-400 uppercase tracking-widest mb-3">Suggested Water Company Chart ({SUGGESTED_ACCOUNTS.length} accounts)</p>
          <div className="grid grid-cols-2 gap-2 mb-4 max-h-48 overflow-y-auto">
            {SUGGESTED_ACCOUNTS.map(a => (
              <div key={a.code} className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-mono w-10">{a.code}</span>
                <span className="text-xs text-slate-300">{a.name}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 mb-3">Existing accounts with same code will be skipped. You can delete any you don't need.</p>
          <div className="flex gap-3">
            <button onClick={generateSuggested} disabled={generating} className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-xl text-xs font-black text-purple-400 uppercase tracking-widest hover:bg-purple-500/30 disabled:opacity-40">
              {generating ? 'Generating…' : 'Accept & Generate'}
            </button>
            <button onClick={() => setSuggestPreview(false)} className="text-xs text-slate-500 hover:text-slate-300">Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">Loading…</p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-white/50">
                <th className="text-left py-3 px-4 text-slate-500 font-black uppercase tracking-widest">Account</th>
                <th className="text-left py-3 px-3 text-slate-500 font-black uppercase tracking-widest">Type</th>
                <th className="py-3 px-3" />
              </tr>
            </thead>
            <tbody>
              {tree.map(acct => (
                <AccountRow
                  key={acct.id}
                  account={acct}
                  depth={0}
                  onAdd={(parentId, type) => setShowAdd({ parentId, type })}
                  onToggle={() => {}}
                  onRefresh={load}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddAccountModal
          parentId={showAdd.parentId}
          parentType={showAdd.type}
          accounts={accounts}
          onClose={() => setShowAdd(null)}
          onSave={load}
        />
      )}
    </div>
  );
}
