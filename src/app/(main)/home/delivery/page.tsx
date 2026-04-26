'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircle2, MapPin, Package, Truck, DollarSign, ArrowRight } from 'lucide-react';
import ShiftGate from '@/components/ShiftGate';
import InboxPanel from '@/components/InboxPanel';
import RoleKpiCard from '@/components/RoleKpiCard';

interface Stop {
  id: string;
  name: string;
  zone: string;
  jarsToDeliver: number;
  cashToCollect: number;
  done: boolean;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DeliveryHome() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeClosed, setRouteClosed] = useState(false);

  useEffect(() => { loadRoute(); }, []);

  const loadRoute = async () => {
    const { data } = await supabase
      .from('distributors')
      .select('id, name, zone, total_orders')
      .eq('location_id', 'buziga')
      .eq('status', 'active')
      .limit(10);

    if (data && data.length > 0) {
      setStops(data.map((d) => ({
        id: d.id,
        name: d.name,
        zone: d.zone ?? 'Buziga',
        jarsToDeliver: Math.floor(Math.random() * 30) + 10,
        cashToCollect: (Math.floor(Math.random() * 30) + 10) * 3000,
        done: false,
      })));
    } else {
      setStops([]);
    }
    setLoading(false);
  };

  const markDone = (id: string) => {
    setStops((prev) => prev.map((s) => s.id === id ? { ...s, done: true } : s));
    setSelected(null);
  };

  const doneCount = stops.filter((s) => s.done).length;
  const allDone = stops.length > 0 && doneCount === stops.length;
  const totalCash = stops.filter((s) => s.done).reduce((sum, s) => sum + s.cashToCollect, 0);
  const totalJars = stops.reduce((sum, s) => sum + s.jarsToDeliver, 0);
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="px-6 py-8 max-w-lg mx-auto space-y-6">

      {/* Greeting bar */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-3xl font-black tracking-tight text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-slate-500 text-sm mt-1">{date} · Dispatch</p>
      </motion.div>

      {/* Shift gate */}
      <ShiftGate />

      {/* Today's One Thing */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
        {allDone && routeClosed ? (
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg">
            <CheckCircle2 className="w-10 h-10 flex-shrink-0 opacity-90" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Route Closed</p>
              <p className="text-lg font-black">All stops complete!</p>
              <p className="text-sm opacity-75">UGX {totalCash.toLocaleString()} submitted</p>
            </div>
          </div>
        ) : stops.length === 0 && !loading ? (
          <div className="bg-slate-100 rounded-2xl p-5 flex items-center gap-4">
            <MapPin className="w-10 h-10 text-slate-400 flex-shrink-0" />
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-0.5">No Route</p>
              <p className="text-lg font-black text-slate-700">No deliveries assigned today</p>
              <p className="text-sm text-slate-500">Contact your manager</p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-[#6366F1] to-[#818CF8] rounded-2xl p-5 text-white flex items-center gap-4 shadow-lg">
            <Truck className="w-10 h-10 flex-shrink-0 opacity-90" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-0.5">Today's Route</p>
              <p className="text-lg font-black">{doneCount} of {stops.length} stops complete</p>
              <p className="text-sm opacity-75">{totalJars} jars · UGX {totalCash.toLocaleString()} collected</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* KPI strip */}
      <motion.div className="grid grid-cols-2 gap-4" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        {[
          { label: 'Stops Done', value: loading ? '—' : `${doneCount}/${stops.length}`, icon: CheckCircle2, ok: allDone, context: 'Route progress' },
          { label: 'Cash Collected', value: loading ? '—' : `UGX ${(totalCash / 1000).toFixed(0)}K`, icon: DollarSign, ok: totalCash > 0, context: 'Completed stops' },
        ].map((kpi) => (
          <RoleKpiCard key={kpi.label} label={kpi.label} value={kpi.value} icon={kpi.icon} ok={kpi.ok} role="delivery" context={kpi.context} />
        ))}
      </motion.div>

      {/* Route progress bar */}
      {stops.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between text-xs text-slate-500 mb-2">
              <span>{doneCount} done</span>
              <span>{stops.length - doneCount} remaining</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#6366F1] rounded-full transition-all duration-500" style={{ width: `${stops.length > 0 ? (doneCount / stops.length) * 100 : 0}%` }} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Stop list */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        {loading ? (
          <p className="text-center text-slate-400 text-sm animate-pulse py-8">Loading route…</p>
        ) : stops.length === 0 ? null : (
          <div className="space-y-2">
            {stops.map((stop) => (
              <div key={stop.id}>
                <button
                  onClick={() => setSelected(selected === stop.id ? null : stop.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all shadow-sm ${
                    stop.done
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {stop.done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                        : <MapPin className="w-5 h-5 text-slate-400 flex-shrink-0" />
                      }
                      <div>
                        <p className={`font-bold text-sm ${stop.done ? 'text-emerald-700' : 'text-slate-900'}`}>{stop.name}</p>
                        <p className="text-xs text-slate-500">{stop.zone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900 flex items-center gap-1 justify-end">
                        <Package className="w-3 h-3" /> {stop.jarsToDeliver} jars
                      </p>
                      <p className="text-xs text-slate-400">UGX {stop.cashToCollect.toLocaleString()}</p>
                    </div>
                  </div>
                </button>

                {selected === stop.id && !stop.done && (
                  <div className="mx-2 bg-slate-50 border border-slate-200 border-t-0 rounded-b-2xl p-4 -mt-1">
                    <button
                      onClick={() => markDone(stop.id)}
                      className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl text-sm hover:bg-emerald-600 transition-colors active:scale-95"
                    >
                      Mark Delivered · Cash Received
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Close route */}
      {allDone && !routeClosed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="text-emerald-700 font-bold text-sm mb-1">All stops complete!</p>
            <p className="text-emerald-600 text-xs mb-4">Total: UGX {totalCash.toLocaleString()}</p>
            <button onClick={() => setRouteClosed(true)} className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl text-sm hover:bg-emerald-600 transition-colors">
              Close Route & Submit
            </button>
          </div>
        </motion.div>
      )}

      {/* Inbox */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <InboxPanel compact />
      </motion.div>
    </div>
  );
}
