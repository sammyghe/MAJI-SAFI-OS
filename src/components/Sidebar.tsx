"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Package,
  Wallet,
  Droplets,
  ChevronRight,
  Beaker,
  Truck,
  Box,
  Scale,
  MessageCircle,
  Cog,
  Smartphone
} from 'lucide-react';

const DEPT_COLORS: Record<string, string> = {
  '/':                       '#7F77DD',
  '/suppliers':              '#0077B6',
  '/pulse':                  '#8B5CF6',
  '/department/operations':  '#0077B6',
  '/department/quality':     '#00B4D8',
  '/department/sales':       '#0096C7',
  '/department/inventory':   '#48CAE4',
  '/department/finance':     '#023E8A',
  '/department/compliance':  '#03045E',
  '/settings':               '#5483B3',
};

const navGroups = [
  {
    label: "Intelligence",
    items: [
      { name: 'Global Overview', href: '/', icon: LayoutDashboard },
      { name: 'Supply Chain',   href: '/suppliers', icon: Truck },
      { name: 'Pulse',          href: '/pulse', icon: MessageCircle, badge: 'Live' },
    ]
  },
  {
    label: "Sectors",
    items: [
      { name: 'Operations',  href: '/department/operations',  icon: Settings },
      { name: 'Quality',     href: '/department/quality',     icon: Beaker },
      { name: 'Sales',       href: '/department/sales',       icon: Truck },
      { name: 'Inventory',   href: '/department/inventory',   icon: Box },
      { name: 'Finance',     href: '/department/finance',     icon: Wallet },
      { name: 'Compliance',  href: '/department/compliance',  icon: Scale },
    ]
  },
  {
    label: "Admin",
    items: [
      { name: 'Settings',    href: '/settings', icon: Cog },
    ]
  }
];


export default function Sidebar() {
  const pathname = usePathname();
  const [search, setSearch] = useState('');
  const [showInstallToast, setShowInstallToast] = useState(false);

  useEffect(() => {
    setSearch(window.location.search);
  }, []);

  const handleInstall = () => {
    // Navigate to settings page for full PWA install UX
    window.location.href = '/settings#install';
  };

  return (
    <aside className="w-72 flex-shrink-0 border-r border-white/5 bg-brand-deep/40 backdrop-blur-3xl hidden md:flex flex-col h-full sticky top-0 relative z-20">
      {/* Brand Header */}
      <div className="p-8 pb-4">
        <Link href="/" className="flex items-center gap-4 group">
          <div className="p-3 bg-gradient-to-br from-brand-steel to-brand-navy rounded-2xl shadow-lg group-hover:shadow-brand-sky/20 transition-all duration-500">
            <Droplets className="w-7 h-7 text-brand-pale animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">
              MajiSafi<span className="text-brand-sky">OS</span>
            </h1>
            <p className="text-[10px] font-bold text-brand-steel tracking-widest uppercase">Pure Productivity</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-3">
            <p className="px-4 text-[11px] font-black text-brand-steel uppercase tracking-[0.2em]">
              {group.label}
            </p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.name === 'Operations' &&
                    pathname.startsWith('/department') &&
                    !pathname.includes('compliance') &&
                    !pathname.includes('hr'));

                const accentColor = DEPT_COLORS[item.href] ?? '#5483B3';
                const hrefWithParams = `${item.href}${search}`;

                return (
                  <Link
                    key={item.name}
                    href={hrefWithParams}
                    className={`glass-nav-item flex items-center justify-between px-4 py-3 rounded-2xl font-semibold text-sm group ${
                      isActive ? 'active' : 'text-brand-steel hover:text-white'
                    }`}
                    style={isActive ? { borderLeftColor: accentColor, borderLeftWidth: '2px', borderLeftStyle: 'solid' } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon
                        className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-brand-pale' : 'opacity-60'}`}
                        style={isActive ? { color: accentColor } : {}}
                      />
                      {item.name}
                    </div>
                    <div className="flex items-center gap-2">
                      {'badge' in item && item.badge && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          {item.badge}
                        </span>
                      )}
                      {isActive && <ChevronRight className="w-4 h-4 text-brand-pale" />}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Install App Button */}
      <div className="px-6 pb-3">
        <button
          onClick={handleInstall}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-brand-steel hover:text-white hover:bg-white/5 transition-all duration-300 text-sm font-semibold group"
        >
          <Smartphone className="w-5 h-5 opacity-60 group-hover:opacity-100 transition-opacity" />
          Install App
        </button>
      </div>

      {/* Footer Profile */}
      <div className="p-6 mt-auto border-t border-white/5">
        <div className="glass-panel p-4 rounded-3xl flex items-center gap-3 bg-white/5 border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-steel to-brand-navy border border-white/20 flex items-center justify-center text-white font-bold shadow-inner">
            MS
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white truncate">System Admin</p>
            <p className="text-[10px] text-brand-steel font-bold truncate">sammy@gmail.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
