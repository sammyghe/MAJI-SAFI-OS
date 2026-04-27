'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { AlertCircle, Target, ChevronRight, Zap } from 'lucide-react';

interface FocusItem {
  type: 'issue' | 'rock' | 'compliance';
  label: string;
  sub: string;
  urgency: 'critical' | 'high' | 'medium';
  href: string;
}

interface TodaysFocusProps {
  department?: string;
  compact?: boolean;
}

const URGENCY_CONFIG = {
  critical: { dot: 'bg-red-500', text: 'text-red-600', border: 'border-red-200', bg: 'bg-red-50' },
  high:     { dot: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', bg: 'bg-amber-50' },
  medium:   { dot: 'bg-[#0077B6]', text: 'text-[#0077B6]', border: 'border-[#0077B6]/20', bg: 'bg-[#0077B6]/5' },
};

export default function TodaysFocus({ department, compact = false }: TodaysFocusProps) {
  const [items, setItems] = useState<FocusItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [department]);

  const load = async () => {
    setLoading(true);
    const focusItems: FocusItem[] = [];

    const [issueRes, rockRes, complianceRes] = await Promise.all([
      supabase
        .from('issues')
        .select('id, title, priority, stage, owner_dept')
        .eq('location_id', 'buziga')
        .in('stage', ['identified', 'discussing', 'solving'])
        .in('priority', ['critical', 'high'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(3),
      supabase
        .from('rocks')
        .select('id, title, status, quarter, owner_name')
        .eq('location_id', 'buziga')
        .in('status', ['at_risk', 'off_track'])
        .limit(2),
      supabase
        .from('compliance_records')
        .select('id, title, due_date, renewal_date')
        .eq('location_id', 'buziga')
        .eq('status', 'active')
        .lte('due_date', new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
        .gte('due_date', new Date().toISOString().slice(0, 10))
        .order('due_date')
        .limit(2),
    ]);

    // Issues
    for (const issue of issueRes.data ?? []) {
      if (department && issue.owner_dept && issue.owner_dept !== department) continue;
      focusItems.push({
        type: 'issue',
        label: issue.title,
        sub: `${issue.priority.toUpperCase()} · ${issue.stage}`,
        urgency: issue.priority as 'critical' | 'high',
        href: '/rhythm/issues',
      });
    }

    // Rocks at risk / off track
    for (const rock of rockRes.data ?? []) {
      focusItems.push({
        type: 'rock',
        label: rock.title,
        sub: `${rock.status === 'off_track' ? 'OFF TRACK' : 'AT RISK'} · ${rock.quarter}`,
        urgency: rock.status === 'off_track' ? 'high' : 'medium',
        href: '/rhythm/rocks',
      });
    }

    // Compliance deadlines (compliance dept or founders)
    if (!department || department === 'compliance' || department === 'founder-office') {
      for (const rec of complianceRes.data ?? []) {
        const due = rec.due_date ?? rec.renewal_date;
        if (!due) continue;
        const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000);
        focusItems.push({
          type: 'compliance',
          label: rec.title,
          sub: `Due in ${days} day${days !== 1 ? 's' : ''}`,
          urgency: days <= 3 ? 'critical' : 'high',
          href: '/compliance',
        });
      }
    }

    // Sort: critical first
    focusItems.sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2 };
      return order[a.urgency] - order[b.urgency];
    });

    setItems(focusItems.slice(0, compact ? 2 : 4));
    setLoading(false);
  };

  if (loading) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-1.5">
          <Zap className="w-3 h-3" />
          Today's Focus
        </p>
        <div className="flex items-center gap-3">
          <Link href="/rhythm/issues" className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
            Issues <ChevronRight className="w-2.5 h-2.5" />
          </Link>
          <Link href="/rhythm/rocks" className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
            Rocks <ChevronRight className="w-2.5 h-2.5" />
          </Link>
          <Link href="/rhythm/meeting" className="text-[10px] text-slate-600 hover:text-slate-400 flex items-center gap-0.5 transition-colors">
            Meeting <ChevronRight className="w-2.5 h-2.5" />
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2 shadow-sm transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-xs text-slate-500">No critical issues or at-risk rocks — you're clear.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, i) => {
            const cfg = URGENCY_CONFIG[item.urgency];
            const Icon = item.type === 'issue' ? AlertCircle : item.type === 'rock' ? Target : AlertCircle;
            return (
              <Link
                key={i}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 border ${cfg.border} ${cfg.bg} rounded-xl hover:opacity-90 transition-opacity`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.label}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${cfg.text}`}>{item.sub}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
