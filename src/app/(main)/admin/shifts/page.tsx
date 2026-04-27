'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Clock } from 'lucide-react';
import { showToast } from '@/components/ToastContainer';

const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
const DEPTS = ['production','quality','inventory','dispatch','sales','marketing','finance','compliance','technology','founder-office'];

interface ShiftDef {
  id: string;
  department_slug: string;
  name: string;
  start_time: string;
  end_time: string;
  days_of_week: string[];
  active: boolean;
}

interface ShiftInstance {
  id: string;
  shift_date: string;
  status: string;
  actual_start: string | null;
  actual_end: string | null;
  team_members: { name: string; role_slug: string } | null;
}

export default function AdminShiftsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [defs, setDefs] = useState<ShiftDef[]>([]);
  const [instances, setInstances] = useState<ShiftInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    department_slug: 'production',
    name: '',
    start_time: '06:00',
    end_time: '19:00',
    days_of_week: ['mon','tue','wed','thu','fri','sat'],
  });

  useEffect(() => {
    if (user && user.role !== 'founder' && user.role_slug !== 'operations_manager') {
      router.push('/');
    } else {
      load();
    }
  }, [user]);

  const load = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [defsRes, instRes] = await Promise.all([
      supabase.from('shift_definitions').select('*').order('department_slug').order('start_time'),
      supabase
        .from('shifts')
        .select('id, shift_date, status, actual_start, actual_end, team_members(name, role_slug)')
        .eq('shift_date', today)
        .eq('location_id', 'buziga')
        .order('actual_start', { ascending: false }),
    ]);
    setDefs(defsRes.data ?? []);
    setInstances((instRes.data ?? []).map((s: any) => ({
      ...s,
      team_members: Array.isArray(s.team_members) ? s.team_members[0] : s.team_members,
    })));
    setLoading(false);
  };

  const create = async () => {
    if (!form.name.trim()) { showToast({ type: 'error', message: 'Shift name required' }); return; }
    setCreating(true);
    const { error } = await supabase.from('shift_definitions').insert([{ ...form, location_id: 'buziga' }]);
    if (error) showToast({ type: 'error', message: error.message });
    else { showToast({ type: 'success', message: 'Shift definition created' }); setForm({ ...form, name: '' }); await load(); }
    setCreating(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('shift_definitions').update({ active: !active }).eq('id', id);
    await load();
  };

  const deleteDef = async (id: string) => {
    await supabase.from('shift_definitions').delete().eq('id', id);
    await load();
  };

  const STATUS_COLOR: Record<string, string> = {
    active: '#22c55e', ended: '#64748b', missed: '#ef4444', scheduled: '#0077B6', cancelled: '#475569',
  };

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Shift Definitions</h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">Configure shift templates per department</p>
      </div>

      {/* Create form */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">New Shift Definition</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Department</label>
            <select
              value={form.department_slug}
              onChange={(e) => setForm({ ...form, department_slug: e.target.value })}
              className="w-full bg-slate-100 border border-slate-200 text-white text-sm rounded-xl px-3 py-2"
            >
              {DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Shift Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Morning Shift"
              className="w-full bg-slate-100 border border-slate-200 text-white text-sm rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Start Time</label>
            <input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full bg-slate-100 border border-slate-200 text-white text-sm rounded-xl px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">End Time</label>
            <input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full bg-slate-100 border border-slate-200 text-white text-sm rounded-xl px-3 py-2"
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-xs text-slate-500 mb-2">Days</label>
          <div className="flex gap-2 flex-wrap">
            {DAYS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setForm({
                  ...form,
                  days_of_week: form.days_of_week.includes(d)
                    ? form.days_of_week.filter((x) => x !== d)
                    : [...form.days_of_week, d],
                })}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${
                  form.days_of_week.includes(d)
                    ? 'bg-[#0077B6] text-white'
                    : 'bg-slate-100 text-slate-500 hover:text-slate-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0077B6] text-white font-bold text-sm rounded-xl hover:brightness-110 disabled:opacity-60"
        >
          <Plus size={15} /> Create Shift
        </button>
      </div>

      {/* Existing definitions */}
      <div className="mb-8">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">All Definitions</p>
        {loading ? (
          <div className="text-slate-500 text-sm">Loading…</div>
        ) : defs.length === 0 ? (
          <div className="text-slate-600 text-sm">No shift definitions yet. Create one above.</div>
        ) : (
          <div className="space-y-3">
            {defs.map((def) => (
              <div key={def.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-white">{def.name}</p>
                    <p className="text-xs text-slate-500">{def.department_slug} · {def.start_time}–{def.end_time} · {def.days_of_week.join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(def.id, def.active)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold ${def.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-100 text-slate-500'}`}
                  >
                    {def.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => deleteDef(def.id)} className="p-1.5 text-slate-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Today's shifts */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
          Today's Shifts — {new Date().toLocaleDateString('en-GB')}
        </p>
        {instances.length === 0 ? (
          <p className="text-slate-600 text-sm">No shift records for today yet</p>
        ) : (
          <div className="space-y-2">
            {instances.map((s) => (
              <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">{s.team_members?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-slate-500">{s.team_members?.role_slug ?? ''}</p>
                </div>
                <div className="text-right">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-bold uppercase"
                    style={{ background: `${STATUS_COLOR[s.status] ?? '#475569'}20`, color: STATUS_COLOR[s.status] ?? '#475569' }}
                  >
                    {s.status}
                  </span>
                  {s.actual_start && (
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {new Date(s.actual_start).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {s.actual_end ? ` → ${new Date(s.actual_end).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}` : ' → now'}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
