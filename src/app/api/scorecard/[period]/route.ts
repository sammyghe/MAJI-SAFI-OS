import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  _request: NextRequest,
  { params }: { params: { period: string } }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const period = params.period; // 'today' | 'YYYY-MM-DD'
  const date = period === 'today' ? new Date().toISOString().slice(0, 10) : period;

  const { data: snapshots, error: snapErr } = await supabase
    .from('scorecard_snapshots')
    .select('kpi_slug, actual_value, target_value, status, computed_at, notes')
    .eq('location_id', 'buziga')
    .eq('period_date', date)
    .order('computed_at', { ascending: false });

  const { data: kpis, error: kpiErr } = await supabase
    .from('kpi_definitions')
    .select('slug, name, department_slug, unit, display_format, sort_order, higher_is_better')
    .eq('location_id', 'buziga')
    .eq('is_active', true)
    .order('department_slug')
    .order('sort_order');

  if (kpiErr) return NextResponse.json({ error: 'Failed to load KPIs' }, { status: 500 });

  const snapshotMap = new Map((snapshots ?? []).map((s) => [s.kpi_slug, s]));

  const rows = (kpis ?? []).map((k) => {
    const snap = snapshotMap.get(k.slug);
    return {
      slug: k.slug,
      name: k.name,
      department_slug: k.department_slug,
      unit: k.unit,
      display_format: k.display_format,
      sort_order: k.sort_order,
      higher_is_better: k.higher_is_better,
      actual_value: snap?.actual_value ?? null,
      target_value: snap?.target_value ?? null,
      status: snap?.status ?? 'no_data',
      computed_at: snap?.computed_at ?? null,
      notes: snap?.notes ?? null,
    };
  });

  const byDept: Record<string, typeof rows> = {};
  for (const row of rows) {
    if (!byDept[row.department_slug]) byDept[row.department_slug] = [];
    byDept[row.department_slug].push(row);
  }

  return NextResponse.json({ date, by_department: byDept, all: rows });
}
