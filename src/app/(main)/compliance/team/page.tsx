'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';

const DEPARTMENTS = [
  'founder-office', 'production', 'quality', 'inventory',
  'dispatch', 'marketing', 'finance', 'compliance', 'technology',
];

const ACCESS_LEVELS = ['viewer', 'operator', 'supervisor', 'manager', 'founder'];
const CONTRACT_STATUSES = ['active', 'probation', 'inactive'];

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department_slug: string;
  departments: string[];
  access_level: string;
  pin: string;
  phone?: string;
  contract_status: string;
  location_id: string;
}

const emptyForm = {
  name: '',
  role: '',
  department_slug: 'production',
  departments: [] as string[],
  access_level: 'operator',
  pin: '',
  phone: '',
  contract_status: 'active',
};

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ ...emptyForm });
  const [addSaving, setAddSaving] = useState(false);
  const [editMember, setEditMember] = useState<TeamMember | null>(null);
  const [editForm, setEditForm] = useState({ ...emptyForm });
  const [editSaving, setEditSaving] = useState(false);

  const isFounder = user?.role === 'founder';
  const isFounderOrCompliance =
    isFounder ||
    user?.department_slug === 'compliance' ||
    (Array.isArray(user?.departments) && user.departments.includes('compliance'));

  const [showPins, setShowPins] = useState(false);

  useEffect(() => { loadMembers(); }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('location_id', 'buziga')
        .order('name');
      if (error) throw error;
      setMembers(data ?? []);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') console.error('Team load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim()) { showToast({ type: 'error', message: 'Name is required' }); return; }
    if (!addForm.role.trim()) { showToast({ type: 'error', message: 'Role is required' }); return; }
    if (!addForm.pin || addForm.pin.length < 4) { showToast({ type: 'error', message: 'PIN must be at least 4 digits' }); return; }
    setAddSaving(true);
    try {
      const depts = addForm.departments.length > 0 ? addForm.departments : [addForm.department_slug];
      const { error } = await supabase.from('team_members').insert([{
        name: addForm.name.trim(),
        role: addForm.role.trim(),
        department_slug: addForm.department_slug,
        departments: depts,
        access_level: addForm.access_level,
        pin: addForm.pin,
        phone: addForm.phone.trim() || null,
        contract_status: addForm.contract_status,
        location_id: 'buziga',
      }]);
      if (error) throw error;
      showToast({ type: 'success', message: `${addForm.name} added to team.` });
      setAddForm({ ...emptyForm });
      setShowAdd(false);
      await loadMembers();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message ?? 'Failed to add member' });
    } finally {
      setAddSaving(false);
    }
  };

  const openEdit = (m: TeamMember) => {
    setEditMember(m);
    setEditForm({
      name: m.name,
      role: m.role,
      department_slug: m.department_slug,
      departments: m.departments ?? [m.department_slug],
      access_level: m.access_level ?? 'operator',
      pin: m.pin ?? '',
      phone: m.phone ?? '',
      contract_status: m.contract_status ?? 'active',
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMember) return;
    setEditSaving(true);
    try {
      const depts = editForm.departments.length > 0 ? editForm.departments : [editForm.department_slug];
      const { error } = await supabase
        .from('team_members')
        .update({
          name: editForm.name.trim(),
          role: editForm.role.trim(),
          department_slug: editForm.department_slug,
          departments: depts,
          access_level: editForm.access_level,
          pin: editForm.pin || editMember.pin,
          phone: editForm.phone.trim() || null,
          contract_status: editForm.contract_status,
        })
        .eq('id', editMember.id);
      if (error) throw error;
      showToast({ type: 'success', message: `${editForm.name} updated.` });
      setEditMember(null);
      await loadMembers();
    } catch (err: any) {
      showToast({ type: 'error', message: err.message ?? 'Failed to update member' });
    } finally {
      setEditSaving(false);
    }
  };

  const toggleDept = (dept: string, form: typeof emptyForm, setter: (f: typeof emptyForm) => void) => {
    const current = form.departments;
    setter({
      ...form,
      departments: current.includes(dept)
        ? current.filter((d) => d !== dept)
        : [...current, dept],
    });
  };

  if (!isFounderOrCompliance) {
    return (
      <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
        <div className="p-8 bg-tertiary-container/10 border-l-2 border-tertiary-container">
          <p className="text-tertiary font-body font-bold">Access Restricted</p>
          <p className="text-sm font-label text-on-surface-variant mt-1">
            Team management requires Founder or Compliance role.
          </p>
        </div>
      </div>
    );
  }

  const activeCount = members.filter((m) => m.contract_status === 'active' || m.contract_status === 'probation').length;
  const inactiveCount = members.filter((m) => m.contract_status === 'inactive').length;

  return (
    <div className="px-4 md:px-8 py-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-end mb-10 flex-wrap gap-4">
        <div>
          <h2 className="font-headline text-4xl font-extrabold tracking-tight mb-2">Team Management</h2>
          <p className="text-slate-400 font-label text-sm">Uganda Employment Act compliant — no delete, only deactivate</p>
        </div>
        <div className="flex gap-3">
          {isFounder && (
            <button
              onClick={() => setShowPins(!showPins)}
              className={`px-5 py-2.5 font-label text-sm font-semibold transition-all border ${showPins ? 'bg-tertiary-container/20 border-tertiary text-tertiary' : 'border-outline-variant/30 text-outline hover:text-on-surface'}`}
            >
              {showPins ? 'Hide PINs' : 'Reveal PINs'}
            </button>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-primary-container text-on-primary-container px-6 py-2.5 font-label text-sm font-semibold hover:brightness-110 flex items-center gap-2 transition-all"
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Add Team Member
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Members', value: members.length, color: 'text-on-surface' },
          { label: 'Active / Probation', value: activeCount, color: 'text-secondary' },
          { label: 'Inactive', value: inactiveCount, color: inactiveCount > 0 ? 'text-tertiary' : 'text-outline' },
        ].map((s) => (
          <div key={s.label} className="bg-surface-container-low ghost-border p-6">
            <p className="font-label text-[10px] text-outline uppercase tracking-[0.2em] mb-2">{s.label}</p>
            <p className={`font-body text-4xl font-bold ${s.color}`}>{s.value}</p>
            <p className="mt-2 text-[10px] font-label text-outline/40">[source: team_members, buziga]</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest ghost-border overflow-hidden mb-8">
        <div className="px-6 py-4 bg-surface-container-high border-b border-outline-variant/10 flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-widest text-outline font-label">Team Members</h3>
          <span className="text-[10px] text-outline/50 font-label">[source: team_members, buziga]</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#262a31]/30">
                {['Name', 'Role', 'Primary Dept', 'All Depts', 'Access', 'PIN', 'Status', ''].map((h) => (
                  <th key={h} className="px-5 py-4 font-label text-[10px] uppercase tracking-widest text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="font-body">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-outline/50 font-label text-sm">Loading team...</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-outline/50 font-label text-sm">No team members — add the first one.</td>
                </tr>
              ) : members.map((m) => {
                const isInactive = m.contract_status === 'inactive';
                return (
                  <tr
                    key={m.id}
                    className={`border-b border-[#262a31]/10 transition-colors cursor-pointer ${
                      isInactive
                        ? 'opacity-50 hover:opacity-70 hover:bg-[#262a31]/10'
                        : 'hover:bg-[#262a31]/20'
                    }`}
                    onClick={() => openEdit(m)}
                  >
                    <td className="px-5 py-4 text-sm font-semibold text-on-surface">
                      {m.name}
                      <span className="ml-2 text-[10px] font-label text-outline/40">[{m.id?.slice(0, 6)}]</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-label text-on-surface-variant">{m.role}</td>
                    <td className="px-5 py-4 text-sm font-label text-on-surface-variant">{m.department_slug}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(m.departments ?? [m.department_slug]).map((d) => (
                          <span key={d} className="bg-primary-container/20 text-primary text-[9px] px-1.5 py-0.5 font-label">
                            {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="bg-surface-container text-on-surface-variant text-[9px] px-2 py-0.5 font-label uppercase">
                        {m.access_level ?? 'operator'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-label font-mono">
                      {isFounder && showPins
                        ? <span className="text-tertiary">{m.pin}</span>
                        : <span className="text-outline/50">{'•'.repeat(Math.min(m.pin?.length ?? 4, 6))}</span>
                      }
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] px-2 py-0.5 font-label font-bold uppercase ${
                        m.contract_status === 'active'
                          ? 'bg-secondary-container text-secondary'
                          : m.contract_status === 'probation'
                          ? 'bg-primary-container/30 text-primary'
                          : 'bg-surface-container text-outline'
                      }`}>
                        {m.contract_status ?? 'active'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-label text-primary">Edit</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold font-headline mb-1">Add Team Member</h2>
            <p className="text-[10px] text-outline/50 font-label mb-6">Writes to team_members — Uganda Employment Act compliant</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <FieldRow label="Full Name">
                <input
                  type="text"
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g., Amos Kiprotich"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Role / Job Title">
                <input
                  type="text"
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  placeholder="e.g., Production Operator"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Primary Department">
                <select
                  value={addForm.department_slug}
                  onChange={(e) => setAddForm({ ...addForm, department_slug: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Also in Departments (multi-select)">
                <div className="flex flex-wrap gap-2 mt-1">
                  {DEPARTMENTS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDept(d, addForm, setAddForm)}
                      className={`text-[9px] px-2 py-1 font-label uppercase transition-colors ${
                        addForm.departments.includes(d)
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container text-outline hover:bg-surface-container-high'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Access Level">
                <select
                  value={addForm.access_level}
                  onChange={(e) => setAddForm({ ...addForm, access_level: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {ACCESS_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="PIN (4+ digits)">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={addForm.pin}
                  onChange={(e) => setAddForm({ ...addForm, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="••••"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Phone (optional)">
                <input
                  type="tel"
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="+256 7XX XXX XXX"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Contract Status">
                <select
                  value={addForm.contract_status}
                  onChange={(e) => setAddForm({ ...addForm, contract_status: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {CONTRACT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FieldRow>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setAddForm({ ...emptyForm }); }}
                  className="flex-1 py-2.5 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="flex-1 py-2.5 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50"
                >
                  {addSaving ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editMember && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold font-headline mb-1">{editMember.name}</h2>
            <p className="text-[10px] text-outline/50 font-label mb-1">[source: team_members row {editMember.id?.slice(0, 8)}]</p>
            <p className="text-[10px] text-tertiary font-label mb-6 font-bold uppercase tracking-widest">
              No delete — set contract_status = inactive to deactivate
            </p>
            <form onSubmit={handleEdit} className="space-y-4">
              <FieldRow label="Full Name">
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Role / Job Title">
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Primary Department">
                <select
                  value={editForm.department_slug}
                  onChange={(e) => setEditForm({ ...editForm, department_slug: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Also in Departments">
                <div className="flex flex-wrap gap-2 mt-1">
                  {DEPARTMENTS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDept(d, editForm, setEditForm)}
                      className={`text-[9px] px-2 py-1 font-label uppercase transition-colors ${
                        editForm.departments.includes(d)
                          ? 'bg-primary-container text-on-primary-container'
                          : 'bg-surface-container text-outline hover:bg-surface-container-high'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </FieldRow>
              <FieldRow label="Access Level">
                <select
                  value={editForm.access_level}
                  onChange={(e) => setEditForm({ ...editForm, access_level: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {ACCESS_LEVELS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="New PIN (leave blank to keep current)">
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={editForm.pin}
                  onChange={(e) => setEditForm({ ...editForm, pin: e.target.value.replace(/\D/g, '') })}
                  placeholder="Leave blank to keep"
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Phone">
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </FieldRow>
              <FieldRow label="Contract Status">
                <select
                  value={editForm.contract_status}
                  onChange={(e) => setEditForm({ ...editForm, contract_status: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  {CONTRACT_STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </FieldRow>
              {editForm.contract_status === 'inactive' && (
                <div className="px-3 py-2 bg-tertiary-container/10 border-l-2 border-tertiary-container">
                  <p className="text-[10px] font-label text-tertiary font-bold uppercase">
                    Setting inactive — member will lose system access. Audit trail preserved.
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditMember(null)}
                  className="flex-1 py-2.5 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-2.5 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase text-outline font-label tracking-widest">{label}</label>
      {children}
    </div>
  );
}
