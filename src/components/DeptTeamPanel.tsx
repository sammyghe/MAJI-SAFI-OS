'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { showToast } from '@/components/ToastContainer';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  access_level: string;
  contract_status: string;
  onboarding_checklist: {
    contract_signed: boolean;
    medical_cert: boolean;
    nssf_registered: boolean;
    sop_training: boolean;
  } | null;
}

const CHECKLIST_LABELS: Record<string, string> = {
  contract_signed: 'Contract Signed',
  medical_cert: 'Medical Certificate',
  nssf_registered: 'NSSF Registered',
  sop_training: 'SOP Training',
};

export default function DeptTeamPanel({ departmentSlug }: { departmentSlug: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const canManage =
    user?.role === 'founder' ||
    user?.role === 'manager' ||
    user?.department_slug === departmentSlug ||
    user?.departments?.includes(departmentSlug);

  if (!canManage) return null;

  const loadMembers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('team_members')
      .select('id, name, role, access_level, contract_status, onboarding_checklist')
      .eq('location_id', 'buziga')
      .contains('departments', [departmentSlug])
      .in('contract_status', ['active', 'probation'])
      .order('name');
    setMembers(data ?? []);
    setLoading(false);
  };

  const toggleOpen = () => {
    if (!open) loadMembers();
    setOpen(!open);
  };

  const toggleChecklist = async (memberId: string, key: string, current: boolean) => {
    setSaving(memberId + key);
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    const updated = {
      ...(member.onboarding_checklist ?? {
        contract_signed: false,
        medical_cert: false,
        nssf_registered: false,
        sop_training: false,
      }),
      [key]: !current,
    };

    try {
      const { error } = await supabase
        .from('team_members')
        .update({ onboarding_checklist: updated })
        .eq('id', memberId);
      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, onboarding_checklist: updated } : m)
      );
      showToast({ type: 'success', message: `${CHECKLIST_LABELS[key]} updated for ${member.name}` });
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    } finally {
      setSaving(null);
    }
  };

  const getCompletion = (checklist: TeamMember['onboarding_checklist']) => {
    if (!checklist) return 0;
    const keys = Object.keys(CHECKLIST_LABELS);
    return keys.filter((k) => (checklist as any)[k]).length;
  };

  return (
    <div className="mt-6 bg-surface-container-low ghost-border overflow-hidden">
      <button
        onClick={toggleOpen}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface-container-high/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-widest text-outline font-label">Manage Team</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-outline" /> : <ChevronDown className="w-4 h-4 text-outline" />}
      </button>

      {open && (
        <div className="border-t border-outline-variant/10">
          {loading ? (
            <p className="px-6 py-6 text-sm text-outline/50 font-label italic">Loading team...</p>
          ) : members.length === 0 ? (
            <p className="px-6 py-6 text-sm text-outline/50 font-label italic">No active team members in {departmentSlug}.</p>
          ) : (
            <div className="divide-y divide-outline-variant/10">
              {members.map((member) => {
                const checklist = member.onboarding_checklist ?? {
                  contract_signed: false,
                  medical_cert: false,
                  nssf_registered: false,
                  sop_training: false,
                };
                const done = getCompletion(member.onboarding_checklist);
                const total = Object.keys(CHECKLIST_LABELS).length;

                return (
                  <div key={member.id} className="px-6 py-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold text-on-surface text-sm">{member.name}</p>
                        <p className="text-[10px] text-outline/60 font-label">{member.role} · {member.access_level}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 font-label font-bold rounded ${done === total ? 'bg-secondary-container text-secondary' : 'bg-tertiary-container/20 text-tertiary'}`}>
                          {done}/{total} onboarding
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                        const checked = (checklist as any)[key] as boolean;
                        const isSaving = saving === member.id + key;
                        return (
                          <button
                            key={key}
                            disabled={isSaving}
                            onClick={() => toggleChecklist(member.id, key, checked)}
                            className={`flex items-center gap-2 text-left text-[10px] px-3 py-2 font-label transition-colors rounded ${
                              checked
                                ? 'bg-secondary-container/30 text-secondary'
                                : 'bg-surface-container text-outline hover:bg-surface-container-high'
                            } ${isSaving ? 'opacity-50' : ''}`}
                          >
                            <span className={`w-3 h-3 rounded-sm flex-shrink-0 border ${checked ? 'bg-secondary border-secondary' : 'border-outline/40'}`} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
