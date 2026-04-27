'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Activity, Search, User } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

const TABS = [
  { href: '/home',   label: 'Home',      icon: Home },
  { href: '/pulse',  label: 'Pulse',     icon: Activity },
  { href: '/search', label: 'Search',    icon: Search },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || pathname === '/login' || pathname === '/galaxy') return null;

  const homePath = user?.landing_page ?? '/home';

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 py-2 pb-safe"
      style={{
        background: 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 -8px 32px rgba(15,40,69,0.10)',
        minHeight: 64,
      }}
    >
      {[
        { href: homePath, label: 'Home', icon: Home },
        { href: '/pulse', label: 'Pulse', icon: Activity },
        { href: '/search', label: 'Search', icon: Search },
        { href: '/settings', label: 'Profile', icon: User },
      ].map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-1 transition-all"
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-colors ${active ? 'text-[#0077B6]' : 'text-slate-400'}`} />
              {active && (
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#0077B6]" />
              )}
            </div>
            <span className={`text-[10px] font-semibold transition-colors ${active ? 'text-[#0077B6]' : 'text-slate-400'}`}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
