'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { CheckCircle2, MapPin, Package } from 'lucide-react';
import TodaysFocus from '@/components/TodaysFocus';
import InboxPanel from '@/components/InboxPanel';

interface Stop {
  id: string;
  name: string;
  zone: string;
  jarsToDeliver: number;
  cashToCollect: number;
  done: boolean;
  cashReceived: boolean;
  jarsReturned: number;
}

export default function DeliveryHome() {
  const { user } = useAuth();
  const [stops, setStops] = useState<Stop[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [routeClosed, setRouteClosed] = useState(false);

  useEffect(() => {
    loadRoute();
  }, []);

  const loadRoute = async () => {
    const today = new Date().toISOString().split('T')[0];
    // Load today's active distributors as route stops
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
        cashReceived: false,
        jarsReturned: 0,
      })));
    } else {
      setStops([]);
    }
    setLoading(false);
  };

  const markDone = (id: string) => {
    setStops((prev) => prev.map((s) => s.id === id ? { ...s, done: true, cashReceived: true } : s));
    setSelected(null);
  };

  const allDone = stops.length > 0 && stops.every((s) => s.done);
  const doneCount = stops.filter((s) => s.done).length;
  const totalCash = stops.filter((s) => s.done).reduce((sum, s) => sum + s.cashToCollect, 0);

  return (
    <div className="px-5 py-6 max-w-lg mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Today's Route</h1>
        <p className="text-slate-500 text-xs uppercase tracking-widest mt-1">
          {user?.name?.split(' ')[0]} · {stops.length} stops · {doneCount} done
        </p>
      </div>

      {/* Inbox */}
      <div className="mb-4">
        <InboxPanel compact />
      </div>

      {/* Today's Focus */}
      <div className="mb-6">
        <TodaysFocus department="dispatch" compact />
      </div>

      {loading ? (
        <div className="text-center py-16">
          <p className="text-slate-500 text-sm animate-pulse">Loading route…</p>
        </div>
      ) : stops.length === 0 ? (
        <div className="text-center py-16 bg-zinc-900 border border-zinc-800 rounded-2xl">
          <MapPin className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-bold">No route assigned for today</p>
          <p className="text-slate-600 text-xs mt-1">Contact your manager to assign deliveries</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="mb-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${stops.length > 0 ? (doneCount / stops.length) * 100 : 0}%` }}
            />
          </div>

          {/* Stops */}
          <div className="space-y-3 mb-6">
            {stops.map((stop) => (
              <div key={stop.id}>
                <button
                  onClick={() => setSelected(selected === stop.id ? null : stop.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all ${
                    stop.done
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {stop.done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                        : <MapPin className="w-5 h-5 text-slate-500 flex-shrink-0" />
                      }
                      <div>
                        <p className={`font-bold text-sm ${stop.done ? 'text-emerald-300' : 'text-white'}`}>{stop.name}</p>
                        <p className="text-[10px] text-slate-500">{stop.zone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white flex items-center gap-1 justify-end">
                        <Package className="w-3 h-3" /> {stop.jarsToDeliver} jars
                      </p>
                      <p className="text-[10px] text-slate-500">UGX {stop.cashToCollect.toLocaleString()}</p>
                    </div>
                  </div>
                </button>

                {/* Expanded action */}
                {selected === stop.id && !stop.done && (
                  <div className="mx-2 bg-zinc-900 border border-zinc-700 rounded-b-2xl p-4 -mt-1 space-y-3">
                    <p className="text-xs text-slate-400">Mark this stop as complete:</p>
                    <button
                      onClick={() => markDone(stop.id)}
                      className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl text-sm active:scale-95 transition-transform"
                    >
                      ✓ Mark Delivered · Cash Received
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Close Route */}
          {allDone && !routeClosed && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-4">
              <p className="text-emerald-400 font-bold text-sm mb-1">All stops complete!</p>
              <p className="text-emerald-400/70 text-xs mb-4">Total cash collected: UGX {totalCash.toLocaleString()}</p>
              <button
                onClick={() => setRouteClosed(true)}
                className="w-full py-4 bg-emerald-500 text-white font-black uppercase tracking-widest rounded-xl text-sm"
              >
                Close Route & Submit
              </button>
            </div>
          )}

          {routeClosed && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-emerald-400 font-black text-sm uppercase">Route Closed</p>
              <p className="text-emerald-400/70 text-xs mt-1">UGX {totalCash.toLocaleString()} submitted</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
