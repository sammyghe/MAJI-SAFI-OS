import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') ?? new Date().toISOString().slice(0, 7);
  const productId = searchParams.get('product_id');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const start = `${period}-01`;
  const [y, m] = period.split('-').map(Number);
  const end = new Date(y, m, 0).toISOString().slice(0, 10);

  // Revenue from sales_ledger
  const { data: sales } = await supabase
    .from('sales_ledger')
    .select('amount_ugx, jars_sold, distributor')
    .eq('location_id', 'buziga')
    .gte('sale_date', start)
    .lte('sale_date', end);

  const totalRevenue = (sales ?? []).reduce((a, r) => a + (Number(r.amount_ugx) || 0), 0);
  const totalJars = (sales ?? []).reduce((a, r) => a + (Number(r.jars_sold) || 0), 0);

  // OpEx from transactions
  let txnQuery = supabase
    .from('transactions')
    .select('category, amount_ugx, transaction_type, account_id')
    .eq('location_id', 'buziga')
    .gte('transaction_date', start)
    .lte('transaction_date', end);

  const { data: txns } = await txnQuery;

  const expenses = (txns ?? []).filter(t => t.transaction_type === 'expense');
  const totalOpEx = expenses.reduce((a, t) => a + (Number(t.amount_ugx) || 0), 0);

  // Group expenses by category
  const expenseByCategory: Record<string, number> = {};
  for (const t of expenses) {
    expenseByCategory[t.category] = (expenseByCategory[t.category] ?? 0) + Number(t.amount_ugx);
  }

  // Products with unit economics → compute COGS
  const today = new Date().toISOString().slice(0, 10);
  const { data: products } = await supabase.from('products').select('id, name, sku').eq('active', true);
  const { data: econRows } = await supabase
    .from('product_unit_economics')
    .select('product_id, cost_ugx')
    .lte('effective_from', today)
    .or('effective_to.is.null,effective_to.gte.' + today);
  const { data: pricings } = await supabase
    .from('product_pricing')
    .select('product_id, tier, price_ugx')
    .lte('effective_from', today)
    .or('effective_to.is.null,effective_to.gte.' + today);

  const productLines = (products ?? []).map(p => {
    const cogs = (econRows ?? []).filter(e => e.product_id === p.id).reduce((a, e) => a + e.cost_ugx, 0);
    const t2 = (pricings ?? []).find(pr => pr.product_id === p.id && pr.tier === 'T2');
    const price = t2?.price_ugx ?? 0;
    const margin = price - cogs;
    return { id: p.id, sku: p.sku, name: p.name, price_ugx: price, cogs_ugx: cogs, contribution_margin: margin, margin_pct: price > 0 ? Math.round((margin / price) * 100) : 0 };
  });

  const grossProfit = totalRevenue - totalOpEx;
  const netMargin = totalRevenue > 0 ? Math.round((grossProfit / totalRevenue) * 100) : 0;

  return NextResponse.json({
    period,
    revenue: { total: totalRevenue, jars_sold: totalJars, source_tag: `[source: sales_ledger, ${period}]` },
    opex: { total: totalOpEx, by_category: expenseByCategory, source_tag: `[source: transactions, ${period}]` },
    gross_profit: grossProfit,
    net_margin_pct: netMargin,
    products: productLines,
  });
}
