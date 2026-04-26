'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';

const ROLE_COLORS: Record<string, string> = {
  founder:    '#FFD700',
  manager:    '#0077B6',
  operator:   '#10B981',
  delivery:   '#6366F1',
  marketing:  '#EC4899',
  compliance: '#F59E0B',
};

function Clock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="hidden md:block text-sm font-semibold text-slate-400 tabular-nums tracking-wide">
      {time}
    </span>
  );
}

interface TopBarProps { onMenuClick?: () => void; }

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const accent = ROLE_COLORS[user?.role ?? ''] ?? '#0077B6';

  const handleLogout = () => { logout(); router.push('/login'); };

  return (
    <header className="fixed top-0 w-full z-50 flex items-center justify-between px-4 md:px-6 h-16 bg-white border-b border-slate-200 shadow-sm">
      {/* Left — logo + menu */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-700 transition-colors rounded-lg hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <img src="/maji-safi-logo.png?v=2" alt="Maji Safi" className="w-8 h-8 object-contain" />
        <span className="font-black text-xl tracking-tight text-[#0077B6]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Maji Safi OS
        </span>
      </div>

      {/* Center — clock */}
      <Clock />

      {/* Right — user */}
      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="hidden md:flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-slate-600">{user.name}</span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: `${accent}18`, color: accent }}
              >
                {user.role}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors text-sm font-medium p-2 rounded-lg hover:bg-slate-100"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
