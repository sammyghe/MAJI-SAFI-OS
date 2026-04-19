"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';

interface CapaRecord {
  id: string;
  batch_id?: string;
  test_type?: string;
  reading?: number;
  status: string;
  resolution_notes?: string;
  created_at: string;
  resolved_at?: string;
}

export default function ComplianceClient({ initialRecords }: { initialRecords: any[] }) {
  const [records, setRecords] = useState<any[]>(initialRecords);
  const [uploading, setUploading] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ status: 'missing', expiry_date: '' });
  const [editSaving, setEditSaving] = useState(false);

  const [tasks, setTasks] = useState([
    { id: 1, text: 'Validate daily operational logs', checked: true },
    { id: 2, text: 'Review UNBS water sample quarterly feedback', checked: false },
    { id: 3, text: 'Confirm health & safety gear maintenance', checked: false },
  ]);
  const [newTask, setNewTask] = useState('');

  // Realtime: subscribe to compliance_records
  useEffect(() => {
    channelRef.current = supabase
      .channel('rt:compliance_records')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'compliance_records' }, ({ new: record }) => {
        setRecords((prev) => prev.find((r) => r.id === record.id) ? prev : [record, ...prev]);
        showToast({ type: 'info', message: `New compliance record: ${record.document_name ?? 'document'} added` });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'compliance_records' }, ({ new: record }) => {
        setRecords((prev) => prev.map((r) => r.id === record.id ? record : r));
        showToast({ type: 'success', message: `Compliance record updated: ${record.document_name ?? 'document'}` });
      })
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, []);

  const toggleTask = (id: number) => setTasks(tasks.map((t) => t.id === id ? { ...t, checked: !t.checked } : t));

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, checked: false }]);
    setNewTask('');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, recordId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(recordId);
    const fileName = `compliance-${recordId}-${Date.now()}.${file.name.split('.').pop()}`;
    try {
      const { error: uploadError } = await supabase.storage.from('maji_documents').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('maji_documents').getPublicUrl(fileName);
      await supabase.from('compliance_records').update({ file_url: data.publicUrl, status: 'active', updated_at: new Date().toISOString() }).eq('id', recordId);
      setRecords(records.map((r) => r.id === recordId ? { ...r, file_url: data.publicUrl, status: 'active' } : r));
      showToast({ type: 'success', message: 'Compliance document uploaded.' });
    } catch (err: any) {
      showToast({ type: 'error', message: 'Upload failed: ' + err.message });
    }
    setUploading(null);
  };

  const openEdit = (record: any) => {
    setEditRecord(record);
    setEditForm({ status: record.status, expiry_date: record.expiry_date ?? '' });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRecord) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('compliance_records')
        .update({
          status: editForm.status,
          expiry_date: editForm.expiry_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editRecord.id);
      if (error) throw error;
      setRecords(records.map((r) => r.id === editRecord.id ? { ...r, status: editForm.status, expiry_date: editForm.expiry_date } : r));
      showToast({ type: 'success', message: 'Record updated.' });
      setEditRecord(null);
    } catch (err: any) {
      showToast({ type: 'error', message: err.message ?? 'Error saving' });
    } finally {
      setEditSaving(false);
    }
  };

  const [capaRecords, setCapaRecords] = useState<CapaRecord[]>([]);
  const [capaLoading, setCapaLoading] = useState(false);
  const [resolvingCapa, setResolvingCapa] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  useEffect(() => {
    setCapaLoading(true);
    supabase
      .from('capa_records')
      .select('*')
      .eq('location_id', 'buziga')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { setCapaRecords(data ?? []); setCapaLoading(false); });
  }, []);

  const handleResolveCapa = async (capaId: string) => {
    if (!resolveNote.trim()) { showToast({ type: 'error', message: 'Resolution note required' }); return; }
    try {
      const { error } = await supabase
        .from('capa_records')
        .update({ status: 'closed', resolution_notes: resolveNote.trim(), resolved_at: new Date().toISOString() })
        .eq('id', capaId);
      if (error) throw error;
      setCapaRecords((prev) => prev.map((c) => c.id === capaId ? { ...c, status: 'closed', resolution_notes: resolveNote.trim() } : c));
      setResolvingCapa(null);
      setResolveNote('');
      showToast({ type: 'success', message: 'CAPA closed.' });
    } catch (err: any) {
      showToast({ type: 'error', message: err.message });
    }
  };

  const expiringSoon = records.filter((r) => {
    const days = (new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 30;
  });

  const capaTotal = capaRecords.length;
  const capaClosed = capaRecords.filter((c) => c.status === 'closed').length;
  const capaResolutionRate = capaTotal > 0 ? Math.round((capaClosed / capaTotal) * 100) : null;

  return (
    <div className="space-y-6">
      {/* CAPA Resolution Rate */}
      {capaTotal > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total CAPAs', value: capaTotal.toString(), color: 'text-on-surface' },
            { label: 'Resolved', value: capaClosed.toString(), color: capaClosed > 0 ? 'text-emerald-400' : 'text-outline' },
            { label: 'Resolution Rate', value: capaResolutionRate !== null ? `${capaResolutionRate}%` : '—', color: (capaResolutionRate ?? 0) === 100 ? 'text-emerald-400' : 'text-amber-400' },
          ].map((m) => (
            <div key={m.label} className="bg-surface-container-low p-4 border border-outline-variant/10">
              <p className="font-label text-[10px] text-outline uppercase tracking-[0.2em] mb-1">{m.label}</p>
              <p className={`font-body text-2xl font-bold ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Expiry alert banner */}
      {expiringSoon.length > 0 && (
        <div className="p-4 bg-tertiary-container/10 border-l-2 border-tertiary-container flex items-start gap-3">
          <span className="material-symbols-outlined text-tertiary-container text-sm mt-0.5">warning</span>
          <div>
            <p className="text-tertiary-container font-body text-[10px] font-bold uppercase tracking-widest">
              {expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} expiring within 30 days
            </p>
            <p className="text-sm font-label text-on-surface-variant mt-1">
              {expiringSoon.map((r) => r.document_name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Regulatory Documents Ledger */}
        <div className="bg-surface-container-low ghost-border overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container">
            <div>
              <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Regulatory Ledger</h3>
              <p className="text-[10px] text-outline/50 font-label mt-0.5">UNBS · NSSF · Employment Act · Legal</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              <span className="text-[10px] font-label text-secondary uppercase">Live</span>
            </div>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {records.length === 0 && (
              <p className="px-6 py-8 text-sm text-outline/50 font-label italic text-center">No records yet.</p>
            )}
            {records.map((record) => {
              const daysLeft = Math.ceil((new Date(record.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isExpired = daysLeft <= 0;
              const isExpiring = daysLeft > 0 && daysLeft <= 7;
              const isWarning = daysLeft > 7 && daysLeft <= 30;
              // Color: green >30d, amber 7-30d, red <7d, gray expired/unknown
              const expiryColor = isExpired ? 'text-gray-500' : isExpiring ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-green-400';
              return (
                <div
                  key={record.id}
                  className={`px-6 py-5 flex items-center justify-between transition-colors hover:bg-surface-container-high/30 cursor-pointer ${isExpired ? 'border-l-2 border-gray-500' : isExpiring ? 'border-l-2 border-red-500/60' : isWarning ? 'border-l-2 border-amber-500/60' : ''}`}
                  onClick={() => openEdit(record)}
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="font-bold text-on-surface text-sm font-label">{record.document_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-bold uppercase font-label ${record.status === 'active' ? 'text-secondary' : record.status === 'expired' ? 'text-tertiary' : 'text-outline/50'}`}>
                        {record.status === 'active' ? '● Active' : record.status === 'expired' ? '● Expired' : '○ Missing'}
                      </span>
                      <span className={`text-[10px] font-label font-bold ${expiryColor}`}>
                        {isExpired ? `Expired ${record.expiry_date}` : `Exp: ${record.expiry_date} · ${daysLeft}d`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {record.file_url && (
                      <a
                        href={record.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-primary font-label hover:text-primary/70"
                        onClick={(e) => e.stopPropagation()}
                      >
                        VIEW
                      </a>
                    )}
                    <label
                      className="text-xs cursor-pointer text-outline hover:text-on-surface flex items-center gap-1 font-label border border-outline-variant/30 px-3 py-1 transition-colors hover:bg-surface-container-high"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {uploading === record.id ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[14px]">upload</span>
                          Upload
                        </>
                      )}
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e, record.id)} disabled={uploading === record.id} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="bg-surface-container-low ghost-border overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container">
            <h3 className="text-sm font-bold font-headline uppercase tracking-widest">Internal Policies</h3>
            <span className="text-[10px] bg-surface-container-high font-label text-outline px-2 py-1">
              {tasks.filter((t) => t.checked).length} / {tasks.length} Completed
            </span>
          </div>

          <div className="flex-1 divide-y divide-outline-variant/10">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`px-6 py-4 flex items-start gap-4 cursor-pointer transition-colors ${
                  task.checked ? 'bg-secondary-container/10' : 'hover:bg-surface-container-high/20'
                }`}
                onClick={() => toggleTask(task.id)}
              >
                <button className="flex-shrink-0 mt-0.5 focus:outline-none">
                  {task.checked ? (
                    <span className="material-symbols-outlined text-secondary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_box
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-outline text-xl">check_box_outline_blank</span>
                  )}
                </button>
                <span className={`text-sm font-label tracking-wide ${task.checked ? 'text-secondary/70 line-through' : 'text-on-surface'}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-outline-variant/10">
            <form onSubmit={addTask} className="flex gap-2">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add new compliance task..."
                className="flex-1 bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
              />
              <button
                type="submit"
                disabled={!newTask}
                className="px-4 py-2 bg-primary-container text-on-primary-container text-xs font-bold font-label disabled:opacity-50 hover:brightness-110 transition-all"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* CAPA Section */}
      <div className="bg-surface-container-low ghost-border overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center justify-between bg-surface-container">
          <div>
            <h3 className="text-sm font-bold font-headline uppercase tracking-widest">CAPA Records</h3>
            <p className="text-[10px] text-outline/50 font-label mt-0.5">Corrective Actions from QC Failures — UNBS Audit Trail</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-label font-bold uppercase px-2 py-0.5 ${capaRecords.filter((c) => c.status === 'open').length > 0 ? 'text-tertiary bg-tertiary-container/20' : 'text-secondary bg-secondary-container/20'}`}>
              {capaRecords.filter((c) => c.status === 'open').length} Open
            </span>
          </div>
        </div>
        <div className="divide-y divide-outline-variant/10">
          {capaLoading ? (
            <p className="px-6 py-8 text-sm text-outline/50 font-label italic text-center">Loading CAPA records...</p>
          ) : capaRecords.length === 0 ? (
            <p className="px-6 py-8 text-sm text-outline/50 font-label italic text-center">No CAPA records — no QC failures logged.</p>
          ) : capaRecords.map((capa) => {
            const isOpen = capa.status === 'open';
            const isInProgress = capa.status === 'in_progress';
            return (
              <div key={capa.id} className="px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase font-label px-2 py-0.5 ${
                        capa.status === 'open' ? 'text-tertiary bg-tertiary-container/20' :
                        capa.status === 'in_progress' ? 'text-primary bg-primary-container/20' :
                        'text-secondary bg-secondary-container/20'
                      }`}>
                        {capa.status === 'in_progress' ? 'In Progress' : capa.status.charAt(0).toUpperCase() + capa.status.slice(1)}
                      </span>
                      {capa.batch_id && (
                        <span className="text-[10px] font-label text-outline/60">Batch: {capa.batch_id}</span>
                      )}
                      {capa.test_type && (
                        <span className="text-[10px] font-label text-outline/60">{capa.test_type}</span>
                      )}
                      {capa.reading !== null && capa.reading !== undefined && (
                        <span className="text-[10px] font-label text-tertiary">Reading: {capa.reading} ppm</span>
                      )}
                    </div>
                    <p className="text-[10px] text-outline/40 font-label">{new Date(capa.created_at).toLocaleString()}</p>
                    {capa.resolution_notes && (
                      <p className="text-xs text-outline/70 font-label mt-2 italic">Resolution: {capa.resolution_notes}</p>
                    )}
                  </div>
                  {(isOpen || isInProgress) && (
                    <button
                      onClick={() => { setResolvingCapa(capa.id); setResolveNote(''); }}
                      className="text-[10px] font-label text-primary hover:text-on-surface border border-primary/30 px-3 py-1.5 flex-shrink-0 transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
                {resolvingCapa === capa.id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={resolveNote}
                      onChange={(e) => setResolveNote(e.target.value)}
                      placeholder="Resolution note (required for UNBS audit)"
                      className="flex-1 bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                    />
                    <button
                      onClick={() => handleResolveCapa(capa.id)}
                      className="text-[10px] px-4 py-2 bg-secondary-container text-on-secondary-container font-label font-bold"
                    >
                      Close CAPA
                    </button>
                    <button
                      onClick={() => setResolvingCapa(null)}
                      className="text-[10px] px-3 py-2 bg-surface-container text-outline font-label"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Record Modal */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-low border border-outline-variant/20 p-8 max-w-sm w-full">
            <h2 className="text-xl font-bold font-headline mb-1">Edit Document</h2>
            <p className="text-sm text-on-surface-variant font-label mb-1">{editRecord.document_name}</p>
            <p className="text-[10px] text-outline/50 font-label mb-6">[source: compliance_records row {editRecord.id?.slice(0, 8)}]</p>
            <form onSubmit={handleEditSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                >
                  <option value="missing">Missing</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-outline font-label tracking-widest">Expiry Date</label>
                <input
                  type="date"
                  value={editForm.expiry_date}
                  onChange={(e) => setEditForm({ ...editForm, expiry_date: e.target.value })}
                  className="w-full bg-surface-container-lowest border-0 border-b border-outline-variant/30 focus:border-primary-container focus:ring-0 text-sm font-label py-2 text-on-surface"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditRecord(null)}
                  className="flex-1 py-2 bg-surface-container-high text-on-surface text-xs font-bold font-label hover:bg-surface-container-highest">
                  Cancel
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2 bg-primary-container text-on-primary-container text-xs font-bold font-label hover:brightness-110 disabled:opacity-50">
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
