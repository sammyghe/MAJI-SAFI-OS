import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LOCATION = 'buziga';


function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfDay(daysBack = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function determineStatus(
  actual: number | null,
  target: number | null,
  warning: number | null,
  critical: number | null,
  higherIsBetter: boolean
): 'on_track' | 'at_risk' | 'off_track' | 'no_data' {
  if (actual === null || actual === undefined) return 'no_data';
  if (target === null) return 'no_data';

  if (higherIsBetter) {
    if (critical !== null && actual <= critical) return 'off_track';
    if (warning !== null && actual <= warning) return 'at_risk';
    return 'on_track';
  } else {
    // lower is better (e.g. open CAPAs, expiring docs)
    if (critical !== null && actual >= critical) return 'off_track';
    if (warning !== null && actual >= warning) return 'at_risk';
    return 'on_track';
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function computeKPI(supabase: any, kpi: any): Promise<number | null> {
  const q = kpi.source_query as Record<string, any>;
  const table = kpi.source_table as string;
  const daysBack = q.days_back as number | undefined;
  const since = daysBack ? startOfDay(daysBack) : startOfDay(0);

  try {
    if (q.agg === 'sum') {
      const field = q.field as string;
      const filter = q.filter as Record<string, any> | undefined;
      let query = supabase
        .from(table)
        .select(field)
        .eq('location_id', LOCATION)
        .gte('created_at', since);
      if (filter) {
        for (const [k, v] of Object.entries(filter)) {
          if (Array.isArray(v)) query = query.in(k, v);
          else query = query.eq(k, v);
        }
      }
      const { data } = await query;
      if (!data) return null;
      return data.reduce((acc: number, row: any) => acc + (Number(row[field]) || 0), 0);
    }

    if (q.agg === 'count') {
      const filter = q.filter as Record<string, any> | undefined;
      const daysAhead = q.days_ahead as number | undefined;
      let query = supabase
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('location_id', LOCATION);
      if (!daysAhead) query = query.gte('created_at', since);
      if (daysAhead) {
        const future = new Date();
        future.setDate(future.getDate() + daysAhead);
        query = query.lte(q.expiry_field ?? 'due_date', future.toISOString().slice(0, 10));
        query = query.gte(q.expiry_field ?? 'due_date', todayISO());
      }
      if (filter) {
        for (const [k, v] of Object.entries(filter)) {
          if (Array.isArray(v)) query = query.in(k, v);
          else query = query.eq(k, v);
        }
      }
      const { count } = await query;
      return count ?? 0;
    }

    if (q.agg === 'pass_rate') {
      const resultField = q.result_field as string;
      const passValue = q.pass_value as string;
      const { data } = await supabase
        .from(table)
        .select(resultField)
        .eq('location_id', LOCATION)
        .gte('created_at', since);
      if (!data || data.length === 0) return null;
      const passes = data.filter((r: any) => r[resultField] === passValue).length;
      return Math.round((passes / data.length) * 100);
    }

    if (q.agg === 'pnl_calc') {
      const revenueTypes = q.revenue_types as string[];
      const costTypes = q.cost_types as string[];
      const [revRes, costRes] = await Promise.all([
        supabase.from(table).select('amount').eq('location_id', LOCATION).in('transaction_type', revenueTypes).gte('created_at', since),
        supabase.from(table).select('amount').eq('location_id', LOCATION).in('transaction_type', costTypes).gte('created_at', since),
      ]);
      const revenue = (revRes.data ?? []).reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0);
      const costs = (costRes.data ?? []).reduce((a: number, r: any) => a + (Number(r.amount) || 0), 0);
      return revenue - costs;
    }

    if (q.agg === 'break_even_pct') {
      const breakEvenJars = q.break_even_jars as number;
      const { data } = await supabase
        .from(table)
        .select(q.target_field)
        .eq('location_id', LOCATION)
        .gte('created_at', since);
      if (!data) return null;
      const total = data.reduce((a: number, r: any) => a + (Number(r[q.target_field]) || 0), 0);
      return Math.round((total / breakEvenJars) * 100);
    }

    // For complex aggs without direct queries (uptime, recon, stock days),
    // return null — these need manual data entry or domain-specific tables
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const today = todayISO();

  const { data: kpis, error: kpiErr } = await supabase
    .from('kpi_definitions')
    .select('*')
    .eq('location_id', LOCATION)
    .eq('is_active', true);

  if (kpiErr || !kpis) {
    return NextResponse.json({ error: 'Failed to load KPI definitions' }, { status: 500 });
  }

  const results: { slug: string; actual: number | null; status: string }[] = [];

  for (const kpi of kpis) {
    const actual = await computeKPI(supabase, kpi);
    const status = determineStatus(
      actual,
      kpi.target_value,
      kpi.warning_threshold,
      kpi.critical_threshold,
      kpi.higher_is_better
    );

    await supabase.from('scorecard_snapshots').upsert(
      {
        location_id: LOCATION,
        kpi_slug: kpi.slug,
        period_date: today,
        period_type: kpi.cadence === 'daily' ? 'daily' : kpi.cadence,
        actual_value: actual,
        target_value: kpi.target_value,
        status,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'location_id,kpi_slug,period_date,period_type' }
    );

    results.push({ slug: kpi.slug, actual, status });
  }

  return NextResponse.json({ computed: results.length, date: today, results });
}
