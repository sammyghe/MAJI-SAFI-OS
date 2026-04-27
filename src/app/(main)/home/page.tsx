'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export default function HomeRouter() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push('/login'); return; }
    const dest = user.landing_page ?? '/home/founder';
    // Avoid infinite loop — only redirect if not already on landing_page
    if (typeof window !== 'undefined' && window.location.pathname !== dest) {
      router.replace(dest);
    }
  }, [user, loading, router]);

  return (
    <div className="h-screen bg-white dark:bg-[#10141a] flex items-center justify-center transition-colors">
      <span className="text-xs text-zinc-400 dark:text-slate-500 animate-pulse">Loading your office…</span>
    </div>
  );
}
