'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';
import { AlertTriangle } from 'lucide-react';

export default function FounderOfficePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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

        // Load more metrics as schema is available
        setStats({
          jarsToday,
          qualityPassRate: 0,
          cashPosition: 0,
          inventoryHealth: 0,
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-2 font-headline">
          Executive – Strategic Briefing
        </h1>
        <p className="text-zinc-400 font-label">Maji Safi Operations / {new Date().toLocaleDateString()}</p>
      </div>

      {/* Critical Alerts */}
      <div className="mb-8 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-red-400 font-semibold font-label">No data loaded yet</p>
          <p className="text-sm text-red-300 font-label">Complete Supabase schema to view real metrics</p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Jars Filled', value: stats.jarsToday, target: '500/day' },
          { label: 'Quality Pass Rate', value: '0%', target: '100%' },
          { label: 'Cash Position', value: 'UGX 0', target: 'Track' },
          { label: 'Inventory Health', value: '0/Ready', target: 'Monitor' },
        ].map((kpi, i) => (
          <div
            key={i}
            className="p-6 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
          >
            <p className="text-zinc-400 text-sm font-label mb-2">{kpi.label}</p>
            <p className="text-3xl font-bold text-white mb-1 font-headline">{kpi.value}</p>
            <p className="text-xs text-zinc-500 font-label">{kpi.target}</p>
          </div>
        ))}
      </div>

      {/* Activity Feed */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-6 font-headline">Recent Activity</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
          <p className="text-zinc-400 text-center font-label">No activity logged yet</p>
        </div>
      </div>
    </div>
  );
}
