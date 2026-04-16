"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';

export default function ComplianceClient({ initialRecords }: { initialRecords: any[] }) {
  const [records, setRecords] = useState<any[]>(initialRecords);
  const [uploading, setUploading] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
      await supabase.from('compliance_records').update({ file_url: data.publicUrl, status: 'active' }).eq('id', recordId);
      setRecords(records.map((r) => r.id === recordId ? { ...r, file_url: data.publicUrl, status: 'active' } : r));
      showToast({ type: 'success', message: 'Compliance document uploaded.' });
    } catch (err: any) {
      showToast({ type: 'error', message: 'Upload failed: ' + err.message });
    }
    setUploading(null);
  };

  const expiringSoon = records.filter((r) => {
    const days = (new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 30;
  });

  return (
    <div className="space-y-6">
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
              const isExpiring = daysLeft > 0 && daysLeft < 30;
              const isExpired = daysLeft <= 0;
              return (
                <div
                  key={record.id}
                  className={`px-6 py-5 flex items-center justify-between transition-colors hover:bg-surface-container-high/30 ${isExpiring ? 'border-l-2 border-tertiary-container' : ''}`}
                >
                  <div>
                    <p className="font-bold text-on-surface text-sm font-label">{record.document_name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-[10px] font-bold uppercase font-label ${record.status === 'active' ? 'text-secondary' : 'text-outline/50'}`}>
                        {record.status === 'active' ? '● Active' : '○ Missing'}
                      </span>
                      <span className={`text-[10px] font-label ${isExpired ? 'text-tertiary' : isExpiring ? 'text-tertiary-container' : 'text-outline/50'}`}>
                        {isExpired ? `Expired ${record.expiry_date}` : `Exp: ${record.expiry_date}`}
                        {isExpiring && ` · ${daysLeft}d left`}
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
                      >
                        VIEW
                      </a>
                    )}
                    <label className="text-xs cursor-pointer text-outline hover:text-on-surface flex items-center gap-1 font-label border border-outline-variant/30 px-3 py-1 transition-colors hover:bg-surface-container-high">
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
    </div>
  );
}
