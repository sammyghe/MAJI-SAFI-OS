'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = 'max-w-md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,28,46,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-3xl shadow-2xl w-full ${maxWidth} overflow-hidden`}
        style={{ animation: 'scaleIn 0.18s ease-out' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-8 pb-0">
          <div>
            <h2 className="text-xl font-black text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{title}</h2>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all flex-shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {children}
        </div>
      </div>
    </div>
  );
}

/* Shared form field styles — import alongside Modal and use in forms */
export function ModalField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}

/* Solid white input for use inside modals */
export const modalInputClass =
  'w-full bg-white border-2 border-slate-200 text-slate-900 placeholder-slate-400 py-3 px-4 rounded-xl focus:border-[#0077B6] focus:ring-4 focus:ring-[#0077B6]/15 outline-none transition-all text-sm font-medium';
