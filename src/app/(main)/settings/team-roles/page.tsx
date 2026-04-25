'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { Users2, Save, RefreshCw } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  department_slug: string | null;
  access_level: string | null;
  role_id: string | null;
  role_slug?: string;
}

interface Role {
  id: string;
  slug: string;
  name: string;
  ui_density: string;
}

export default function TeamRolesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
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
    const [membersRes, rolesRes] = await Promise.all([
      supabase.from('team_members').select('id, name, department_slug, access_level, role_id').eq('contract_status', 'active').order('name'),
      supabase.from('roles').select('id, slug, name, ui_density').order('slug'),
    ]);
    const rolesData: Role[] = rolesRes.data ?? [];
    const roleMap = new Map(rolesData.map((r) => [r.id, r.slug]));

    setMembers(
      (membersRes.data ?? []).map((m) => ({
        ...m,
        role_slug: m.role_id ? roleMap.get(m.role_id) : undefined,
      }))
    );
    setRoles(rolesData);
    setLoading(false);
  };

  const handleSave = async (memberId: string) => {
    const roleId = edits[memberId];
    if (!roleId) return;
    setSaving(memberId);
    const { error } = await supabase
      .from('team_members')
      .update({ role_id: roleId || null })
      .eq('id', memberId);
    if (!error) {
      setSaved(memberId);
      setTimeout(() => setSaved(null), 2000);
      const role = roles.find((r) => r.id === roleId);
      setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role_id: roleId, role_slug: role?.slug } : m));
      setEdits((prev) => { const n = { ...prev }; delete n[memberId]; return n; });
    }
    setSaving(null);
  };

  if (user?.role !== 'founder') return null;

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic flex items-center gap-3">
          <Users2 className="w-7 h-7 text-brand-sky" />
          Team <span className="text-brand-sky">Roles</span>
        </h1>
        <p className="text-brand-steel font-bold text-xs uppercase tracking-widest mt-1">
          Founder Only · Assign roles to team members
        </p>
      </div>

      <div className="p-4 bg-brand-sky/10 border border-brand-sky/20 rounded-xl">
        <p className="text-brand-sky text-xs font-bold">
          Run <code className="bg-black/20 px-1 py-0.5 rounded">20260424_roles.sql</code> in Supabase SQL Editor first to populate roles.
          Roles are permanent. People rotate into them.
        </p>
      </div>

      {loading ? (
        <p className="text-brand-steel text-xs font-black uppercase tracking-widest animate-pulse">Loading team…</p>
      ) : roles.length === 0 ? (
        <div className="glass-panel rounded-[2rem] p-8 text-center">
          <p className="text-brand-steel font-bold text-sm">No roles found — run the SQL migration first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const currentRoleId = edits[m.id] !== undefined ? edits[m.id] : (m.role_id ?? '');
            const isDirty = m.id in edits;
            const isSaving = saving === m.id;
            const isSaved = saved === m.id;

            return (
              <div key={m.id} className="glass-panel rounded-2xl p-5 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-sm">{m.name}</p>
                  <p className="text-[10px] text-brand-steel">
                    {m.department_slug ?? 'No department'} · {m.access_level ?? 'No access level'}
                    {m.role_slug && <span className="text-brand-sky ml-2">→ {m.role_slug}</span>}
                  </p>
                </div>

                <select
                  value={currentRoleId}
                  onChange={(e) => setEdits((prev) => ({ ...prev, [m.id]: e.target.value }))}
                  className="bg-zinc-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-brand-sky/40 min-w-40"
                >
                  <option value="">— No role —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.ui_density === 'large' ? '(floor)' : ''}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => handleSave(m.id)}
                  disabled={isSaving || !isDirty}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                    isSaved
                      ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                      : isDirty
                      ? 'bg-brand-sky/20 border border-brand-sky/30 text-brand-pale hover:bg-brand-sky/30'
                      : 'bg-surface/20 border border-white/5 text-brand-steel/30 cursor-not-allowed'
                  }`}
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  {isSaved ? 'Saved!' : isSaving ? 'Saving…' : 'Save'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
