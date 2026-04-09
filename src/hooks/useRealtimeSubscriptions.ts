"use client";

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/ToastContainer';
import { sendTelegramAlert, TelegramAlertEvent } from '@/lib/telegram';

export type RealtimeTableConfig = {
  table: string;
  /** Human-readable label shown in the toast */
  label: string;
  /** Toast type override — defaults to 'info' */
  toastType?: 'info' | 'success' | 'warning' | 'error';
  /** Custom toast message builder; if omitted, uses generic label */
  toastMessage?: (record: any) => string;
  /** Called on every INSERT with the new record – lets callers do state updates */
  onInsert?: (record: any) => void;
  /** Called on every UPDATE with the new record */
  onUpdate?: (record: any) => void;
  /** Called on every DELETE with the old record */
  onDelete?: (record: any) => void;
  /** Optional Telegram event key to fire on INSERT; can return false to skip */
  telegramEvent?: TelegramAlertEvent;
  /** Build the Telegram message from the incoming record */
  telegramMessage?: (record: any) => string;
  /** Optional guard: only send Telegram if this returns true */
  telegramCondition?: (record: any) => boolean;
};

/**
 * Subscribes to Supabase Realtime for one or many tables.
 * Automatically tears down all channels on unmount.
 */
export function useRealtimeSubscriptions(configs: RealtimeTableConfig[]) {
  const channelsRef = useRef<ReturnType<typeof supabase.channel>[]>([]);

  useEffect(() => {
    channelsRef.current = configs.map(cfg => {
      const channel = supabase
        .channel(`rt:${cfg.table}:${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: cfg.table },
          ({ new: record }) => {
            // Show toast
            const msg = cfg.toastMessage
              ? cfg.toastMessage(record)
              : `New entry in ${cfg.label}`;
            showToast({
              type: cfg.toastType ?? 'info',
              message: msg,
            });

            // Send Telegram alert (with optional condition guard)
            if (cfg.telegramEvent && cfg.telegramMessage) {
              const shouldSend = cfg.telegramCondition ? cfg.telegramCondition(record) : true;
              if (shouldSend) {
                sendTelegramAlert(cfg.telegramEvent, cfg.telegramMessage(record));
              }
            }

            cfg.onInsert?.(record);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: cfg.table },
          ({ new: record }) => {
            // Fire Telegram on UPDATE too if configured (e.g. milestone status changes)
            if (cfg.telegramEvent && cfg.telegramMessage) {
              const shouldSend = cfg.telegramCondition ? cfg.telegramCondition(record) : false; // default: no telegram on UPDATE
              if (shouldSend) {
                sendTelegramAlert(cfg.telegramEvent, cfg.telegramMessage(record));
              }
            }
            cfg.onUpdate?.(record);
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: cfg.table },
          ({ old: record }) => {
            cfg.onDelete?.(record);
          }
        )
        .subscribe();

      return channel;
    });

    return () => {
      channelsRef.current.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
