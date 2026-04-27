'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';

interface DayPoint { date: string; label: string; jars: number; }

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card-strong px-4 py-3 text-sm shadow-xl">
      <p className="text-slate-400 text-xs mb-1">{label}</p>
      <p className="text-slate-900 font-black text-lg">{(payload[0]?.value ?? 0).toLocaleString()} jars</p>
    </div>
  );
}

export default function ProductionChart() {
  const [data, setData] = useState<DayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const sevenDaysAgo = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0];
      const { data: rows } = await supabase
        .from('production_logs')
        .select('production_date, jar_count')
        .eq('location_id', 'buziga')
        .gte('production_date', sevenDaysAgo)
        .order('production_date', { ascending: true });

      const byDay: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
        byDay[d] = 0;
      }
      (rows ?? []).forEach(r => { if (r.production_date in byDay) byDay[r.production_date] += r.jar_count ?? 0; });

      setData(Object.entries(byDay).map(([date, jars]) => ({
        date,
        label: new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
        jars,
      })));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="glass-card-strong p-6 h-[320px] flex items-center justify-center">
        <p className="text-slate-400 text-sm animate-pulse">Loading chart…</p>
      </div>
    );
  }

  const maxJars = Math.max(...data.map(d => d.jars), 500);

  return (
    <div className="glass-card-strong p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-0.5">7-Day Production</p>
          <p className="text-2xl font-black text-slate-900">
            {data.reduce((s, d) => s + d.jars, 0).toLocaleString()} jars
          </p>
          <p className="text-xs text-slate-400 mt-0.5">this week</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#0077B6]" />
          <span className="text-xs text-slate-500">Jars produced</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="jarGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0077B6" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#0077B6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, maxJars + 50]} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(0,119,182,0.15)', strokeWidth: 2 }} />
          <Area
            type="monotone"
            dataKey="jars"
            stroke="#0077B6"
            strokeWidth={2.5}
            fill="url(#jarGrad)"
            dot={{ fill: '#0077B6', strokeWidth: 0, r: 4 }}
            activeDot={{ r: 6, fill: '#0077B6', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
