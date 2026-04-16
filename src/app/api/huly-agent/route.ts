/**
 * /api/huly-agent — Supabase → Huly agentic bridge for Maji Safi OS
 *
 * POST endpoints (called by Supabase Database Webhooks):
 *   POST /api/huly-agent?trigger=qc_fail          → QC failure → urgent QC issue + #all-alerts
 *   POST /api/huly-agent?trigger=inventory_low    → low stock  → urgent INV issue + #all-alerts
 *   POST /api/huly-agent?trigger=cash_mismatch    → cash gap   → urgent FIN issue + #all-alerts
 *
 * GET endpoint (called by Vercel Cron at 19:00 EAT / 16:00 UTC):
 *   GET  /api/huly-agent?trigger=daily_pulse      → reads today's Supabase data → posts to #daily-pulse
 *
 * Security:
 *   All requests must include:  Authorization: Bearer <HULY_AGENT_SECRET>
 *   Set CRON_SECRET=<same value> in Vercel so the cron call is automatically authenticated.
 *
 * Required env vars:
 *   HULY_TOKEN              — Huly API token
 *   HULY_AGENT_SECRET       — shared secret for webhook + cron auth
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service key (bypasses RLS for server reads)
 *   NEXT_PUBLIC_SUPABASE_URL  — Supabase project URL
 *
 * Optional:
 *   HULY_WORKSPACE          — defaults to "majisafioffice"
 *   HULY_API_URL            — defaults to "https://api.huly.io"
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import {
  hulyCreateIssue,
  hulyPostMessage,
  HULY_CHANNELS,
} from '@/lib/huly';

export const runtime = 'edge';

// ── Inventory minimum thresholds ─────────────────────────────────────────────
// Keys must match the `item_type` values stored in inventory_logs
const INVENTORY_MINIMUMS: Record<string, number> = {
  reusable_jars: 400,
  single_use:    400,
  caps:          1500,
  labels:        1500,
};

// ── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.HULY_AGENT_SECRET;
  if (!secret) return true; // no secret configured → allow in dev
  const auth = req.headers.get('authorization') ?? '';
  return auth === `Bearer ${secret}`;
}

// ── Supabase (server-side, service role) ─────────────────────────────────────

function serverSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// ── Utilities ────────────────────────────────────────────────────────────────

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ── Trigger: QC Fail ─────────────────────────────────────────────────────────
// Supabase webhook:  INSERT on daily_checklists WHERE result = 'fail'

async function handleQcFail(record: Record<string, unknown>): Promise<void> {
  const testType  = String(record.test_type ?? 'Unknown test');
  const value     = String(record.value ?? record.reading ?? 'N/A');
  const batchSufx = record.batch_id ? ` (Batch ${record.batch_id})` : '';
  const loggedAt  = String(record.created_at ?? new Date().toISOString());

  const title = `BATCH FAILURE: ${testType} reading ${value}${batchSufx}`;

  const description = [
    '**Automatic alert — SAFI OS**',
    '',
    `- **Test:** ${testType}`,
    `- **Reading:** ${value}`,
    `- **Expected range:** ${record.expected_range ?? 'see QC SOP'}`,
    `- **Logged at:** ${loggedAt}`,
    '',
    '**Immediate actions required:**',
    '1. Stop production on affected line',
    '2. Quarantine entire batch',
    '3. Re-test before resuming any filling',
    '4. Notify Production Manager and Founder',
  ].join('\n');

  const alertMsg =
    `🚨 QC FAIL: ${testType} failed. Reading: ${value}.` +
    ` Batch halted.${batchSufx} Investigate immediately.`;

  await Promise.all([
    hulyCreateIssue({ project: 'QC', title, description, priority: 'urgent' }),
    hulyPostMessage(HULY_CHANNELS.ALL_ALERTS, alertMsg),
  ]);
}

// ── Trigger: Inventory Low ───────────────────────────────────────────────────
// Supabase webhook:  INSERT/UPDATE on inventory_logs

async function handleInventoryLow(record: Record<string, unknown>): Promise<void> {
  const itemType = String(record.item_type ?? record.item ?? '');
  const count    = Number(record.quantity ?? record.count ?? record.current_stock ?? 0);
  const min      = INVENTORY_MINIMUMS[itemType];

  // Only act if this item has a defined minimum and is actually below it
  if (min === undefined || count >= min) return;

  const title = `LOW STOCK: ${itemType} at ${count} (min: ${min})`;

  const description = [
    '**Automatic inventory alert — SAFI OS**',
    '',
    `- **Item:** ${itemType}`,
    `- **Current count:** ${count}`,
    `- **Minimum threshold:** ${min}`,
    `- **Logged at:** ${record.created_at ?? new Date().toISOString()}`,
    '',
    '**Action:** Initiate reorder or adjust production schedule to match available stock.',
  ].join('\n');

  const alertMsg =
    `📦 LOW STOCK: ${itemType} is at ${count} units — minimum is ${min}. Reorder immediately.`;

  await Promise.all([
    hulyCreateIssue({ project: 'INV', title, description, priority: 'urgent' }),
    hulyPostMessage(HULY_CHANNELS.ALL_ALERTS, alertMsg),
  ]);
}

// ── Trigger: Cash Mismatch ───────────────────────────────────────────────────
// Supabase webhook:  INSERT/UPDATE on maji_daily_logs

async function handleCashMismatch(record: Record<string, unknown>): Promise<void> {
  const cashCollected = Number(record.cash_collected ?? 0);
  const salesTotal    = Number(record.sales_total ?? record.calculated_sales_total ?? 0);
  const variance      = Math.abs(cashCollected - salesTotal);

  if (variance <= 5000) return; // within UGX 5,000 tolerance

  const direction = cashCollected > salesTotal ? 'SURPLUS' : 'SHORTFALL';
  const logDate   = String(record.log_date ?? todayUTC());

  const title = `CASH MISMATCH: ${direction} of UGX ${variance.toLocaleString()}`;

  const description = [
    '**Automatic finance alert — SAFI OS**',
    '',
    `- **Date:** ${logDate}`,
    `- **Cash collected:** UGX ${cashCollected.toLocaleString()}`,
    `- **Calculated sales total:** UGX ${salesTotal.toLocaleString()}`,
    `- **Variance:** UGX ${variance.toLocaleString()} (${direction})`,
    '',
    '**Action:** Finance officer must reconcile before close of business.',
    'Do not carry forward unresolved variances.',
  ].join('\n');

  const alertMsg =
    `💰 CASH MISMATCH: ${direction} of UGX ${variance.toLocaleString()}.` +
    ` Cash: ${cashCollected.toLocaleString()} | Sales: ${salesTotal.toLocaleString()}.` +
    ` Investigate now.`;

  await Promise.all([
    hulyCreateIssue({ project: 'FIN', title, description, priority: 'urgent' }),
    hulyPostMessage(HULY_CHANNELS.ALL_ALERTS, alertMsg),
  ]);
}

// ── Trigger: Daily Pulse (cron) ───────────────────────────────────────────────
// Vercel Cron: GET /api/huly-agent?trigger=daily_pulse  at 0 16 * * * (19:00 EAT)

async function handleDailyPulse(): Promise<void> {
  const db   = serverSupabase();
  const date = todayUTC();

  const [prodRes, cashRes, qcFailRes, invRes] = await Promise.all([
    // Production: all batch logs for today
    db.from('maji_daily_logs')
      .select('jars_produced, daily_target, product_type')
      .eq('log_date', date),

    // Finance: cash vs sales for today
    db.from('maji_daily_logs')
      .select('cash_collected, sales_total')
      .eq('log_date', date)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // QC: any failures today?
    db.from('daily_checklists')
      .select('test_type, result, value')
      .eq('check_date', date)
      .eq('result', 'fail'),

    // Inventory: latest stock snapshot for today
    db.from('inventory_logs')
      .select('item_type, quantity')
      .eq('log_date', date)
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  // ── Production ──────────────────────────────────────────────────────────
  const prodRows     = prodRes.data ?? [];
  const totalFilled  = prodRows.reduce((s, r) => s + Number(r.jars_produced ?? 0), 0);
  const target       = prodRows[0]?.daily_target ?? null;
  const prodLine     = target !== null
    ? `${totalFilled} / ${target} jars ${totalFilled >= Number(target) ? '✅' : '⚠️ below target'}`
    : `${totalFilled} jars (no target set)`;

  // ── Finance ─────────────────────────────────────────────────────────────
  const cashRow     = cashRes.data;
  const cash        = cashRow ? `UGX ${Number(cashRow.cash_collected ?? 0).toLocaleString()}` : '— no data';
  const salesCalc   = cashRow ? `UGX ${Number(cashRow.sales_total ?? 0).toLocaleString()}`    : '— no data';
  const mismatch    = cashRow
    ? Math.abs(Number(cashRow.cash_collected ?? 0) - Number(cashRow.sales_total ?? 0))
    : 0;
  const finLine     = mismatch > 5000
    ? `Cash: ${cash} | Sales: ${salesCalc} ⚠️ variance UGX ${mismatch.toLocaleString()}`
    : `Cash: ${cash} | Sales: ${salesCalc} ✅`;

  // ── QC ──────────────────────────────────────────────────────────────────
  const fails    = qcFailRes.data ?? [];
  const qcLine   = fails.length === 0
    ? '✅ All tests passed'
    : `🚨 ${fails.length} failure(s): ${fails.map(r => `${r.test_type} (${r.value})`).join(', ')}`;

  // ── Inventory ────────────────────────────────────────────────────────────
  // Deduplicate to latest entry per item_type
  const latestByItem = new Map<string, number>();
  for (const row of invRes.data ?? []) {
    const key = String(row.item_type);
    if (!latestByItem.has(key)) latestByItem.set(key, Number(row.quantity));
  }
  const alerts = [...latestByItem.entries()].filter(([item, qty]) => {
    const min = INVENTORY_MINIMUMS[item];
    return min !== undefined && qty < min;
  });
  const invLine = alerts.length === 0
    ? '✅ All stock above minimums'
    : `⚠️ Low stock: ${alerts.map(([item, qty]) => `${item} (${qty})`).join(', ')}`;

  // ── Compose pulse message ────────────────────────────────────────────────
  const pulse = [
    `📊 *MAJI SAFI DAILY PULSE — ${date}*`,
    ``,
    `🏭 *Production*`,
    `   ${prodLine}`,
    ``,
    `💵 *Finance*`,
    `   ${finLine}`,
    ``,
    `🧪 *Quality Control*`,
    `   ${qcLine}`,
    ``,
    `📦 *Inventory*`,
    `   ${invLine}`,
    ``,
    `_Powered by SAFI OS · ${new Date().toLocaleTimeString('en-UG', { timeZone: 'Africa/Kampala', hour: '2-digit', minute: '2-digit' })} EAT_`,
  ].join('\n');

  await hulyPostMessage(HULY_CHANNELS.DAILY_PULSE, pulse);
}

// ── Supabase webhook payload shape ───────────────────────────────────────────

interface WebhookPayload {
  type:       'INSERT' | 'UPDATE' | 'DELETE';
  table:      string;
  schema:     string;
  record:     Record<string, unknown>;
  old_record: Record<string, unknown> | null;
}

// ── Route: GET (Vercel Cron) ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trigger = req.nextUrl.searchParams.get('trigger');

  if (trigger === 'daily_pulse') {
    await handleDailyPulse();
    return NextResponse.json({ ok: true, trigger: 'daily_pulse' });
  }

  return NextResponse.json(
    { error: `Unknown trigger: ${trigger}` },
    { status: 400 }
  );
}

// ── Route: POST (Supabase Webhooks) ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trigger = req.nextUrl.searchParams.get('trigger');

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { record } = payload;

  switch (trigger) {
    case 'qc_fail':
      // Guard: only act on actual failures (webhook may fire on all inserts)
      if (String(record.result ?? '').toLowerCase() === 'fail') {
        await handleQcFail(record);
      }
      break;

    case 'inventory_low':
      await handleInventoryLow(record);
      break;

    case 'cash_mismatch':
      await handleCashMismatch(record);
      break;

    default:
      return NextResponse.json(
        { error: `Unknown trigger: ${trigger}` },
        { status: 400 }
      );
  }

  return NextResponse.json({ ok: true, trigger });
}
