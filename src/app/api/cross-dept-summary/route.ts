import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Returns cross-department summary cards for a given target department.
// Each card represents one active information_relationship where
// target_dept_slug = the requesting dept.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetDept = searchParams.get('dept');
  if (!targetDept) return NextResponse.json([], { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load active relationships targeting this department
  const { data: relationships } = await supabase
    .from('information_relationships')
    .select('*')
    .eq('target_dept_slug', targetDept)
    .eq('active', true)
    .in('share_type', ['summary', 'alert', 'detail'])
    .order('share_type');

  if (!relationships?.length) return NextResponse.json([]);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  // For each relationship, compute a summary value from entity_table
  const cards = await Promise.all(
    relationships.map(async (rel) => {
      let value: string | number = '—';
      let unit = '';
      let updatedAt = new Date().toISOString();

      try {
        const tbl = rel.entity_table as string | null;
        if (!tbl) return null;

        if (tbl === 'production_logs') {
          const { data } = await supabase
            .from('production_logs')
            .select('jar_count, production_date')
            .eq('location_id', 'buziga')
            .eq('production_date', today);
          const total = (data ?? []).reduce((s: number, r: any) => s + (r.jar_count ?? 0), 0);
          value = total;
          unit = 'jars today';
          updatedAt = data?.[0]?.production_date ?? today;

        } else if (tbl === 'water_tests') {
          const { data } = await supabase
            .from('water_tests')
            .select('result')
            .eq('location_id', 'buziga')
            .gte('tested_at', today);
          const total = (data ?? []).length;
          const pass = (data ?? []).filter((t: any) => t.result === 'PASS').length;
          value = total > 0 ? `${Math.round((pass / total) * 100)}%` : 'No tests';
          unit = 'QC pass rate today';

        } else if (tbl === 'sales_ledger') {
          const { data } = await supabase
            .from('sales_ledger')
            .select('amount_ugx, jars_sold')
            .eq('location_id', 'buziga')
            .gte('sale_date', monthStart);
          const rev = (data ?? []).reduce((s: number, r: any) => s + Number(r.amount_ugx ?? 0), 0);
          const jars = (data ?? []).reduce((s: number, r: any) => s + Number(r.jars_sold ?? 0), 0);
          value = Math.round(rev / 1000);
          unit = `K UGX revenue MTD (${jars} jars)`;

        } else if (tbl === 'inventory_items') {
          const filter = rel.entity_filter as Record<string, string> | null;
          let q = supabase.from('inventory_items').select('item_name, quantity, reorder_threshold').eq('location_id', 'buziga');
          if (filter?.item_type) q = q.eq('category', filter.item_type);
          const { data } = await q;
          const low = (data ?? []).filter((i: any) => i.quantity <= i.reorder_threshold).length;
          value = low;
          unit = `item${low !== 1 ? 's' : ''} below reorder threshold`;

        } else if (tbl === 'distributors') {
          const filter = rel.entity_filter as Record<string, string> | null;
          let q = supabase.from('distributors').select('id, status').eq('location_id', 'buziga');
          if (filter?.status) q = q.eq('status', filter.status);
          const { data } = await q;
          value = (data ?? []).length;
          const statusLabel = filter?.status ?? 'total';
          unit = `${statusLabel} distributor${value !== 1 ? 's' : ''}`;

        } else if (tbl === 'transactions') {
          const filter = rel.entity_filter as Record<string, string> | null;
          let q = supabase.from('transactions').select('amount_ugx').eq('location_id', 'buziga').gte('transaction_date', monthStart);
          if (filter?.category) q = q.eq('category', filter.category);
          const { data } = await q;
          const total = (data ?? []).reduce((s: number, r: any) => s + Number(r.amount_ugx ?? 0), 0);
          value = Math.round(total / 1000);
          unit = `K UGX ${filter?.category ?? 'expenses'} MTD`;

        } else if (tbl === 'compliance_records') {
          const { data } = await supabase
            .from('compliance_records')
            .select('expiry_date, document_name')
            .eq('location_id', 'buziga')
            .lte('expiry_date', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))
            .gte('expiry_date', today);
          value = (data ?? []).length;
          unit = `item${value !== 1 ? 's' : ''} expiring within 30 days`;

        } else if (tbl === 'bank_accounts') {
          const { data } = await supabase
            .from('bank_accounts')
            .select('current_balance, currency')
            .eq('active', true);
          const ugx = (data ?? []).filter((b: any) => b.currency === 'UGX').reduce((s: number, b: any) => s + Number(b.current_balance ?? 0), 0);
          value = Math.round(ugx / 1000);
          unit = 'K UGX cash on hand';

        } else if (tbl === 'issues') {
          const { data } = await supabase
            .from('issues')
            .select('id, stage, priority')
            .eq('location_id', 'buziga')
            .neq('stage', 'resolved');
          value = (data ?? []).length;
          unit = `open issue${value !== 1 ? 's' : ''}`;

        } else if (tbl === 'rocks') {
          const q = today.slice(0, 4) + '-Q' + Math.ceil((new Date().getMonth() + 1) / 3);
          const { data } = await supabase
            .from('rocks')
            .select('id, status')
            .eq('location_id', 'buziga')
            .eq('quarter', q);
          const onTrack = (data ?? []).filter((r: any) => r.status === 'on_track' || r.status === 'complete').length;
          value = `${onTrack}/${(data ?? []).length}`;
          unit = 'rocks on track this quarter';

        } else {
          // Generic: count rows
          const { count } = await supabase.from(tbl).select('id', { count: 'exact', head: true });
          value = count ?? 0;
          unit = `${tbl} records`;
        }
      } catch {
        value = '—';
      }

      return {
        id: rel.id,
        source_dept: rel.source_dept_slug,
        data_category: rel.data_category,
        share_type: rel.share_type,
        entity_table: rel.entity_table,
        why_shared: rel.why_shared,
        refresh_frequency: rel.refresh_frequency,
        value,
        unit,
        updated_at: updatedAt,
      };
    })
  );

  return NextResponse.json(cards.filter(Boolean));
}
