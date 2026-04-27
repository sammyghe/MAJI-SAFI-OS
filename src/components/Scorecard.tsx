'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';

interface KPIRow {
  slug: string;
  name: string;
  department_slug: string;
  unit: string;
  display_format: string;
  higher_is_better: boolean;
  actual_value: number | null;
  target_value: number | null;
  status: 'on_track' | 'at_risk' | 'off_track' | 'no_data';
  computed_at: string | null;
}

interface ScorecardProps {
  departments?: string[];  // filter to specific depts; undefined = all
  period?: string;         // 'today' | 'YYYY-MM-DD', default 'today'
  showHeader?: boolean;
  compact?: boolean;
}

const STATUS_CONFIG = {
  on_track: { label: 'On Track', dot: 'bg-emerald-500', text: 'text-emerald-600', bar: 'bg-emerald-500' },
  at_risk:  { label: 'At Risk',  dot: 'bg-amber-500',   text: 'text-amber-600',   bar: 'bg-amber-500' },
  off_track:{ label: 'Off Track',dot: 'bg-red-500',     text: 'text-red-600',     bar: 'bg-red-500' },
  no_data:  { label: 'No Data',  dot: 'bg-zinc-400',   text: 'text-slate-500',   bar: 'bg-zinc-400' },
};

const DEPT_LABELS: Record<string, string> = {
  production: 'Production',
  quality: 'Quality',
  inventory: 'Inventory',
  dispatch: 'Dispatch',
  sales: 'Sales',
  marketing: 'Marketing',
  finance: 'Finance',
  compliance: 'Compliance',
  technology: 'Technology',
  'founder-office': 'Founder Office',
};

function formatValue(value: number | null, format: string): string {
  if (value === null) return '—';
  if (format === 'currency') {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toLocaleString();
  }
  if (format === 'percent') return `${value}%`;
  if (format === 'days') return `${value}d`;
  return value.toLocaleString();
}

function AnimatedNumber({ value, format }: { value: number | null, format: string }) {
  if (value === null) return <span>—</span>;
  
  const isCurrency = format === 'currency';
  const isPercent = format === 'percent';
  const isDays = format === 'days';

  let displayValue = value;
  let suffix = '';
  const prefix = '';
  
  if (isCurrency) {
    if (value >= 1_000_000) { displayValue = value / 1_000_000; suffix = 'M'; }
    else if (value >= 1_000) { displayValue = value / 1_000; suffix = 'K'; }
  } else if (isPercent) {
    suffix = '%';
  } else if (isDays) {
    suffix = 'd';
  }

  return (
    <CountUp
      end={displayValue}
      duration={1}
      separator=","
      decimals={isCurrency && displayValue < 1000 && displayValue % 1 !== 0 ? 1 : 0}
      prefix={prefix}
      suffix={suffix}
    />
  );
}

function ProgressBar({ actual, target, status, higherIsBetter }: {
  actual: number | null; target: number | null;
  status: KPIRow['status']; higherIsBetter: boolean;
}) {
  if (actual === null || target === null || target === 0) return null;
  const pct = higherIsBetter
    ? Math.min(100, Math.round((actual / target) * 100))
    : Math.min(100, Math.round(((target - actual + 1) / (target + 1)) * 100));
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="w-full bg-slate-100 rounded-full h-1 mt-1.5">
      <div className={`h-1 rounded-full transition-all ${cfg.bar}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function Scorecard({ departments, period = 'today', showHeader = true, compact = false }: ScorecardProps) {
  const [byDept, setByDept] = useState<Record<string, KPIRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scorecard/${period}`);
      if (!res.ok) throw new Error('fetch failed');
      const json = await res.json();
      setDate(json.date);
      if (departments) {
        const filtered: Record<string, KPIRow[]> = {};
        for (const d of departments) {
          if (json.by_department[d]) filtered[d] = json.by_department[d];
        }
        setByDept(filtered);
      } else {
        setByDept(json.by_department);
      }
    } catch {
      // silent fail — scorecard is optional
    } finally {
      setLoading(false);
    }
  }, [period, departments?.join(',')]);

  useEffect(() => { load(); }, [load]);

  const deptKeys = departments ?? Object.keys(byDept);
  const onTrackCount = Object.values(byDept).flat().filter(k => k.status === 'on_track').length;
  const offTrackCount = Object.values(byDept).flat().filter(k => k.status === 'off_track').length;
  const atRiskCount = Object.values(byDept).flat().filter(k => k.status === 'at_risk').length;

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">
          Loading scorecard…
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Scorecard</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">{date}</p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase">
            {onTrackCount > 0 && (
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />{onTrackCount} on track
              </span>
            )}
            {atRiskCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />{atRiskCount} at risk
              </span>
            )}
            {offTrackCount > 0 && (
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400" />{offTrackCount} off track
              </span>
            )}
          </div>
        </div>
      )}

      {deptKeys.map((dept) => {
        const kpis = byDept[dept];
        if (!kpis || kpis.length === 0) return null;
        return (
          <motion.div 
            key={dept} 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="px-4 py-2.5 border-b border-zinc-100 bg-slate-50">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {DEPT_LABELS[dept] ?? dept}
              </p>
            </div>
            <div className={`divide-y divide-zinc-100 ${compact ? '' : ''}`}>
              {kpis.map((kpi) => {
                const cfg = STATUS_CONFIG[kpi.status];
                const pct = kpi.actual_value !== null && kpi.target_value && kpi.target_value > 0
                  ? Math.round((kpi.actual_value / kpi.target_value) * 100)
                  : null;

                return (
                  <motion.div 
                    key={kpi.slug} 
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: 0.05 }}
                    className="px-4 py-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <p className="text-xs text-slate-600 font-medium truncate">{kpi.name}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {kpi.target_value !== null && (
                          <span className="text-[10px] text-slate-400">
                            /{formatValue(kpi.target_value, kpi.display_format)}
                          </span>
                        )}
                        <span className={`text-sm font-black tabular-nums ${cfg.text}`}>
                          <AnimatedNumber value={kpi.actual_value} format={kpi.display_format} />
                        </span>
                      </div>
                    </div>
                    {!compact && (
                      <ProgressBar
                        actual={kpi.actual_value}
                        target={kpi.target_value}
                        status={kpi.status}
                        higherIsBetter={kpi.higher_is_better}
                      />
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}

      {deptKeys.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-sm">
          <p className="text-slate-500 text-xs font-bold">No scorecard data yet — run compute first.</p>
        </div>
      )}
    </div>
  );
}
