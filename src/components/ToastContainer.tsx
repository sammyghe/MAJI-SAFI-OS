"use client";

import { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export type Toast = {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
};

let _addToast: ((toast: Omit<Toast, 'id'>) => void) | null = null;

export function showToast(toast: Omit<Toast, 'id'>) {
  _addToast?.(toast);
}

const TOAST_CONFIG = {
  info:    { bar: '#0077B6', icon: Info,          iconColor: '#0077B6', label: 'bg-blue-50   text-blue-700'   },
  success: { bar: '#10B981', icon: CheckCircle,   iconColor: '#10B981', label: 'bg-emerald-50 text-emerald-700' },
  warning: { bar: '#F59E0B', icon: AlertTriangle, iconColor: '#F59E0B', label: 'bg-amber-50   text-amber-700'  },
  error:   { bar: '#EF4444', icon: XCircle,       iconColor: '#EF4444', label: 'bg-red-50     text-red-700'    },
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
        const Icon = cfg.icon;
        return (
          <div
            key={t.id}
            role="alert"
            className="toast relative overflow-hidden flex items-start gap-3 p-4 pointer-events-auto"
            style={{ animation: 'slideInDown 0.3s ease-out' }}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: cfg.bar }} />

            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${cfg.bar}15` }}>
              <Icon className="w-4 h-4" style={{ color: cfg.iconColor }} />
            </div>

            <p className="text-sm font-medium flex-1 leading-snug text-slate-800 mt-1">
              {t.message}
            </p>

            <button
              onClick={() => remove(t.id)}
              className="opacity-40 hover:opacity-80 transition-opacity flex-shrink-0 mt-1"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4 text-slate-600" />
            </button>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-2xl" style={{ background: 'rgba(0,0,0,0.05)' }}>
              <div
                className="h-full"
                style={{ background: cfg.bar, opacity: 0.4, animation: 'toast-shrink 5s linear forwards' }}
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
