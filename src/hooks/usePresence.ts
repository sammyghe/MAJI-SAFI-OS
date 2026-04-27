'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePresence() {
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Initial fetch
    const fetchActive = async () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from('user_sessions')
        .select('user_id, last_activity_at')
        .gte('last_activity_at', fiveMinsAgo)
        .is('logout_at', null);

      if (data) {
        const active = new Set(data.map((d) => d.user_id));
        setActiveUserIds(active);
      }
    };
    fetchActive();

    // Subscribe to realtime updates on user_sessions
    const sub = supabase.channel('user-presence')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_sessions' }, (payload) => {
        const row = payload.new as any;
        if (!row || !row.user_id) return;
        
        setActiveUserIds((prev) => {
          const next = new Set(prev);
          const lastActivity = new Date(row.last_activity_at).getTime();
          const isLogout = !!row.logout_at;
          const isRecent = (Date.now() - lastActivity) < 5 * 60 * 1000;

          if (!isLogout && isRecent) {
            next.add(row.user_id);
          } else {
            next.delete(row.user_id);
          }
          return next;
        });
      })
      .subscribe();

    const interval = setInterval(fetchActive, 60000); // Re-check every minute

    return () => {
      supabase.removeChannel(sub);
      clearInterval(interval);
    };
  }, []);

  return activeUserIds;
}
