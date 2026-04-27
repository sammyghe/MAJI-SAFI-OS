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
  'Jars Today':      '↑ Log first batch',
  'Revenue Today':   '↑ Record first sale',
  'Team Present':    '↑ Start a shift',
  'QC Pass Rate':    '↑ Run first test',
  'Low Stock Items': 'All good',
  'Open Issues':     'All clear',
  'Machine Status':  'Online',
};

export default function RoleKpiCard({
  label, value, icon: Icon, ok, role, trend, context,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
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
      whileHover={{ y: -3, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="glass-card p-6 cursor-default min-h-[160px] flex flex-col justify-between"
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${accent}30, ${accent}10)`, backdropFilter: 'blur(8px)' }}
        >
          <Icon className="w-6 h-6" style={{ color: accent }} />
        </div>
        <div className="flex items-center gap-1.5">
          {trend && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm ${
              trend.startsWith('+') ? 'bg-emerald-100/70 text-emerald-700' : 'bg-red-100/70 text-red-600'
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
            <p className="text-4xl font-black text-slate-300 tabular-nums leading-none">—</p>
            <p className="text-xs font-semibold mt-1" style={{ color: accent }}>{cta}</p>
          </div>
        ) : (
          <p className="text-4xl font-black text-slate-900 tabular-nums leading-none tracking-tight">{value}</p>
        )}
        <p className="text-sm text-slate-600 mt-2 font-medium">{label}</p>
        {context && (
          <div className="mt-3 pt-3 border-t border-slate-200/60">
            <p className="text-xs text-slate-400">{context}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
