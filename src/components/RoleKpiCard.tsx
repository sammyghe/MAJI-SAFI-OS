'use client';

import { motion } from 'framer-motion';

const ACCENT_COLOR: Record<string, string> = {
  founder: '#FFD700',
  manager: '#0077B6',
  operator: '#94a3b8',
  delivery: '#f97316',
  marketing: '#ec4899',
  compliance: '#10b981',
};

const EMPTY_HINT: Record<string, string> = {
  'Jars Today': 'Log first batch',
  'Revenue Today': 'Add first sale',
  'Team Present': 'No active sessions',
  'Open Issues': '',
  'QC Pass Rate': 'Run first test',
  'Low Stock Items': '',
  'Machine Status': '',
};

export default function RoleKpiCard({ label, value, icon: Icon, ok, role }: any) {
  const accent = ACCENT_COLOR[role as string] ?? '#0077B6';
  const isEmpty = value === '0' || value === 'No tests' || value === '—';
  const hint = isEmpty ? EMPTY_HINT[label as string] : '';

  return (
    <motion.div
      whileHover={{ scale: 1.02, boxShadow: `0 0 20px ${accent}33` }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      style={{ borderLeft: `4px solid ${accent}` }}
      className="bg-white dark:bg-[#1A2541] border-y border-r border-zinc-200 dark:border-[#2A3A5C] rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors duration-200 min-h-[140px] flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="p-2 rounded-xl"
          style={{ background: `${accent}18`, filter: `drop-shadow(0 0 6px ${accent}44)` }}
        >
          <Icon style={{ width: 20, height: 20, color: accent }} />
        </div>
        <span
          className={`w-2.5 h-2.5 rounded-full mt-1 ${ok ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500 dark:bg-amber-400'}`}
          style={{ boxShadow: ok ? '0 0 6px rgba(52,211,153,0.5)' : '0 0 6px rgba(245,158,11,0.5)' }}
        />
      </div>

      <div>
        {isEmpty && hint ? (
          <div>
            <p className="text-3xl font-black text-zinc-300 dark:text-white/30 tabular-nums leading-none">0</p>
            <p className="text-[10px] mt-1 font-semibold" style={{ color: accent }}>↑ {hint}</p>
          </div>
        ) : (
          <p className="text-4xl font-black text-zinc-900 dark:text-white tabular-nums leading-none" style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
            {value}
          </p>
        )}
        <p className="text-[10px] text-zinc-500 dark:text-slate-400 uppercase tracking-widest mt-2">{label}</p>
      </div>
    </motion.div>
  );
}
