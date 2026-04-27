'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import AddAnythingButton from '@/components/AddAnythingButton';
import AskSAFI from '@/components/AskSAFI';
import SimulationBanner from '@/components/SimulationBanner';
import GalaxyFloatingButton from '@/components/GalaxyFloatingButton';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading) return (
    <div className="h-screen bg-white flex items-center justify-center">
      <span className="text-xs text-slate-400">Loading...</span>
    </div>
  );
  if (!user) return null;

  // Large-density roles (operator, delivery) get full-screen layout — no sidebar
  const isLargeDensity = user.ui_density === 'large';

  const getRoleGradient = (role: string) => {
    if (!pathname.startsWith('/home')) return '';
    switch (role) {
      case 'founder': return 'linear-gradient(to bottom right, rgba(10, 22, 40, 0.5), rgba(255, 215, 0, 0.08) 80%)';
      case 'manager': return 'linear-gradient(to bottom right, rgba(0, 119, 182, 0.1), rgba(126, 200, 227, 0.08))';
      case 'operator': return 'linear-gradient(to bottom right, rgba(0, 119, 182, 0.1), rgba(0, 0, 0, 0.2))';
      case 'delivery': return 'linear-gradient(to bottom right, rgba(0, 119, 182, 0.1), rgba(251, 146, 60, 0.08))';
      case 'marketing': return 'linear-gradient(to bottom right, rgba(124, 58, 237, 0.08), rgba(236, 72, 153, 0.08))';
      case 'compliance': return 'linear-gradient(to bottom right, rgba(22, 163, 74, 0.08), rgba(202, 138, 4, 0.08))';
      default: return '';
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 z-[-1] pointer-events-none" 
        style={{ background: getRoleGradient(user.role) }}
      />
      <TopBar onMenuClick={() => setSidebarOpen(true)} />
      <SimulationBanner />

      {!isLargeDensity && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {!isLargeDensity && (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      <main className={`pt-16 bg-transparent min-h-screen ${isLargeDensity ? '' : 'md:ml-[var(--sidebar-w,240px)]'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <AddAnythingButton />
      <AskSAFI />
      <GalaxyFloatingButton />
    </>
  );
}
