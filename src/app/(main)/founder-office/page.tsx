'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';

export default function FounderOfficePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    jarsToday: 0,
    qualityPassRate: 0,
    cashPosition: 0,
    inventoryHealth: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Query production logs for today
        const today = new Date().toISOString().split('T')[0];
        
        const { data: prodData } = await supabase
          .from('production_logs')
          .select('jar_count')
          .eq('production_date', today)
          .eq('location_id', 'buziga');

        const jarsToday = prodData?.reduce((sum, log) => sum + (log.jar_count || 0), 0) || 0;

        // Query quality pass rate
        const { data: qcData } = await supabase
          .from('water_tests')
          .select('result')
          .eq('location_id', 'buziga')
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

        const passCount = qcData?.filter((q) => q.result === 'PASS').length || 0;
        const passRate = qcData?.length ? Math.round((passCount / qcData.length) * 100) : 0;

        // Query critical events
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('location_id', 'buziga')
          .eq('severity', 'critical')
          .order('created_at', { ascending: false })
          .limit(5);

        setStats({
          jarsToday,
          qualityPassRate: passRate,
          cashPosition: 0,
          inventoryHealth: 75,
        });

        setEvents(eventData || []);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasCritical = events.length > 0;

  return (
    <div className="p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2 font-headline">
          Executive – Strategic Briefing
        </h1>
        <p className="text-zinc-400 font-label">Maji Safi Operations / {new Date().toLocaleDateString()}</p>
      </div>

      {/* Critical Alerts */}
      {hasCritical && (
        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-semibold font-label">{events.length} Critical Alert(s)</p>
            <p className="text-sm text-red-300 font-label mt-1">
              {events[0]?.event_type.replace(/_/g, ' ').toUpperCase()} on Batch {events[0]?.batch_id}
            </p>
          </div>
        </div>
      )}

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          {
            label: 'Jars Filled',
            value: stats.jarsToday.toString(),
            target: '500/day',
            status: stats.jarsToday >= 500 ? 'good' : 'warning',
          },
          {
            label: 'Quality Pass Rate',
            value: `${stats.qualityPassRate}%`,
            target: '100%',
            status: stats.qualityPassRate >= 95 ? 'good' : 'warning',
          },
          { label: 'Cash Position', value: 'UGX 0', target: 'Track', status: 'neutral' },
          {
            label: 'Inventory Health',
            value: `${stats.inventoryHealth}%`,
            target: 'Ready',
            status: stats.inventoryHealth >= 80 ? 'good' : 'warning',
          },
        ].map((kpi, i) => {
          const bgColor =
            kpi.status === 'good'
              ? 'bg-green-500/10 border-green-500/30'
              : kpi.status === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-zinc-900 border-zinc-800';
          const textColor =
            kpi.status === 'good'
              ? 'text-green-400'
              : kpi.status === 'warning'
                ? 'text-amber-400'
                : 'text-white';

          return (
            <div key={i} className={`p-6 border rounded-lg hover:border-opacity-75 transition-colors ${bgColor}`}>
              <p className="text-zinc-400 text-sm font-label mb-2">{kpi.label}</p>
              <p className={`text-3xl font-bold mb-1 font-headline ${textColor}`}>{kpi.value}</p>
              <p className="text-xs text-zinc-500 font-label">{kpi.target}</p>
            </div>
          );
        })}
      </div>

      {/* Activity Feed */}
      <div>
        <h2 className="text-xl font-bold text-white mb-6 font-headline">Recent Activity</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg divide-y divide-zinc-800">
          {events.length === 0 ? (
            <div className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-green-400 font-label">All systems operational</p>
              </div>
            </div>
          ) : (
            events.map((evt, i) => (
              <div key={i} className="p-4 hover:bg-zinc-800/30 transition-colors">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold font-headline text-sm">
                      {evt.event_type.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    <p className="text-zinc-400 text-xs font-label mt-1">
                      Batch {evt.batch_id} · {new Date(evt.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
