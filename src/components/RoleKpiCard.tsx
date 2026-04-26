'use client';

import { motion } from 'framer-motion';

const ROLE_ACCENT: Record<string, string> = {
  founder:    '#FFD700',
  manager:    '#0077B6',
  operator:   '#10B981',
  delivery:   '#6366F1',
  marketing:  '#EC4899',
  compliance: '#F59E0B',
};

const EMPTY_CTA: Record<string, string> = {
  'Jars Today':     '↑ Log first batch',
  'Revenue Today':  '↑ Record first sale',
  'Team Present':   '↑ Start a shift',
  'QC Pass Rate':   '↑ Run first test',
  'Low Stock Items':'All good',
  'Open Issues':    'All clear',
  'Machine Status': 'Online',
};

export default function RoleKpiCard({
  label, value, icon: Icon, ok, role, trend, context,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  ok: boolean;
  role: string;
  trend?: string;
  context?: string;
}) {
  const accent = ROLE_ACCENT[role] ?? '#0077B6';
  const isEmpty = value === '0' || value === 'No tests' || value === '—' || value === 'UGX 0K';
  const cta = isEmpty ? (EMPTY_CTA[label] ?? '') : '';

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: `0 12px 32px rgba(0,0,0,0.10)` }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm cursor-default min-h-[160px] flex flex-col justify-between"
      style={{ borderLeft: `4px solid ${accent}` }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${accent}18` }}
        >
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        <div className="flex items-center gap-1.5">
          {trend && (
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
            }`}>
              {trend}
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        </div>
      </div>

      {/* Value */}
      <div className="mt-4">
        {isEmpty && cta ? (
          <div>
            <p className="text-4xl font-black text-slate-200 tabular-nums leading-none">—</p>
            <p className="text-xs font-semibold mt-1" style={{ color: accent }}>{cta}</p>
          </div>
        ) : (
          <p className="text-4xl font-black text-slate-900 tabular-nums leading-none">{value}</p>
        )}
        <p className="text-sm text-slate-500 mt-2 font-medium">{label}</p>
        {context && <p className="text-xs text-slate-400 mt-0.5">{context}</p>}
      </div>
    </motion.div>
  );
}
