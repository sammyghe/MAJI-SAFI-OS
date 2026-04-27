'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Resizable } from 're-resizable';
import { useAuth } from '@/components/AuthProvider';
import {
  Users, Factory, Package, Zap, Search, BookOpen, GitBranch,
  CheckCircle2, Truck, TrendingUp, DollarSign, Shield, Settings,
  Users2, FileText, ChevronDown, ChevronRight, BarChart2, ShoppingCart,
  FlaskConical, Bot, Activity, Lock, Home, Globe2, BarChart3, CalendarClock,
  Zap as ZapIcon,
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
  { slug: 'rhythm/rocks',              name: 'Rocks',         icon: BarChart2 },
  { slug: 'rhythm/issues',             name: 'Issues',        icon: Activity },
  { slug: 'rhythm/meeting',            name: 'Level 10',      icon: Users2 },
  { slug: 'finance/scenarios',         name: 'Scenarios',     icon: FlaskConical },
  { slug: 'search',                    name: 'Search',        icon: Search },
  { slug: 'strategy/business-plan',   name: 'Business Plan', icon: BookOpen,     founderOnly: true },
  { slug: 'strategy/data-flow',        name: 'Data Flow',     icon: GitBranch,    founderOnly: true },
  { slug: 'my-work',                   name: 'My Work',       icon: BarChart3 },
  { slug: 'galaxy',                    name: 'Galaxy Map',    icon: Globe2 },
  { slug: 'admin/shifts',              name: 'Shifts',        icon: CalendarClock, managerOnly: true },
  { slug: 'admin/action-rules',        name: 'Action Rules',  icon: ZapIcon,       managerOnly: true },
  { slug: 'settings',                  name: 'Settings',      icon: Settings },
  { slug: 'team',                      name: 'Team',          icon: Users2 },
  { slug: 'finance/audit',             name: 'Audit Log',     icon: FileText },
  { slug: 'settings/team-roles',       name: 'Team Roles',    icon: Users2,       founderOnly: true },
  { slug: 'settings/simulation',       name: 'Simulation',    icon: FlaskConical, founderOnly: true },
  { slug: 'settings/souls',            name: 'AI Souls',      icon: Bot,          founderOnly: true },
  { slug: 'settings/ai-health',        name: 'AI Health',     icon: Activity,     founderOnly: true },
  { slug: 'settings/security',         name: 'Security',      icon: Lock,         founderOnly: true },
];

interface SidebarProps { isOpen: boolean; onClose: () => void; }

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
    if (slug.includes('/')) return `/${slug}`;
    return `/${slug}`;
  };

  const isActive = (slug: string) => pathname.startsWith(getDepartmentPath(slug));

  const userSidebarItems: string[] = user?.sidebar_items ?? [];
  const hasRoleFilter = userSidebarItems.length > 0;

  const visibleDepts = ALL_DEPARTMENTS.filter((dept) => {
    if (!user) return true;
    if (hasRoleFilter) return userSidebarItems.includes(dept.slug);
    if (user.role === 'founder') return true;
    const userDepts: string[] = [...(user.departments ?? []), user.department_slug].filter(Boolean);
    return userDepts.includes(dept.slug);
  });

  const showHome = hasRoleFilter && userSidebarItems.includes('home');
  const homePath = user?.landing_page ?? '/home';

  const navItem = (slug: string, label: string, Icon: React.ComponentType<{ className?: string }>) => {
    const active = isActive(slug);
    return (
      <Link
        key={slug}
        href={getDepartmentPath(slug)}
        onClick={onClose}
        className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all duration-150 rounded-lg mx-2 ${
          active
            ? 'bg-[#0077B6]/8 text-[#0077B6] font-semibold border-l-[3px] border-[#0077B6] pl-[13px] rounded-l-none'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        <Icon className="w-[15px] h-[15px] flex-shrink-0" />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div
      className={`fixed top-16 left-0 z-40 h-[calc(100vh-64px)] transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
    >
      <Resizable
        defaultSize={{ width, height: '100%' }}
        minWidth={200}
        maxWidth="33.33vw"
        enable={{ right: true, left: false, top: false, bottom: false, topRight: false, bottomRight: false, topLeft: false, bottomLeft: false }}
        onResizeStop={handleResizeStop}
        style={{ height: '100%' }}
      >
        <nav className="h-full bg-white border-r border-slate-200 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto py-5 space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-6 mb-3">
              Navigation
            </p>

            {showHome && (
              <Link
                href={homePath}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium transition-all duration-150 rounded-lg mx-2 ${
                  pathname === homePath || pathname.startsWith('/home')
                    ? 'bg-[#0077B6]/8 text-[#0077B6] font-semibold border-l-[3px] border-[#0077B6] pl-[13px] rounded-l-none'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Home className="w-[15px] h-[15px]" />
                <span>Home</span>
              </Link>
            )}

            {visibleDepts.map((dept) => navItem(dept.slug, dept.name, dept.icon))}

            {user?.role === 'founder' && (
              <a
                href="/investor"
                target="_blank"
                rel="noreferrer"
                onClick={onClose}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all rounded-lg mx-2"
              >
                <BarChart2 className="w-[15px] h-[15px]" />
                <span>Investor View</span>
              </a>
            )}
          </div>

          {/* More section */}
          <div className="border-t border-slate-200 px-2 py-3 flex-shrink-0">
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors text-xs font-semibold uppercase tracking-widest rounded-lg"
            >
              <span className="flex-1 text-left">More</span>
              {isMoreOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
            {isMoreOpen && (
              <div className="mt-1 space-y-0.5">
                {moreItems
                  .filter((item) => {
                    if ('founderOnly' in item && item.founderOnly) return user?.role === 'founder';
                    if ('managerOnly' in item && item.managerOnly) return user?.role === 'founder' || user?.role_slug === 'operations_manager';
                    return true;
                  })
                  .map((item) => navItem(item.slug, item.name, item.icon))}
              </div>
            )}
          </div>
        </nav>
      </Resizable>
    </div>
  );
}
