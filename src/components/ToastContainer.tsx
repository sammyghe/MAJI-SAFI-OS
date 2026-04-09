"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, Bell, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export type Toast = {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
};

let _addToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

// Imperative API for use outside React tree (e.g. from supabase callbacks)
export function showToast(toast: Omit<Toast, 'id'>) {
  _addToast?.(toast);
}

const TOAST_CONFIG = {
  info: {
    border: 'border-cyan-500/40',
    bg: 'bg-slate-900/95',
    text: 'text-cyan-100',
    bar: 'bg-cyan-500',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    Icon: Info,
    iconClass: 'text-cyan-400',
  },
  success: {
    border: 'border-emerald-500/40',
    bg: 'bg-slate-900/95',
    text: 'text-emerald-100',
    bar: 'bg-emerald-500',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    Icon: CheckCircle,
    iconClass: 'text-emerald-400',
  },
  warning: {
    border: 'border-orange-500/40',
    bg: 'bg-slate-900/95',
    text: 'text-orange-100',
    bar: 'bg-orange-500',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.2)]',
    Icon: AlertTriangle,
    iconClass: 'text-orange-400',
  },
  error: {
    border: 'border-red-500/40',
    bg: 'bg-slate-900/95',
    text: 'text-red-100',
    bar: 'bg-red-500',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.2)]',
    Icon: XCircle,
    iconClass: 'text-red-400',
  },
};

export default function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  useEffect(() => {
    _addToast = addToast;
    return () => { _addToast = null; };
  }, [addToast]);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  return (
    <div
      className="fixed top-4 right-4 z-[999] flex flex-col gap-3 w-80 pointer-events-none"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(t => {
        const cfg = TOAST_CONFIG[t.type];
        return (
          <div
            key={t.id}
            role="alert"
            className={`
              relative overflow-hidden flex items-start gap-3 p-4 rounded-2xl border 
              backdrop-blur-xl pointer-events-auto
              animate-in slide-in-from-right-8 fade-in duration-300
              ${cfg.bg} ${cfg.border} ${cfg.glow}
            `}
          >
            {/* Coloured left bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar} rounded-l-2xl`} />

            {/* Icon */}
            <cfg.Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.iconClass}`} />

            {/* Message */}
            <p className={`text-sm font-medium flex-1 leading-snug ${cfg.text}`}>
              {t.message}
            </p>

            {/* Dismiss */}
            <button
              onClick={() => remove(t.id)}
              className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Auto-dismiss progress bar */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5 overflow-hidden rounded-b-2xl">
              <div
                className={`h-full ${cfg.bar} opacity-50`}
                style={{ animation: 'toast-shrink 5s linear forwards' }}
              />
            </div>
          </div>
        );
      })}

      <style jsx>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
      `}</style>
    </div>
  );
}
