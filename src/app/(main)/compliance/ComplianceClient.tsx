"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';
import { FileText, Upload, Plus, ShieldCheck, CheckSquare, Square, AlertTriangle } from 'lucide-react';

export default function ComplianceClient({ initialRecords }: { initialRecords: any[] }) {
  const [records, setRecords] = useState<any[]>(initialRecords);
  const [uploading, setUploading] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [tasks, setTasks] = useState([
    { id: 1, text: 'Validate daily operational logs', checked: true },
    { id: 2, text: 'Review UNBS water sample quarterly feedback', checked: false },
    { id: 3, text: 'Confirm health & safety gear maintenance', checked: false }
  ]);
  const [newTask, setNewTask] = useState('');

  // ── Realtime: subscribe to compliance_records ────────────────────────
  useEffect(() => {
    channelRef.current = supabase
      .channel('rt:compliance_records')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'compliance_records' },
        ({ new: record }) => {
          setRecords(prev => {
            if (prev.find(r => r.id === record.id)) return prev;
            return [record, ...prev];
          });
          showToast({
            type: 'info',
            message: `📋 New compliance record: ${record.document_name ?? 'document'} added`,
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'compliance_records' },
        ({ new: record }) => {
          setRecords(prev => prev.map(r => r.id === record.id ? record : r));
          showToast({
            type: 'success',
            message: `✅ Compliance record updated: ${record.document_name ?? 'document'}`,
          });
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, checked: !t.checked } : t));
  };

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
    const fileExt = file.name.split('.').pop();
    const fileName = `compliance-${recordId}-${Date.now()}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('maji_documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('maji_documents')
        .getPublicUrl(fileName);

      const fileUrl = data.publicUrl;

      await supabase
        .from('compliance_records')
        .update({ file_url: fileUrl, status: 'active' })
        .eq('id', recordId);

      setRecords(records.map(r => r.id === recordId ? { ...r, file_url: fileUrl, status: 'active' } : r));
      showToast({ type: 'success', message: '✅ Compliance document uploaded.' });
    } catch (err: any) {
      showToast({ type: 'error', message: 'Upload failed: ' + err.message });
    }
    setUploading(null);
  };

  // Check how many records are expiring soon (within 30 days)
  const expiringSoon = records.filter(r => {
    const days = (new Date(r.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 30;
  });

  return (
    <div className="space-y-6">
      {/* Expiry warning banner */}
      {expiringSoon.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-300 text-sm font-medium">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-orange-400" />
          <span>
            {expiringSoon.length} document{expiringSoon.length > 1 ? 's' : ''} expiring within 30 days —{' '}
            {expiringSoon.map(r => r.document_name).join(', ')}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Regulatory Documents Ledger */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" /> Regulatory Ledger
            <span className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full ml-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Live
            </span>
          </h3>
          <div className="space-y-4">
            {records.length === 0 && (
              <p className="text-sm text-gray-500 italic">No records yet.</p>
            )}
            {records.map(record => {
              const daysLeft = Math.ceil((new Date(record.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              const isExpiring = daysLeft > 0 && daysLeft < 30;
              return (
                <div key={record.id} className={`bg-white/5 border p-4 rounded-xl flex items-center justify-between transition-colors ${isExpiring ? 'border-orange-500/30' : 'border-white/10'}`}>
                  <div>
                    <p className="font-bold text-white text-sm">{record.document_name}</p>
                    <div className="flex items-center gap-2 mt-1 -ml-1">
                      <span className={`text-xs px-2 py-0.5 rounded-md ${record.status === 'active' ? 'text-green-400' : 'text-orange-400'}`}>
                        {record.status === 'active' ? 'Available' : 'Missing Doc'}
                      </span>
                      <span className={`text-xs font-medium ${isExpiring ? 'text-orange-400' : 'text-gray-500'}`}>
                        Exp: {record.expiry_date}
                        {isExpiring && ` · ${daysLeft}d left`}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {record.file_url && (
                      <a href={record.file_url} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-500/10 px-3 py-1.5 rounded-lg border border-cyan-500/20 transition-colors">
                        View
                      </a>
                    )}
                    <label className="text-xs cursor-pointer text-gray-400 hover:text-white flex items-center gap-1 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 transition-colors">
                      {uploading === record.id ? <span className="animate-pulse">...</span> : <><Upload className="w-4 h-4" /> Upload</>}
                      <input type="file" accept="application/pdf" className="hidden" onChange={(e) => handleUpload(e, record.id)} disabled={uploading === record.id} />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compliance Checklist */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-[2rem] shadow-2xl flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-cyan-400" /> Internal Policies
            </h3>
            <span className="text-xs bg-white/5 border border-white/10 text-gray-400 px-2 py-1 rounded-md">
              {tasks.filter(t => t.checked).length} / {tasks.length} Completed
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {tasks.map(task => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${task.checked ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/5 border-transparent hover:border-white/10'}`}
                onClick={() => toggleTask(task.id)}
              >
                <button className="mt-0.5 focus:outline-none">
                  {task.checked
                    ? <CheckSquare className="w-5 h-5 text-cyan-400" />
                    : <Square className="w-5 h-5 text-gray-400" />
                  }
                </button>
                <span className={`text-sm tracking-wide ${task.checked ? 'text-cyan-100 line-through opacity-70' : 'text-gray-200'}`}>
                  {task.text}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={addTask} className="relative mt-auto">
            <input
              type="text"
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              placeholder="Add new compliance rule..."
              className="w-full bg-slate-900 border border-white/20 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button type="submit" disabled={!newTask} className="absolute right-2 top-2 p-1.5 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-white disabled:opacity-50 transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
