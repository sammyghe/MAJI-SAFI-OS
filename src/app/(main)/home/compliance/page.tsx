'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import TodaysFocus from '@/components/TodaysFocus';

interface ComplianceRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  due_date: string | null;
  renewal_date: string | null;
  created_at: string;
}

interface CAPA {
  id: string;
  batch_id: string;
  test_type: string;
  status: string;
  created_at: string;
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Simple month calendar
function MonthCalendar({ records }: { records: ComplianceRecord[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const eventsByDay: Record<number, { urgency: 'overdue' | 'soon' | 'future' }> = {};
  records.forEach((r) => {
    const d = r.due_date ?? r.renewal_date;
    if (!d) return;
    const dt = new Date(d);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      const diff = daysUntil(d) ?? 999;
      const urgency = diff < 0 ? 'overdue' : diff <= 7 ? 'soon' : 'future';
      if (!eventsByDay[day] || urgency === 'overdue') eventsByDay[day] = { urgency };
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const urgencyColor = { overdue: 'bg-red-400', soon: 'bg-amber-400', future: 'bg-emerald-400' };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">
        {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <span key={d} className="text-[9px] text-slate-600 font-bold">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`h-8 flex flex-col items-center justify-center rounded-lg relative text-xs
              ${day === today ? 'bg-[#0077B6]/20 border border-[#0077B6]/40 font-black text-[#7EC8E3]' : ''}
              ${day && day < today ? 'text-slate-700' : 'text-slate-300'}
            `}
          >
            {day}
            {day && eventsByDay[day] && (
              <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${urgencyColor[eventsByDay[day].urgency]}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-4 flex-wrap">
        {(['overdue','soon','future'] as const).map((u) => (
          <span key={u} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className={`w-2 h-2 rounded-full ${urgencyColor[u]}`} />
            {u === 'overdue' ? 'Overdue' : u === 'soon' ? 'This week' : 'Future'}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ComplianceHome() {
  const { user } = useAuth();
  const [records, setRecords] = useState<ComplianceRecord[]>([]);
  const [capas, setCAPAs] = useState<CAPA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCAPAs, setShowCAPAs] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [recRes, capaRes] = await Promise.all([
      supabase.from('compliance_records').select('*').eq('location_id', 'buziga').order('due_date', { ascending: true }).limit(30),
      supabase.from('capa_records').select('id, batch_id, test_type, status, created_at').eq('location_id', 'buziga').eq('status', 'open').order('created_at', { ascending: false }).limit(10),
    ]);
    setRecords(recRes.data ?? []);
    setCAPAs(capaRes.data ?? []);
    setLoading(false);
  };

  // Key cert statuses
  const certRecords = records.filter((r) =>
    ['UNBS','NEMA','URSB'].some((k) => (r.category ?? r.title ?? '').toUpperCase().includes(k))
  );

  const getStatus = (r: ComplianceRecord) => {
    const d = r.due_date ?? r.renewal_date;
    const days = daysUntil(d);
    if (days === null) return { label: r.status ?? 'Unknown', color: 'text-slate-400', bg: 'bg-zinc-800' };
    if (days < 0) return { label: 'OVERDUE', color: 'text-red-400', bg: 'bg-red-500/10' };
    if (days <= 30) return { label: `${days}d to renew`, color: 'text-amber-400', bg: 'bg-amber-500/10' };
    return { label: r.status === 'active' ? 'Valid' : r.status, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
  };

  const keyCerts = (['UNBS','NEMA','URSB'] as const).map((k) => {
    const r = records.find((rec) => (rec.category ?? rec.title ?? '').toUpperCase().includes(k));
    return { key: k, record: r };
  });

  return (
    <div className="px-5 py-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Compliance</h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">{user?.name?.split(' ')[0]} · Regulatory Calendar</p>
      </div>

      {/* Today's Focus */}
      <div className="mb-2">
        <TodaysFocus department="compliance" />
      </div>

      {/* Key Cert Status Badges */}
      <div className="grid grid-cols-3 gap-4">
        {keyCerts.map(({ key, record }) => {
          const status = record ? getStatus(record) : { label: 'Not tracked', color: 'text-slate-500', bg: 'bg-zinc-900' };
          return (
            <div key={key} className={`border border-zinc-800 rounded-2xl p-5 ${status.bg}`}>
              <div className="flex items-center gap-2 mb-2">
                <Shield className={`w-4 h-4 ${status.color}`} />
                <span className="text-xs font-black text-white">{key}</span>
              </div>
              <p className={`text-sm font-black ${status.color}`}>{status.label}</p>
              {record?.due_date && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Due {new Date(record.due_date).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Calendar */}
      {!loading && <MonthCalendar records={records} />}

      {/* Upcoming deadlines */}
      {records.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-xs font-black text-white uppercase tracking-widest mb-4">Upcoming Deadlines</h3>
          <div className="space-y-2">
            {records
              .filter((r) => {
                const days = daysUntil(r.due_date ?? r.renewal_date);
                return days !== null && days <= 60;
              })
              .slice(0, 8)
              .map((r) => {
                const st = getStatus(r);
                return (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                    <div>
                      <p className="text-xs font-bold text-white">{r.title}</p>
                      <p className="text-[10px] text-slate-500">{r.category}</p>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${st.color} ${st.bg}`}>
                      {st.label}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Open CAPAs */}
      {capas.length > 0 && (
        <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowCAPAs(!showCAPAs)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-widest">
                Open CAPAs ({capas.length})
              </span>
            </div>
            {showCAPAs ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
          </button>
          {showCAPAs && (
            <div className="px-5 pb-4 space-y-2">
              {capas.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-0">
                  <div>
                    <p className="text-xs font-bold text-white">Batch {c.batch_id}</p>
                    <p className="text-[10px] text-slate-500">{c.test_type} failure</p>
                  </div>
                  <span className="text-[10px] text-amber-400 uppercase font-bold">{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
