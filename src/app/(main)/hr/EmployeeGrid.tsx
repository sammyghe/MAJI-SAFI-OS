"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';
import { Upload, Edit2, CheckCircle, X, ShieldAlert, FileIcon, UserPlus } from 'lucide-react';

export default function EmployeeGrid({ initialUsers }: { initialUsers: any[] }) {
  const [users, setUsers] = useState<any[]>(initialUsers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Realtime: subscribe to users table ──────────────────────────────
  useEffect(() => {
    channelRef.current = supabase
      .channel('rt:users:hr')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'users' },
        ({ new: record }) => {
          setUsers(prev => {
            // Avoid duplicates
            if (prev.find(u => u.id === record.id)) return prev;
            return [record, ...prev];
          });
          showToast({
            type: 'info',
            message: `👤 New employee registered: ${record.name ?? record.email ?? 'unknown'}`,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        ({ new: record }) => {
          setUsers(prev => prev.map(u => u.id === record.id ? record : u));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'users' },
        ({ old: record }) => {
          setUsers(prev => prev.filter(u => u.id !== record.id));
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const startEditing = (user: any) => {
    setEditingId(user.id);
    setEditForm({ ...user });
  };

  const handleSave = async () => {
    if (!editingId) return;

    const payload = { ...editForm };
    if (payload.status === 'approved' && !payload.role) {
      payload.role = 'team_member';
    }

    const { error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', editingId);

    if (!error) {
      setUsers(users.map(u => u.id === editingId ? payload : u));
    } else {
      showToast({ type: 'error', message: 'Error saving: ' + error.message });
    }
    setEditingId(null);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, userId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(userId);
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-contract-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('maji_documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('maji_documents')
        .getPublicUrl(fileName);

      const contractUrl = data.publicUrl;

      await supabase
        .from('users')
        .update({ contract_url: contractUrl, contract_status: 'Active' })
        .eq('id', userId);

      setUsers(users.map(u =>
        u.id === userId ? { ...u, contract_url: contractUrl, contract_status: 'Active' } : u
      ));
      showToast({ type: 'success', message: '✅ Contract uploaded successfully.' });
    } catch (err: any) {
      showToast({ type: 'error', message: 'Upload failed: ' + err.message });
    }
    setUploading(null);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          Employee Directory
          {/* Live indicator */}
          <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full ml-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Live
          </span>
        </h3>
        <span className="text-sm text-gray-400">{users.length} team members</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="border-b border-white/10 text-cyan-400 text-sm">
              <th className="pb-3 font-semibold px-2">Personnel</th>
              <th className="pb-3 font-semibold">Status / Role</th>
              <th className="pb-3 font-semibold">Department</th>
              <th className="pb-3 font-semibold">Contract</th>
              <th className="pb-3 font-semibold">Performance</th>
              <th className="pb-3 font-semibold text-right px-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10 text-sm">
            {users.map((user) => {
              const isEditing = editingId === user.id;

              return (
                <tr key={user.id} className="hover:bg-cyan-500/10 transition-colors group">
                  <td className="py-4 px-2">
                    <p className="font-bold text-white">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>

                  <td className="py-4">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <select
                          className="bg-slate-900 border border-white/20 text-white rounded p-1 text-xs"
                          value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}
                        >
                          <option value="pending">Pending</option>
                          <option value="approved">Approved</option>
                          <option value="rejected">Rejected</option>
                        </select>
                        <input
                          type="text" placeholder="Role (e.g. founder, operations)"
                          className="bg-slate-900 border border-white/20 text-white rounded p-1 text-xs w-28"
                          value={editForm.role || ''} onChange={e => setEditForm({...editForm, role: e.target.value})}
                        />
                      </div>
                    ) : (
                      <div>
                        {user.status === 'pending' ? (
                          <span className="flex items-center gap-1 text-yellow-400 font-bold text-xs bg-yellow-400/10 px-2 py-1 rounded w-max">
                            <ShieldAlert className="w-3 h-3"/> Pending Auth
                          </span>
                        ) : user.status === 'rejected' ? (
                          <span className="flex items-center gap-1 text-red-400 font-bold text-xs bg-red-400/10 px-2 py-1 rounded w-max">
                            <X className="w-3 h-3"/> Rejected
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-cyan-400 font-bold text-xs bg-cyan-400/10 px-2 py-1 rounded w-max">
                            <CheckCircle className="w-3 h-3"/> {user.role || 'user'}
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-4">
                    {isEditing ? (
                      <input
                        type="text" className="bg-slate-900 border border-white/20 text-white rounded p-1 text-xs w-24"
                        value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})}
                      />
                    ) : (
                      <span className="text-gray-300 capitalize">{user.department || '-'}</span>
                    )}
                  </td>

                  <td className="py-4">
                    <div className="flex flex-col gap-2">
                      {isEditing ? (
                        <select
                          className="bg-slate-900 border border-white/20 text-white rounded p-1 text-xs w-28"
                          value={editForm.contract_status || 'Pending Signature'} onChange={e => setEditForm({...editForm, contract_status: e.target.value})}
                        >
                          <option>Pending Signature</option>
                          <option>Active</option>
                          <option>Terminated</option>
                        </select>
                      ) : (
                        <span className={`text-xs px-2 py-1 rounded-md w-max border ${
                          user.contract_status === 'Active' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                        }`}>
                          {user.contract_status || 'Pending'}
                        </span>
                      )}

                      <div className="flex items-center gap-2">
                        {user.contract_url && (
                          <a href={user.contract_url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-blue-400 hover:underline">
                            <FileIcon className="w-3 h-3"/> View
                          </a>
                        )}
                        <label className="text-xs cursor-pointer text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-2 py-1 rounded border border-white/10 transition-colors">
                          {uploading === user.id ? <span className="animate-pulse">...</span> : <><Upload className="w-3 h-3" /> PDF</>}
                          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e, user.id)} disabled={uploading === user.id} />
                        </label>
                      </div>
                    </div>
                  </td>

                  <td className="py-4">
                    {isEditing ? (
                      <textarea
                        className="bg-slate-900 border border-white/20 text-white rounded p-1 text-xs w-48 h-10 resize-none"
                        value={editForm.performance_notes || ''} onChange={e => setEditForm({...editForm, performance_notes: e.target.value})}
                      />
                    ) : (
                      <p className="text-xs text-gray-400 italic max-w-xs">{user.performance_notes || 'No notes.'}</p>
                    )}
                  </td>

                  <td className="py-4 text-right px-2">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={handleSave} className="bg-cyan-500 hover:bg-cyan-400 text-white px-3 py-1 rounded-md text-xs font-bold transition-colors">Save</button>
                        <button onClick={() => setEditingId(null)} className="bg-transparent border border-white/20 text-white px-3 py-1 rounded-md text-xs hover:bg-white/5 transition-colors">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => startEditing(user)} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-white/10">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center gap-2">
            <UserPlus className="w-8 h-8 text-gray-600" />
            <p className="text-sm">No employees yet. Subscribed to live updates.</p>
          </div>
        )}
      </div>
    </div>
  );
}
