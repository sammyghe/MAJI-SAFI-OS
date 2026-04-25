'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Resizable } from 're-resizable';
import { useAuth } from '@/components/AuthProvider';
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
  BarChart2,
  ShoppingCart,
  FlaskConical,
  Bot,
  Activity,
  Lock,
  Home,
} from 'lucide-react';

const ALL_DEPARTMENTS = [
  { slug: 'founder-office', name: 'Founder Office', icon: Users },
  { slug: 'production',     name: 'Production',     icon: Factory },
  { slug: 'quality',        name: 'Quality',         icon: CheckCircle2 },
  { slug: 'inventory',      name: 'Inventory',       icon: Package },
  { slug: 'dispatch',       name: 'Dispatch',        icon: Truck },
  { slug: 'sales',          name: 'Sales',           icon: ShoppingCart },
  { slug: 'marketing',      name: 'Marketing',       icon: TrendingUp },
  { slug: 'finance',        name: 'Finance',         icon: DollarSign },
  { slug: 'compliance',     name: 'Compliance',      icon: Shield },
  { slug: 'technology',     name: 'Technology',      icon: Zap },
];

const moreItems = [
  { slug: 'settings',             name: 'Settings',    icon: Settings },
  { slug: 'team',                 name: 'Team',        icon: Users2 },
  { slug: 'audit-log',            name: 'Audit Log',   icon: FileText },
  { slug: 'settings/simulation',  name: 'Simulation',  icon: FlaskConical, founderOnly: true },
  { slug: 'settings/souls',       name: 'AI Souls',    icon: Bot,          founderOnly: true },
  { slug: 'settings/ai-health',   name: 'AI Health',   icon: Activity,     founderOnly: true },
  { slug: 'settings/security',    name: 'Security',    icon: Lock,         founderOnly: true },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [width, setWidth] = useState(240);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedWidth = localStorage.getItem('maji-safi.sidebarWidth');
    if (savedWidth) {
      const w = parseInt(savedWidth, 10);
      setWidth(w);
      document.documentElement.style.setProperty('--sidebar-w', `${w}px`);
    } else {
      document.documentElement.style.setProperty('--sidebar-w', '240px');
    }
  }, []);

  const handleResizeStop = (_e: any, _direction: string, _ref: any, delta: any) => {
    const newWidth = width + delta.width;
    setWidth(newWidth);
    localStorage.setItem('maji-safi.sidebarWidth', newWidth.toString());
    document.documentElement.style.setProperty('--sidebar-w', `${newWidth}px`);
  };

  if (!mounted) return null;
  if (pathname === '/login') return null;

  const getDepartmentPath = (slug: string) => {
    if (slug === 'settings') return '/settings';
    if (slug === 'team') return '/compliance/team';
    if (slug === 'audit-log') return '/compliance/audit-log';
    if (slug.includes('/')) return `/${slug}`;
    return `/${slug}`;
  };

  const isActiveDept = (slug: string) => {
    const deptPath = getDepartmentPath(slug);
    return pathname.startsWith(deptPath);
  };

  // Role-based sidebar items filtering
  const userSidebarItems: string[] = user?.sidebar_items ?? [];
  const hasRoleFilter = userSidebarItems.length > 0;

  const visibleDepts = ALL_DEPARTMENTS.filter((dept) => {
    if (!user) return true;
    // Role-based: only show depts listed in sidebar_items
    if (hasRoleFilter) return userSidebarItems.includes(dept.slug);
    // Legacy fallback: founder sees all, others see own departments
    if (user.role === 'founder') return true;
    const userDepts: string[] = [
      ...(user.departments ?? []),
      user.department_slug,
    ].filter(Boolean);
    return userDepts.includes(dept.slug);
  });

  const showHome = hasRoleFilter && userSidebarItems.includes('home');
  const homePath = user?.landing_page ?? '/home';

  return (
    <div
      className={`fixed top-16 left-0 z-40 h-[calc(100vh-64px)] transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      <Resizable
        defaultSize={{ width: width, height: '100%' }}
        minWidth={200}
        maxWidth="33.33vw"
        enable={{
          right: true,
          left: false, top: false, bottom: false,
          topRight: false, bottomRight: false, topLeft: false, bottomLeft: false,
        }}
        onResizeStop={handleResizeStop}
        style={{ height: '100%' }}
      >
        <nav className="h-full bg-zinc-950 border-r border-[#262a31]/30 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-3 py-6 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-3 mb-6">
              Navigation
            </p>

            {/* Home link — shown when role has 'home' in sidebar_items */}
            {showHome && (
              <Link
                href={homePath}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 relative ${
                  pathname === homePath || pathname.startsWith('/home')
                    ? 'text-[#0077B6] font-semibold border-r-2 border-[#0077B6] bg-[#262a31]/30'
                    : 'text-slate-500 hover:text-slate-200 hover:bg-[#262a31]/20'
                }`}
              >
                <Home className="w-[15px] h-[15px] flex-shrink-0" />
                <span className="text-sm font-label tracking-wide">Home</span>
              </Link>
            )}

            {visibleDepts.map((dept) => {
              const Icon = dept.icon;
              const isActive = isActiveDept(dept.slug);

              return (
                <Link
                  key={dept.slug}
                  href={getDepartmentPath(dept.slug)}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 relative ${
                    isActive
                      ? 'text-[#0077B6] font-semibold border-r-2 border-[#0077B6] bg-[#262a31]/30'
                      : 'text-slate-500 hover:text-slate-200 hover:bg-[#262a31]/20'
                  }`}
                >
                  <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                  <span className="text-sm font-label tracking-wide">{dept.name}</span>
                </Link>
              );
            })}

            {/* Investor link — founders only */}
            {user?.role === 'founder' && (
              <a
                href="/investor"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 transition-all duration-150 text-slate-500 hover:text-slate-200 hover:bg-[#262a31]/20"
              >
                <BarChart2 className="w-[15px] h-[15px] flex-shrink-0" />
                <span className="text-sm font-label tracking-wide">Investor View</span>
              </a>
            )}
          </div>

          {/* More Section */}
          <div className="border-t border-[#262a31]/30 px-3 py-4 flex-shrink-0">
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="flex items-center gap-3 w-full px-3 py-2 text-slate-500 hover:text-slate-200 hover:bg-[#262a31]/20 transition-colors text-sm font-label"
            >
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] flex-1 text-left">
                More
              </span>
              {isMoreOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {isMoreOpen && (
              <div className="mt-2 space-y-1">
                {moreItems
                  .filter((item) => !('founderOnly' in item && item.founderOnly) || user?.role === 'founder')
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = isActiveDept(item.slug);

                    return (
                      <Link
                        key={item.slug}
                        href={getDepartmentPath(item.slug)}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 transition-all duration-150 relative ${
                          isActive
                            ? 'text-[#0077B6] font-semibold border-r-2 border-[#0077B6] bg-[#262a31]/30'
                            : 'text-slate-500 hover:text-slate-200 hover:bg-[#262a31]/20'
                        }`}
                      >
                        <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                        <span className="text-sm font-label tracking-wide">{item.name}</span>
                      </Link>
                    );
                  })}
              </div>
            )}
          </div>
        </nav>
      </Resizable>
    </div>
  );
}
