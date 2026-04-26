'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Zap, ChevronUp, ChevronDown } from 'lucide-react';
import { showToast } from '@/components/ToastContainer';

const DEPTS = ['production','quality','inventory','dispatch','sales','marketing','finance','compliance','technology','founder-office'];
const ROLES = ['lead_operator','production_assistant','delivery_field','marketing','compliance','operations_manager'];
const ICONS = ['PlayCircle','ClipboardList','Beaker','Truck','DollarSign','Package','CheckCircle2','AlertCircle','LogOut','Search'];

const CONDITION_TEMPLATE = JSON.stringify({
  time_between: ['06:00', '09:00'],
  shift_status: 'active',
}, null, 2);

interface Rule {
  id: string;
  department_slug: string;
  role_slug: string;
  rule_name: string;
  conditions: any;
  action_label: string;
  action_url: string;
  action_icon: string | null;
  priority: number;
  active: boolean;
}

export default function AdminActionRulesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    department_slug: 'production',
    role_slug: 'lead_operator',
    rule_name: '',
    conditions: CONDITION_TEMPLATE,
    action_label: '',
    action_url: '/production',
    action_icon: 'PlayCircle',
    priority: 100,
  });
  const [conditionError, setConditionError] = useState('');

  useEffect(() => {
    if (user && user.role !== 'founder' && user.role_slug !== 'operations_manager') {
      router.push('/');
    } else {
      load();
    }
  }, [user]);

  const load = async () => {
    const { data } = await supabase
      .from('worker_action_rules')
      .select('*')
      .eq('location_id', 'buziga')
      .order('priority')
      .order('department_slug');
    setRules(data ?? []);
    setLoading(false);
  };

  const create = async () => {
    if (!form.rule_name.trim() || !form.action_label.trim()) {
      showToast({ type: 'error', message: 'Rule name and action label required' });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(form.conditions);
      setConditionError('');
    } catch {
      setConditionError('Invalid JSON in conditions');
      return;
    }
    setCreating(true);
    const { error } = await supabase.from('worker_action_rules').insert([{
      department_slug: form.department_slug,
      role_slug: form.role_slug,
      rule_name: form.rule_name,
      conditions: parsed,
      action_label: form.action_label,
      action_url: form.action_url,
      action_icon: form.action_icon || null,
      priority: form.priority,
      created_by: user?.name ?? 'admin',
      location_id: 'buziga',
    }]);
    if (error) showToast({ type: 'error', message: error.message });
    else { showToast({ type: 'success', message: 'Rule created' }); setForm({ ...form, rule_name: '', action_label: '' }); await load(); }
    setCreating(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('worker_action_rules').update({ active: !active }).eq('id', id);
    await load();
  };

  const deleteRule = async (id: string) => {
    await supabase.from('worker_action_rules').delete().eq('id', id);
    await load();
  };

  const adjustPriority = async (id: string, current: number, dir: -1 | 1) => {
    await supabase.from('worker_action_rules').update({ priority: current + dir * 10 }).eq('id', id);
    await load();
  };

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Action Rules</h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">Configure the primary action button shown to each role at each time of day</p>
      </div>

      {/* How it works */}
      <div className="bg-zinc-900 border border-[#0077B6]/20 rounded-2xl p-5 mb-8">
        <p className="text-[10px] font-bold text-[#0077B6] uppercase tracking-[0.2em] mb-2">How Rules Work</p>
        <p className="text-xs text-slate-400 leading-relaxed">
          Rules are evaluated in priority order (lower = higher priority). The first rule whose conditions match the current context wins.
          Conditions supported: <code className="text-[#7EC8E3]">time_between</code> (EAT, "HH:MM" array),
          <code className="text-[#7EC8E3]"> shift_status</code> ("active"|"not_started"|"ended"),
          <code className="text-[#7EC8E3]"> status_check</code> ("no_batch_today"|"qc_due").
          If no rule matches, the system falls back to built-in phase logic.
        </p>
      </div>

      {/* Create form */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-8">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">New Rule</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Department</label>
            <select value={form.department_slug} onChange={(e) => setForm({ ...form, department_slug: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2">
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Role</label>
            <select value={form.role_slug} onChange={(e) => setForm({ ...form, role_slug: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Rule Name</label>
            <input value={form.rule_name} onChange={(e) => setForm({ ...form, rule_name: e.target.value })}
              placeholder="e.g. pre-shift-checks"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Priority (lower = higher)</label>
            <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) || 100 })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Button Label</label>
            <input value={form.action_label} onChange={(e) => setForm({ ...form, action_label: e.target.value })}
              placeholder="e.g. Start Pre-Checks"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Button URL</label>
            <input value={form.action_url} onChange={(e) => setForm({ ...form, action_url: e.target.value })}
              placeholder="/production"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Icon (lucide name)</label>
            <select value={form.action_icon} onChange={(e) => setForm({ ...form, action_icon: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-xl px-3 py-2">
              {ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs text-slate-500 mb-1">Conditions (JSON)</label>
          <textarea
            rows={5}
            value={form.conditions}
            onChange={(e) => { setForm({ ...form, conditions: e.target.value }); setConditionError(''); }}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-xs font-mono rounded-xl px-3 py-2 focus:outline-none focus:border-[#0077B6] resize-none"
          />
          {conditionError && <p className="text-red-400 text-xs mt-1">{conditionError}</p>}
        </div>

        <button onClick={create} disabled={creating}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0077B6] text-white font-bold text-sm rounded-xl hover:brightness-110 disabled:opacity-60">
          <Plus size={15} /> Create Rule
        </button>
      </div>

      {/* Rules list */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Rules ({rules.length})</p>
        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : rules.length === 0 ? (
          <p className="text-slate-600 text-sm">No rules yet. Workers will use built-in phase logic.</p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className={`bg-zinc-900 border rounded-xl p-4 ${rule.active ? 'border-zinc-800' : 'border-zinc-800 opacity-50'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Zap className="w-4 h-4 text-[#0077B6] flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white">{rule.rule_name}</p>
                      <p className="text-xs text-slate-500">{rule.department_slug} · {rule.role_slug} · priority {rule.priority}</p>
                      <p className="text-xs text-[#7EC8E3] mt-1">→ {rule.action_label} ({rule.action_url})</p>
                      <pre className="text-[10px] text-slate-600 mt-1 font-mono overflow-hidden">{JSON.stringify(rule.conditions)}</pre>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => adjustPriority(rule.id, rule.priority, -1)} className="p-1 text-slate-600 hover:text-slate-300">
                      <ChevronUp size={14} />
                    </button>
                    <button onClick={() => adjustPriority(rule.id, rule.priority, 1)} className="p-1 text-slate-600 hover:text-slate-300">
                      <ChevronDown size={14} />
                    </button>
                    <button onClick={() => toggleActive(rule.id, rule.active)}
                      className={`px-2 py-1 rounded text-xs font-bold ${rule.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-slate-500'}`}>
                      {rule.active ? 'On' : 'Off'}
                    </button>
                    <button onClick={() => deleteRule(rule.id)} className="p-1.5 text-slate-600 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
