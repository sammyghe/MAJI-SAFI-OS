'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="h-screen bg-[#10141a] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0077B6] animate-pulse" />
          <span className="text-xs text-slate-500 font-label tracking-widest uppercase">
            Loading
          </span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen bg-[#10141a]">
      <TopBar />
      <Sidebar />
      <main
        className="min-h-screen overflow-auto bg-[#10141a]"
        style={{ paddingTop: '64px', paddingLeft: 'var(--sidebar-w, 240px)' }}
      >
        {children}
      </main>
    </div>
  );
}
