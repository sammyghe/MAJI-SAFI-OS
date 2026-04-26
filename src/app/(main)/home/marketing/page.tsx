'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { TrendingUp, Users2, CheckCircle2, AlertTriangle, Plus, ArrowRight } from 'lucide-react';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';

type PipelineStage = 'lead' | 'contacted' | 'qualified' | 'converted';

interface Prospect {
  id: string;
  name: string;
  zone: string | null;
  status: PipelineStage;
  last_contact_date: string | null;
}

const STAGES: { key: PipelineStage; label: string; color: string }[] = [
  { key: 'lead',      label: 'Lead',      color: '#94A3B8' },
  { key: 'contacted', label: 'Contacted', color: '#0077B6' },
  { key: 'qualified', label: 'Qualified', color: '#F59E0B' },
  { key: 'converted', label: 'Converted', color: '#10B981' },
];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function MarketingHome() {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [moving, setMoving] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase
      .from('distributors')
      .select('id, name, zone, status, last_order_date')
      .eq('location_id', 'buziga')
      .order('created_at', { ascending: false })
      .limit(40);

    const mapped: Prospect[] = (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      zone: d.zone,
      status: (d.status === 'active' ? 'converted' : d.status === 'sleeping' ? 'qualified' : d.status === 'churned' ? 'contacted' : 'lead') as PipelineStage,
      last_contact_date: d.last_order_date ?? null,
    }));
    setProspects(mapped);
    setLoading(false);
  };

  const moveStage = async (id: string, newStage: PipelineStage) => {
    setMoving(id);
    const dbStatus = newStage === 'converted' ? 'active' : newStage === 'qualified' ? 'sleeping' : 'churned';
    await supabase.from('distributors').update({ status: dbStatus }).eq('id', id);
    setProspects((prev) => prev.map((p) => p.id === id ? { ...p, status: newStage } : p));
    setMoving(null);
  };

  const converted = prospects.filter((p) => p.status === 'converted').length;
  const thisWeek = prospects.filter((p) => {
    const d = p.last_contact_date;
    if (!d) return false;
    return new Date(d) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  }).length;
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-6 py-8 max-w-7xl mx-auto space-y-8">

      {/* Greeting bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              {greeting()}, {user?.name?.split(' ')[0]}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{date} · Marketing</p>
          </div>
          <Link href="/marketing" className="flex items-center gap-2 px-4 py-2.5 bg-[#EC4899] text-white rounded-xl font-bold text-sm hover:bg-[#EC4899]/90 transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Add Prospect
          </Link>
        </div>
      </motion.div>

      {/* Today's One Thing */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        {converted > 0 ? (
          <div className="bg-gradient-to-r from-[#EC4899] to-[#F97316] rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <CheckCircle2 className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">Follow up with {prospects.filter(p => p.status === 'qualified').length} qualified prospects</p>
              <p className="text-sm opacity-75 mt-1">{converted} converted · {prospects.length} total in pipeline</p>
            </div>
            <Link href="/marketing" className="flex-shrink-0 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5">
              Pipeline <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl p-6 text-white flex items-center gap-5 shadow-lg">
            <TrendingUp className="w-12 h-12 flex-shrink-0 opacity-90" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Today's Priority</p>
              <p className="text-xl font-black">Build the pipeline — add 3 new prospects</p>
              <p className="text-sm opacity-75 mt-1">Target: 3 qualified prospects per week</p>
            </div>
            <Link href="/marketing" className="flex-shrink-0 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5">
              Start <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </motion.div>

      {/* KPI Cards */}
      <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        {[
          { label: 'In Pipeline',    value: loading ? '—' : prospects.length.toString(),   icon: TrendingUp,  ok: prospects.length > 0, context: 'Total prospects' },
          { label: 'Active This Week', value: loading ? '—' : thisWeek.toString(),          icon: Users2,      ok: thisWeek > 0, context: 'Contacted in 7 days' },
          { label: 'Converted',      value: loading ? '—' : converted.toString(),           icon: CheckCircle2, ok: converted > 0, context: 'Active distributors' },
          { label: 'Qualified',      value: loading ? '—' : prospects.filter(p => p.status === 'qualified').length.toString(), icon: AlertTriangle, ok: true, context: 'Ready to close' },
        ].map((kpi) => (
          <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="marketing" context={kpi.context} />
        ))}
      </motion.div>

      {/* Kanban + Inbox */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Kanban — 2/3 */}
        <motion.div className="md:col-span-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Pipeline Board</p>
          {loading ? (
            <p className="text-slate-400 text-sm animate-pulse">Loading pipeline…</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STAGES.map((stage) => {
                const cards = prospects.filter((p) => p.status === stage.key);
                return (
                  <div key={stage.key} className="bg-white border border-slate-200 rounded-2xl p-3 min-h-[160px] shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">{stage.label}</h3>
                      <span className="ml-auto text-xs text-slate-400 font-semibold">{cards.length}</span>
                    </div>
                    <div className="space-y-2">
                      {cards.slice(0, 4).map((p) => (
                        <div key={p.id} className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{p.name}</p>
                          <p className="text-[10px] text-slate-500">{p.zone ?? '—'}</p>
                          <select
                            value={p.status}
                            onChange={(e) => moveStage(p.id, e.target.value as PipelineStage)}
                            disabled={moving === p.id}
                            className="mt-1.5 w-full bg-white text-[10px] text-slate-600 rounded px-1 py-0.5 border border-slate-200 outline-none"
                          >
                            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                      ))}
                      {cards.length > 4 && <p className="text-[10px] text-slate-400 text-center">+{cards.length - 4} more</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Inbox — 1/3 */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <InboxPanel compact />
        </motion.div>
      </div>
    </div>
  );
}
