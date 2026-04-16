'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Resizable } from 're-resizable';
import {
  Users,
  Factory,
  Package,
  Zap,
  CheckCircle2,
  Truck,
  TrendingUp,
  DollarSign,
  Shield,
  Settings,
  Users2,
  FileText,
  ChevronDown,
  ChevronRight,
  Droplet,
} from 'lucide-react';

const departments = [
  {
    slug: 'founder-office',
    name: 'Founder Office',
    icon: Users,
    description: 'Strategy & Leadership',
  },
  {
    slug: 'production',
    name: 'Production',
    icon: Factory,
    description: 'Fill jars, log batches',
  },
  {
    slug: 'quality',
    name: 'Quality',
    icon: CheckCircle2,
    description: 'UNBS tests, QC',
  },
  {
    slug: 'inventory',
    name: 'Inventory',
    icon: Package,
    description: 'Stock levels, reorders',
  },
  {
    slug: 'dispatch',
    name: 'Dispatch',
    icon: Truck,
    description: 'Sales, cash collection',
  },
  {
    slug: 'marketing',
    name: 'Marketing',
    icon: TrendingUp,
    description: 'Prospects, pipeline',
  },
  {
    slug: 'finance',
    name: 'Finance',
    icon: DollarSign,
    description: 'P&L, cash, ledger',
  },
  {
    slug: 'compliance',
    name: 'Compliance',
    icon: Shield,
    description: 'UNBS, HR, legal',
  },
  {
    slug: 'technology',
    name: 'Technology',
    icon: Zap,
    description: 'System health, logs',
  },
];

const moreItems = [
  { slug: 'settings', name: 'Settings', icon: Settings },
  { slug: 'team', name: 'Team', icon: Users2 },
  { slug: 'audit-log', name: 'Audit Log', icon: FileText },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [width, setWidth] = useState(240);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load sidebar width from localStorage
  useEffect(() => {
    setMounted(true);
    const savedWidth = localStorage.getItem('maji-safi.sidebarWidth');
    if (savedWidth) {
      setWidth(parseInt(savedWidth, 10));
    }
  }, []);

  // Save sidebar width to localStorage
  const handleResizeStop = (_e: any, _direction: string, _ref: any, delta: any) => {
    const newWidth = width + delta.width;
    setWidth(newWidth);
    localStorage.setItem('maji-safi.sidebarWidth', newWidth.toString());
  };

  if (!mounted) return null;

  // Hide sidebar on /login
  if (pathname === '/login') {
    return null;
  }

  const getDepartmentPath = (slug: string) => {
    if (slug === 'settings') return '/settings';
    if (slug === 'team') return '/compliance/team';
    if (slug === 'audit-log') return '/compliance/audit-log';
    return `/${slug}`;
  };

  const isActiveDept = (slug: string) => {
    const deptPath = getDepartmentPath(slug);
    return pathname.startsWith(deptPath);
  };

  return (
    <Resizable
      defaultSize={{
        width: width,
        height: '100vh',
      }}
      minWidth={200}
      maxWidth="33.33vw"
      enable={{
        right: true,
        left: false,
        top: false,
        bottom: false,
        topRight: false,
        bottomRight: false,
        topLeft: false,
        bottomLeft: false,
      }}
      onResizeStop={handleResizeStop}
      className="fixed left-0 top-0 h-full z-40 bg-zinc-950 border-r border-zinc-800 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-6 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <Droplet className="w-5 h-5 text-[#0077B6]" />
          <h1 className="text-lg font-bold text-white font-headline">Maji Safi</h1>
        </div>
        <p className="text-xs text-zinc-400 font-label">Hydrate. Elevate.</p>
      </div>

      {/* Primary Departments */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-3 mb-4">
          Departments
        </p>

        {departments.map((dept) => {
          const Icon = dept.icon;
          const isActive = isActiveDept(dept.slug);

          return (
            <Link
              key={dept.slug}
              href={getDepartmentPath(dept.slug)}
              className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-150 relative group ${
                isActive
                  ? 'text-white bg-zinc-800/50'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0077B6] rounded-r-sm" />
              )}
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-label tracking-wide">{dept.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* More Section */}
      <div className="border-t border-zinc-800 px-3 py-4">
        <button
          onClick={() => setIsMoreOpen(!isMoreOpen)}
          className="flex items-center gap-3 w-full px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/30 rounded-sm transition-colors text-sm font-label"
        >
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex-1 text-left">
            More
          </span>
          {isMoreOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {isMoreOpen && (
          <div className="mt-2 space-y-1">
            {moreItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveDept(item.slug);

              return (
                <Link
                  key={item.slug}
                  href={getDepartmentPath(item.slug)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-sm transition-all duration-150 relative group ${
                    isActive
                      ? 'text-white bg-zinc-800/50'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/30'
                  }`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#0077B6] rounded-r-sm" />
                  )}
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-label tracking-wide">{item.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Resize Handle Indicator */}
      <div className="absolute right-0 top-0 bottom-0 w-1 hover:bg-[#0077B6]/30 cursor-col-resize transition-colors" />
    </Resizable>
  );
}
