'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// ─── useEntityLive ────────────────────────────────────────────────────────────
// Subscribes to postgres_changes for a single row (<table> WHERE id = entityId).
// Returns current data + auto-refreshes via provided fetchFn on any change.

export function useEntityLive<T>(
  table: string,
  entityId: string | null | undefined,
  fetchFn: () => Promise<T>,
  initialData: T,
): { data: T; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  // Re-fetch when browser tab becomes visible (handles sleep/wake)
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);

  useEffect(() => {
    refresh();

    if (!entityId) return;

    channelRef.current = supabase
      .channel(`entity:${table}:${entityId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `id=eq.${entityId}` },
        () => refresh(),
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, entityId]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refresh };
}

// ─── useTableLive ─────────────────────────────────────────────────────────────
// Subscribes to ALL changes on a table (optionally filtered by a column=value).
// Calls fetchFn on any change. Best for list views.

export function useTableLive<T>(
  table: string,
  fetchFn: () => Promise<T>,
  initialData: T,
  filterColumn?: string,
  filterValue?: string,
): { data: T; loading: boolean; refresh: () => void } {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);

  useEffect(() => {
    refresh();

    const filter = filterColumn && filterValue
      ? `${filterColumn}=eq.${filterValue}`
      : undefined;

    channelRef.current = supabase
      .channel(`table:${table}:${filterColumn ?? 'all'}:${filterValue ?? '*'}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
        () => refresh(),
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [table, filterColumn, filterValue]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, refresh };
}

// ─── useDepartmentLive ────────────────────────────────────────────────────────
// Listens to the dept:<deptSlug> broadcast channel.
// Returns the last N events that hit that department.

export interface DeptEvent {
  op: string;
  table: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function useDepartmentLive(
  deptSlug: string,
  maxEvents = 20,
): { events: DeptEvent[]; connected: boolean } {
  const [events, setEvents] = useState<DeptEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!deptSlug) return;

    channelRef.current = supabase
      .channel(`dept:${deptSlug}`)
      .on('broadcast', { event: '*' }, ({ event, payload }) => {
        const evt: DeptEvent = {
          op: payload?.op ?? event,
          table: payload?.table ?? 'unknown',
          timestamp: new Date().toISOString(),
          payload: payload ?? {},
        };
        setEvents(prev => [evt, ...prev].slice(0, maxEvents));
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setConnected(false);
      }
    };
  }, [deptSlug, maxEvents]);

  return { events, connected };
}

// ─── usePresence ──────────────────────────────────────────────────────────────
// Uses Supabase Presence to track who's viewing a department right now.

export interface PresenceUser {
  userId: string;
  name: string;
  role: string;
  joinedAt: string;
}

export function usePresence(
  deptSlug: string,
  currentUser: { id: string; name: string; role: string } | null,
): { viewers: PresenceUser[]; count: number } {
  const [viewers, setViewers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!deptSlug || !currentUser) return;

    const presenceKey = `${currentUser.id}`;

    channelRef.current = supabase.channel(`presence:${deptSlug}`, {
      config: { presence: { key: presenceKey } },
    });

    channelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = channelRef.current!.presenceState<PresenceUser>();
        const all = Object.values(state).flat();
        setViewers(all);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channelRef.current!.track({
            userId: currentUser.id,
            name: currentUser.name,
            role: currentUser.role,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [deptSlug, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { viewers, count: viewers.length };
}

// ─── useMultiTableLive ────────────────────────────────────────────────────────
// Subscribes to changes across multiple tables at once.
// Useful for dashboard pages that aggregate from several sources.

export function useMultiTableLive(
  tables: string[],
  fetchFn: () => Promise<void>,
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const channelsRef = useRef<RealtimeChannel[]>([]);

  // Re-fetch on visibility change
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') fetchFn(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchFn]);

  useEffect(() => {
    fetchFn();

    // Clean up any existing channels
    channelsRef.current.forEach(c => supabase.removeChannel(c));
    channelsRef.current = [];

    tables.forEach(table => {
      const channel = supabase
        .channel(`multi:${table}:${tables.join(',')}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, () => fetchFn())
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') setConnected(true);
        });
      channelsRef.current.push(channel);
    });

    return () => {
      channelsRef.current.forEach(c => supabase.removeChannel(c));
      channelsRef.current = [];
      setConnected(false);
    };
  }, [tables.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  return { connected };
}
