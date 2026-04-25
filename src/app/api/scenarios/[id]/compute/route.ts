import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Load scenario + overrides
  const { data: scenario } = await supabase
    .from('scenarios')
    .select('*')
    .eq('id', id)
    .single();

  if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });

  const { data: overrides } = await supabase
    .from('scenario_overrides')
    .select('*, products(name, sku)')
    .eq('scenario_id', id);

  const period = scenario.base_period;
  const start = `${period}-01`;
  const [y, m] = period.split('-').map(Number);
  const end = new Date(y, m, 0).toISOString().slice(0, 10);

  // Load base actuals
  const [salesRes, txnRes, productRes, econRes, pricingRes] = await Promise.all([
    supabase.from('sales_ledger').select('amount_ugx, jars_sold').eq('location_id', 'buziga').gte('sale_date', start).lte('sale_date', end),
    supabase.from('transactions').select('category, amount_ugx, transaction_type').eq('location_id', 'buziga').eq('transaction_type', 'expense').gte('transaction_date', start).lte('transaction_date', end),
    supabase.from('products').select('id, name, sku').eq('active', true),
    supabase.from('product_unit_economics').select('product_id, cost_ugx').lte('effective_from', end).or('effective_to.is.null,effective_to.gte.' + start),
    supabase.from('product_pricing').select('product_id, tier, price_ugx').lte('effective_from', end).or('effective_to.is.null,effective_to.gte.' + start),
  ]);

  const baseRevenue = (salesRes.data ?? []).reduce((a, r) => a + Number(r.amount_ugx), 0);
  const baseJars = (salesRes.data ?? []).reduce((a, r) => a + Number(r.jars_sold), 0);

  const expenses = txnRes.data ?? [];
  const baseOpExByCategory: Record<string, number> = {};
  for (const t of expenses) {
    baseOpExByCategory[t.category] = (baseOpExByCategory[t.category] ?? 0) + Number(t.amount_ugx);
  }
  const baseOpEx = Object.values(baseOpExByCategory).reduce((a, v) => a + v, 0);

  // Apply overrides
  let scenarioRevenue = baseRevenue;
  let scenarioJars = baseJars;
  const scenarioOpExByCategory = { ...baseOpExByCategory };

  // Build product overrides map
  const productPriceOverrides: Record<string, number> = {};
  const productCogsOverrides: Record<string, number> = {};

  for (const ov of overrides ?? []) {
    if (ov.override_type === 'revenue_pct_change') {
      scenarioRevenue = baseRevenue * (1 + ov.override_value / 100);
    } else if (ov.override_type === 'opex_pct_change') {
      for (const cat of Object.keys(scenarioOpExByCategory)) {
        scenarioOpExByCategory[cat] *= (1 + ov.override_value / 100);
      }
    } else if (ov.override_type === 'opex_category_ugx' && ov.category) {
      scenarioOpExByCategory[ov.category] = ov.override_value;
    } else if (ov.override_type === 'jars_per_day') {
      scenarioJars = ov.override_value * 30;
      // Proportionally scale revenue if base jars > 0
      if (baseJars > 0) {
        scenarioRevenue = baseRevenue * (scenarioJars / baseJars);
      }
    } else if (ov.override_type === 'price_t2_ugx' && ov.product_id) {
      productPriceOverrides[ov.product_id] = ov.override_value;
    } else if (ov.override_type === 'cogs_ugx' && ov.product_id) {
      productCogsOverrides[ov.product_id] = ov.override_value;
    }
  }

  const scenarioOpEx = Object.values(scenarioOpExByCategory).reduce((a, v) => a + v, 0);
  const grossProfit = scenarioRevenue - scenarioOpEx;
  const netMarginPct = scenarioRevenue > 0 ? Math.round((grossProfit / scenarioRevenue) * 100) : 0;

  // Compute product margins under scenario
  const today = new Date().toISOString().slice(0, 10);
  const products = (productRes.data ?? []).map(p => {
    const cogs = productCogsOverrides[p.id] ??
      (econRes.data ?? []).filter(e => e.product_id === p.id).reduce((a, e) => a + e.cost_ugx, 0);
    const t2Price = productPriceOverrides[p.id] ??
      ((pricingRes.data ?? []).find(pr => pr.product_id === p.id && pr.tier === 'T2')?.price_ugx ?? 0);
    const margin = t2Price - cogs;
    return {
      id: p.id, sku: p.sku, name: p.name,
      price_ugx: t2Price, cogs_ugx: cogs,
      contribution_margin: margin,
      margin_pct: t2Price > 0 ? Math.round((margin / t2Price) * 100) : 0,
    };
  });

  return NextResponse.json({
    scenario_id: id,
    scenario_name: scenario.name,
    base_period: period,
    base: {
      revenue: baseRevenue,
      opex: baseOpEx,
      gross_profit: baseRevenue - baseOpEx,
      net_margin_pct: baseRevenue > 0 ? Math.round(((baseRevenue - baseOpEx) / baseRevenue) * 100) : 0,
      jars: baseJars,
    },
    scenario: {
      revenue: Math.round(scenarioRevenue),
      opex: Math.round(scenarioOpEx),
      opex_by_category: Object.fromEntries(
        Object.entries(scenarioOpExByCategory).map(([k, v]) => [k, Math.round(v)])
      ),
      gross_profit: Math.round(grossProfit),
      net_margin_pct: netMarginPct,
      jars: Math.round(scenarioJars),
    },
    delta: {
      revenue: Math.round(scenarioRevenue - baseRevenue),
      opex: Math.round(scenarioOpEx - baseOpEx),
      gross_profit: Math.round(grossProfit - (baseRevenue - baseOpEx)),
      net_margin_pct: netMarginPct - (baseRevenue > 0 ? Math.round(((baseRevenue - baseOpEx) / baseRevenue) * 100) : 0),
    },
    products,
    overrides: overrides ?? [],
    source_tag: `[source: sales_ledger + transactions + product_pricing, ${period}]`,
  });
}
