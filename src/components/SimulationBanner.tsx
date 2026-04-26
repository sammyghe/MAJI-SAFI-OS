'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SimulationBanner() {
  const [active, setActive] = useState(false);
  const [rowCounts, setRowCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from('simulation_settings')
        .select('is_active, row_counts')
        .eq('location_id', 'buziga')
        .maybeSingle();
      if (data?.is_active) {
        setActive(true);
        setRowCounts(data.row_counts ?? {});
      } else {
        setActive(false);
      }
    };
    check();

    const channel = supabase
      .channel('rt:simulation_settings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'simulation_settings' }, (payload) => {
        const row = payload.new as any;
        if (row.location_id === 'buziga') {
          setActive(row.is_active ?? false);
          setRowCounts(row.row_counts ?? {});
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (!active) return null;

  const totalRows = Object.values(rowCounts).reduce((s, n) => s + (n as number), 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 64,
        left: 0,
        right: 0,
        zIndex: 35,
        background: 'linear-gradient(90deg, #EFF8FF, #DBEAFE)',
        color: '#0077B6',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: '0.05em',
        borderBottom: '1px solid #BFDBFE',
      }}
    >
      <span>🔬 Simulation mode active — {totalRows.toLocaleString()} demo records. Your real data is safe.</span>
      <a
        href="/settings/simulation"
        style={{ color: '#0077B6', textDecoration: 'underline', fontSize: 11, letterSpacing: '0.1em' }}
      >
        MANAGE →
      </a>
    </div>
  );
}
