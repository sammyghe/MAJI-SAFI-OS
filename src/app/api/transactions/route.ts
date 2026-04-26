import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canViewDetail } from '@/lib/permissions';
import type { User } from '@/components/AuthProvider';

// Permission-aware transactions endpoint.
// Passes x-user-role and x-user-departments headers from client.
// Finance/founders → full row detail.
// Other roles → aggregate only (totals by category, no amount_ugx per row).

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? new Date().toISOString().slice(0, 7);
  const category = searchParams.get('category');

  // Read user context from headers (set by client via fetch)
  const userRole = request.headers.get('x-user-role') ?? 'operator';
  const userDepts = (request.headers.get('x-user-departments') ?? '').split(',').filter(Boolean);
  const canFinancials = request.headers.get('x-can-view-financials') === 'true';

  const user = {
    role: userRole,
    departments: userDepts,
    permissions: { departments: userDepts, can_view_financials: canFinancials },
  } as unknown as User;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const start = `${period}-01`;
  const [y, m] = period.split('-').map(Number);
  const end = new Date(y, m, 0).toISOString().slice(0, 10);

  const hasDetail = canViewDetail(user, 'transactions');

  if (hasDetail) {
    // Full row-level access
    let q = supabase
      .from('transactions')
      .select('*')
      .eq('location_id', 'buziga')
      .gte('transaction_date', start)
      .lte('transaction_date', end)
      .order('transaction_date', { ascending: false });
    if (category) q = q.eq('category', category);
    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      access: 'detail',
      period,
      transactions: data ?? [],
      source_tag: `[source: transactions, ${period}]`,
    });
  }

  // Summary access — return totals by category only, no individual amounts
  let q = supabase
    .from('transactions')
    .select('category, transaction_type, amount_ugx')
    .eq('location_id', 'buziga')
    .gte('transaction_date', start)
    .lte('transaction_date', end);

  // Marketing role: only their budget category
  if (userDepts.includes('marketing') && !userDepts.includes('finance')) {
    q = q.eq('category', 'Marketing');
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Aggregate by category
  const byCategory: Record<string, number> = {};
  for (const t of data ?? []) {
    if (t.transaction_type === 'expense') {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + Number(t.amount_ugx ?? 0);
    }
  }

  return NextResponse.json({
    access: 'summary',
    period,
    totals_by_category: byCategory,
    total_opex: Object.values(byCategory).reduce((a, v) => a + v, 0),
    source_tag: `[source: transactions (summary), ${period}]`,
  });
}
