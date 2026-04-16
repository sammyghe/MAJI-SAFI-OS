'use client';

import { Droplet } from 'lucide-react';
import { useAuth } from './AuthProvider';

export default function TopBar() {
  const { user } = useAuth();

  return (
    <header className="fixed top-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-[#10141a] border-b border-[#262a31]/15">
      <div className="flex items-center gap-3">
        <Droplet className="text-[#0077B6] w-5 h-5" fill="currentColor" />
        <h1 className="text-xl font-bold tracking-tighter text-[#0077B6] font-headline">
          Maji Safi OS
        </h1>
      </div>
      <div className="flex items-center gap-6">
        <span className="font-label text-[10px] font-medium text-slate-500 tracking-[0.2em] uppercase hidden md:block">
          System Status: Optimal
        </span>
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#95d4b3]" />
            <span className="font-label text-xs text-slate-400">{user.name}</span>
          </div>
        )}
      </div>
    </header>
  );
}
