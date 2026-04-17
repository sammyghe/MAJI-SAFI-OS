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
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return (
    <div className="h-screen bg-[#10141a] flex items-center justify-center">
      <span className="text-xs text-slate-500">Loading...</span>
    </div>
  );
  if (!user) return null;

  return (
    <>
      <TopBar />
      <Sidebar />
      <main className="pt-16 bg-[#10141a] min-h-screen" style={{ marginLeft: 'var(--sidebar-w, 240px)' }}>
        {children}
      </main>
    </>
  );
}
