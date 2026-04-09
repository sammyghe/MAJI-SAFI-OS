"use client";

import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

/**
 * Drop this anywhere inside a Client Component tree to activate
 * Realtime subscriptions across all core MajiSafi tables.
 * It renders nothing visible – it's purely a side-effect component.
 */
export default function RealtimeManager({
  onLogsChange,
  onProjectsChange,
}: {
  onLogsChange?: (record: any) => void;
  onProjectsChange?: (record: any) => void;
}) {
  useRealtimeSubscriptions([
    // ── Operations daily logs ───────────────────────────────────────────
    {
      table: 'maji_daily_logs',
      label: 'Operations Logs',
      toastType: 'success',
      toastMessage: (r) =>
        `📝 ${r.logged_by ?? 'Team'} logged ${r.jars_produced ?? '?'} jars for ${r.date ?? 'today'}`,
      onInsert: onLogsChange,
      telegramEvent: 'new_log',
      telegramMessage: (r) =>
        `New ops log: ${r.jars_produced} jars on ${r.date} (${r.quality_status}) by ${r.logged_by}`,
    },

    // ── Quality — only alert on FAIL ────────────────────────────────────
    {
      table: 'maji_quality_logs',
      label: 'Quality Check',
      toastType: 'warning',
      toastMessage: (r) =>
        `⚠️ Quality ${r.status?.toUpperCase() ?? 'ENTRY'}: ${r.test_type ?? 'test'} on ${r.date ?? 'today'}`,
      telegramEvent: 'quality_flag',
      telegramMessage: (r) =>
        `🚨 Quality FAIL: ${r.test_type} on ${r.date}. Batch must be quarantined immediately.`,
      telegramCondition: (r) =>
        typeof r.status === 'string' && r.status.toLowerCase() === 'fail',
    },

    // ── Inventory — alert when quantity_used is high ─────────────────────
    {
      table: 'maji_inventory',
      label: 'Inventory',
      toastType: 'info',
      toastMessage: (r) =>
        `📦 Inventory update: ${r.item_name ?? 'item'} — ${r.quantity_used ?? '?'} units used`,
      telegramEvent: 'low_inventory',
      telegramMessage: (r) =>
        `📦 Low inventory alert: ${r.item_name} — only ${r.quantity_remaining ?? '?'} units remaining.`,
      telegramCondition: (r) =>
        Number(r.quantity_remaining ?? Infinity) < 20,
    },

    // ── Projects — milestone alert when status changes to 'completed' ───
    {
      table: 'maji_projects',
      label: 'Projects',
      toastType: 'success',
      toastMessage: (r) =>
        `🏗️ Project updated: "${r.name ?? 'project'}" → ${r.status ?? ''}`,
      onInsert: onProjectsChange,
      onUpdate: onProjectsChange,
      telegramEvent: 'milestone_reached',
      telegramMessage: (r) =>
        `🏆 Milestone reached! Project "${r.name}" is now ${r.status}. Deadline: ${r.deadline}.`,
      telegramCondition: (r) =>
        typeof r.status === 'string' && r.status.toLowerCase() === 'completed',
    },

    // ── Team recognitions ───────────────────────────────────────────────
    {
      table: 'recognitions',
      label: 'Team Recognition',
      toastType: 'success',
      toastMessage: (r) =>
        `🌟 Shout-out in ${r.department ?? 'team'}: "${r.message ?? ''}"`,
      telegramEvent: 'recognition',
      telegramMessage: (r) =>
        `🌟 New shout-out in ${r.department}: "${r.message}" — from ${r.given_by ?? 'a colleague'}`,
    },

    // ── Users — silent subscription for HR live updates ─────────────────
    {
      table: 'users',
      label: 'User Accounts',
      toastType: 'info',
      toastMessage: (r) =>
        `👤 New user registered: ${r.name ?? r.email ?? 'unknown'}`,
    },

    // ── Tasks ────────────────────────────────────────────────────────────
    {
      table: 'tasks',
      label: 'Task Board',
      toastType: 'info',
      toastMessage: (r) =>
        `✅ Task assigned: "${r.title ?? 'new task'}" to ${r.assigned_to ?? 'team'}`,
    },
  ]);

  return null;
}
