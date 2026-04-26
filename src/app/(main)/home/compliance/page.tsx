'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { Shield, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';

interface ComplianceRecord {
  id: string;
  title: string;
  category: string;
  status: string;
  due_date: string | null;
  renewal_date: string | null;
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
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function MonthCalendar({ records }: { records: ComplianceRecord[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  const eventsByDay: Record<number, 'overdue' | 'soon' | 'future'> = {};
  records.forEach((r) => {
    const d = r.due_date ?? r.renewal_date;
    if (!d) return;
    const dt = new Date(d);
    if (dt.getFullYear() === year && dt.getMonth() === month) {
      const day = dt.getDate();
      const diff = daysUntil(d) ?? 999;
      const urgency: 'overdue' | 'soon' | 'future' = diff < 0 ? 'overdue' : diff <= 7 ? 'soon' : 'future';
      if (!eventsByDay[day] || urgency === 'overdue') eventsByDay[day] = urgency;
    }
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dotColor = { overdue: 'bg-red-400', soon: 'bg-amber-400', future: 'bg-emerald-400' };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
        {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
      </p>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
          <span key={d} className="text-[9px] text-slate-400 font-bold">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => (
          <div
            key={i}
            className={`h-8 flex flex-col items-center justify-center rounded-lg relative text-xs
              ${day === today ? 'bg-[#0077B6]/10 border border-[#0077B6]/30 font-black text-[#0077B6]' : ''}
              ${day && day < today ? 'text-slate-300' : day ? 'text-slate-700' : ''}
            `}
          >
            {day}
            {day && eventsByDay[day] && (
              <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${dotColor[eventsByDay[day]]}`} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 flex-wrap">
        {(['overdue', 'soon', 'future'] as const).map((u) => (
          <span key={u} className="flex items-center gap-1 text-[10px] text-slate-500">
            <span className={`w-2 h-2 rounded-full ${dotColor[u]}`} />
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
      supabase.from('compliance_records').select('id, title, category, status, due_date, renewal_date').eq('location_id', 'buziga').order('due_date', { ascending: true }).limit(30),
      supabase.from('capa_records').select('id, batch_id, test_type, status, created_at').eq('location_id', 'buziga').eq('status', 'open').order('created_at', { ascending: false }).limit(10),
    ]);
    setRecords(recRes.data ?? []);
    setCAPAs(capaRes.data ?? []);
    setLoading(false);
  };

  const getStatus = (r: ComplianceRecord) => {
    const d = r.due_date ?? r.renewal_date;
    const days = daysUntil(d);
    if (days === null) return { label: r.status ?? 'Unknown', color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
    if (days < 0) return { label: 'OVERDUE', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (days <= 30) return { label: `${days}d to renew`, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' };
    return { label: r.status === 'active' ? 'Valid' : r.status, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' };
  };

  const overdue = records.filter(r => { const d = daysUntil(r.due_date ?? r.renewal_date); return d !== null && d < 0; }).length;
  const dueThisWeek = records.filter(r => { const d = daysUntil(r.due_date ?? r.renewal_date); return d !== null && d >= 0 && d <= 7; }).length;
  const keyCerts = (['UNBS','NEMA','URSB'] as const).map((k) => ({
    key: k,
    record: records.find((r) => (r.category ?? r.title ?? '').toUpperCase().includes(k)),
  }));
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto space-y-8">

      {/* Greeting bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {greeting()}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{date} · Compliance</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className={`w-2 h-2 rounded-full ${overdue === 0 ? 'bg-emerald-400 animate-pulse' : 'bg-red-400 animate-ping'}`} />
            <span className={`text-sm font-semibold ${overdue === 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {overdue === 0 ? 'All deadlines on track' : `${overdue} overdue item${overdue > 1 ? 's' : ''}`}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Today's One Thing */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        {overdue > 0 ? (
          <div className="bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <AlertTriangle className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">{overdue} overdue compliance item{overdue > 1 ? 's' : ''} require action</p>
              <p className="text-sm opacity-75 mt-1">Review the deadlines below and escalate immediately</p>
            </div>
          </div>
        ) : dueThisWeek > 0 ? (
          <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <Calendar className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">{dueThisWeek} deadline{dueThisWeek > 1 ? 's' : ''} due this week</p>
              <p className="text-sm opacity-75 mt-1">Prepare renewals and documentation now</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <CheckCircle2 className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">All compliance items are on track</p>
              <p className="text-sm opacity-75 mt-1">Review the calendar below for upcoming renewals</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        {[
          { label: 'Total Records',    value: loading ? '—' : records.length.toString(),    icon: Shield,        ok: true, context: 'Active documents' },
          { label: 'Overdue',          value: loading ? '—' : overdue.toString(),            icon: AlertTriangle, ok: overdue === 0, context: 'Past due date' },
          { label: 'Due This Week',    value: loading ? '—' : dueThisWeek.toString(),        icon: Calendar,      ok: dueThisWeek === 0, context: 'Next 7 days' },
          { label: 'Open CAPAs',       value: loading ? '—' : capas.length.toString(),       icon: CheckCircle2,  ok: capas.length === 0, context: 'Quality actions' },
        ].map((kpi) => (
          <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="compliance" context={kpi.context} />
        ))}
      </motion.div>

      {/* Key cert status */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Key Certifications</p>
        <div className="grid grid-cols-3 gap-4">
          {keyCerts.map(({ key, record }) => {
            const status = record ? getStatus(record) : { label: 'Not tracked', color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200' };
            return (
              <div key={key} className={`border rounded-2xl p-5 ${status.bg} ${status.border}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Shield className={`w-4 h-4 ${status.color}`} />
                  <span className="text-xs font-black text-slate-900">{key}</span>
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
      </motion.div>

      {/* Calendar + Inbox */}
      <div className="grid md:grid-cols-3 gap-6">
        <motion.div className="md:col-span-2 space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          {!loading && <MonthCalendar records={records} />}

          {/* Upcoming deadlines */}
          {records.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Upcoming Deadlines</h3>
              <div className="space-y-2">
                {records
                  .filter(r => { const d = daysUntil(r.due_date ?? r.renewal_date); return d !== null && d <= 60; })
                  .slice(0, 8)
                  .map((r) => {
                    const st = getStatus(r);
                    return (
                      <div key={r.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{r.title}</p>
                          <p className="text-[10px] text-slate-500">{r.category}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${st.color} ${st.bg}`}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </motion.div>

        <motion.div className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <InboxPanel compact />

          {/* Open CAPAs */}
          {capas.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
              <button onClick={() => setShowCAPAs(!showCAPAs)} className="w-full flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Open CAPAs ({capas.length})</span>
                </div>
                {showCAPAs ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              {showCAPAs && (
                <div className="px-5 pb-4 space-y-2">
                  {capas.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-xs font-bold text-slate-800">Batch {c.batch_id}</p>
                        <p className="text-[10px] text-slate-500">{c.test_type} failure</p>
                      </div>
                      <span className="text-[10px] text-amber-600 uppercase font-bold bg-amber-50 px-2 py-0.5 rounded-full">{c.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
