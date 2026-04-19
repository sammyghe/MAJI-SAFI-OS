'use client';

import { useRouter } from 'next/navigation';
import { Droplet, Menu, LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface TopBarProps {
  onMenuClick?: () => void;
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-6 h-16 bg-[#10141a] border-b border-[#262a31]/15">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Droplet className="text-[#0077B6] w-5 h-5" fill="currentColor" />
        <h1 className="text-xl font-bold tracking-tighter text-[#0077B6] font-headline">
          Maji Safi OS
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-label text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase hidden md:block">
          System Status: Optimal
        </span>
        {user && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#95d4b3]" />
              <span className="font-label text-xs text-slate-400">{user.name}</span>
              {user.role === 'founder' && (
                <span className="text-[9px] font-label uppercase tracking-widest text-[#0077B6] bg-[#0077B6]/10 px-1.5 py-0.5">
                  Founder
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 transition-colors text-xs font-label"
              title="Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
