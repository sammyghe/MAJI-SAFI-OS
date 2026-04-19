'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AddAnythingButton from '@/components/AddAnythingButton';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      <TopBar onMenuClick={() => setSidebarOpen(true)} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="pt-16 bg-[#10141a] min-h-screen md:ml-[var(--sidebar-w,240px)]">
        {children}
      </main>

      <AddAnythingButton />
    </>
  );
}
