"use client";

import { useState } from 'react';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';
import { Activity, Droplets, Info } from 'lucide-react';
import { DEPARTMENTS_CONFIG } from '@/lib/deptConfig';

const TABLE_TOAST_MAP: Record<string, { type: 'info' | 'success' | 'warning'; message: (r: any) => string }> = {
  maji_daily_logs:   { type: 'success', message: r => `📝 ${r.logged_by ?? 'Team'} logged ${r.jars_produced ?? '?'} units` },
  maji_quality_logs: { type: 'warning', message: r => `⚠️ Quality Alert: Batch ${r.batch_number ?? 'entry'} — ${r.status?.toUpperCase() ?? ''}` },
  maji_clients:      { type: 'info',    message: r => `🛒 New Sales Track: ${r.name ?? 'Client'}` },
  maji_inventory:    { type: 'info',    message: r => `📦 Stock Update: ${r.product_type ?? 'item'} level changed` },
  maji_compliance_records: { type: 'info', message: r => `📋 Regulatory: ${r.title ?? 'record'} updated` },
};

export default function DeptRealtimeLogs({
  department,
  initialLogs,
}: {
  department: string;
  initialLogs: any[];
}) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const config = (DEPARTMENTS_CONFIG as any)[department];
  const table = config?.table ?? 'maji_daily_logs';
  const toastCfg = TABLE_TOAST_MAP[table];

  useRealtimeSubscriptions([
    {
      table,
      label: `${department.charAt(0).toUpperCase() + department.slice(1)} Channel`,
      toastType: toastCfg?.type ?? 'info',
      toastMessage: toastCfg?.message,
      onInsert: (record) => {
        setLogs(prev => [record, ...prev].slice(0, 10));
      },
    },
  ]);

  const getDynamicValue = (log: any, fieldName: string) => {
    const val = log[fieldName];
    if (val === undefined || val === null) return '—';
    if (typeof val === 'number') return val.toLocaleString();
    return val.toString();
  };

  const statusBadge = (val: string) => {
    const s = val?.toLowerCase();
    if (['fail', 'expired', 'expired'].includes(s)) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    if (['pass', 'valid', 'active'].includes(s)) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (['flag', 'expiring', 'pending'].includes(s)) return 'text-brand-sky bg-brand-sky/10 border-brand-sky/20';
    return 'text-brand-steel bg-white/5 border-white/10';
  };

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full text-left border-separate border-spacing-y-3">
        <thead>
          <tr className="text-brand-steel text-[10px] font-black uppercase tracking-[0.3em]">
            <th className="px-6 pb-2">Lifecycle Date</th>
            {config.formFields.slice(0, 2).map((f: any) => (
              <th key={f.name} className="px-6 pb-2">{f.label}</th>
            ))}
            <th className="px-6 pb-2">Integrity Status</th>
            <th className="px-6 pb-2">Authority</th>
          </tr>
        </thead>
        <tbody className="text-xs">
          {logs.length > 0 ? logs.map((log: any, idx) => (
            <tr key={idx} className="group glass-panel hover:bg-white/5 transition-all duration-300">
              <td className="px-6 py-5 text-brand-steel font-bold rounded-l-3xl">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-sky/40" />
                  {log.date}
                </div>
              </td>
              
              {config.formFields.slice(0, 2).map((f: any) => (
                <td key={f.name} className="px-6 py-5 text-white font-black italic uppercase italic">
                  {getDynamicValue(log, f.name)}
                </td>
              ))}

              <td className="px-6 py-5">
                {log.status || log.quality_status ? (
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusBadge(log.status || log.quality_status)}`}>
                    {log.status || log.quality_status}
                  </span>
                ) : (
                  <div className="flex items-center gap-2 text-brand-steel/50 italic">
                    <Info className="w-3 h-3" />
                    Pending
                  </div>
                )}
              </td>

              <td className="px-6 py-5 rounded-r-3xl">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-brand-navy flex items-center justify-center text-[10px] font-black text-brand-sky border border-white/5">
                    {log.logged_by?.slice(0, 2).toUpperCase() || 'TM'}
                  </div>
                  <span className="font-black text-brand-sky uppercase italic text-[11px] tracking-vantage">
                    {log.logged_by || 'Team'}
                  </span>
                </div>
              </td>
            </tr>
          )) : (
            <tr>
              <td colSpan={5} className="py-20 text-center glass-panel rounded-[2rem]">
                <div className="flex flex-col items-center gap-4 text-brand-steel">
                  <Droplets className="w-10 h-10 animate-pulse opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">Waiting for telemetry streams...</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

