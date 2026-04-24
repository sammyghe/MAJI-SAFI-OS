import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SIM_TABLES = [
  'production_logs', 'water_tests', 'sales_ledger', 'inventory_items',
  'daily_cash', 'transactions', 'distributors', 'events', 'capa_records',
] as const;

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const authHeader = req.headers.get('x-user-role');
    if (authHeader !== 'founder') {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 });
    }

    const deleted: Record<string, number> = {};

    for (const table of SIM_TABLES) {
      const { count, error } = await supabase
        .from(table)
        .delete({ count: 'exact' })
        .eq('is_simulated', true)
        .eq('location_id', 'buziga');

      if (error) {
        if (process.env.NODE_ENV === 'development') console.error(`Clear ${table}:`, error.message);
      } else {
        deleted[table] = count ?? 0;
      }
    }

    await supabase
      .from('simulation_settings')
      .update({ is_active: false, deactivated_at: new Date().toISOString(), row_counts: {} })
      .eq('location_id', 'buziga');

    return NextResponse.json({ ok: true, deleted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
