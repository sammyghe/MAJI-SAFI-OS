'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Globe2 } from 'lucide-react';

export default function GalaxyFloatingButton() {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  // Show only for founders and managers
  if (user.role !== 'founder' && user.role !== 'operations_manager') return null;

  // Don't show on the galaxy page itself
  if (pathname === '/galaxy') return null;

  return (
    <Link 
      href="/galaxy"
      className="fixed bottom-24 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#0077B6] rounded-full shadow-[0_0_20px_rgba(0,119,182,0.6)] hover:shadow-[0_0_30px_rgba(0,119,182,0.9)] hover:scale-105 transition-all duration-300"
      title="View Galaxy Map"
    >
      <Globe2 className="w-6 h-6 text-white" />
    </Link>
  );
}
