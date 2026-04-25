import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [bankRes, invoiceRes, salesRes] = await Promise.all([
    supabase.from('bank_accounts').select('name, currency, current_balance, last_reconciled_at').eq('active', true),
    supabase.from('supplier_invoices').select('amount, due_date, status').in('status', ['unpaid', 'partial', 'overdue']),
    supabase.from('sales_ledger').select('amount_ugx').eq('location_id', 'buziga').gte('sale_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
  ]);

  const cashOnHand = (bankRes.data ?? []).reduce((a, b) => a + (b.currency === 'UGX' ? b.current_balance : 0), 0);
  const apTotal = (invoiceRes.data ?? []).reduce((a, i) => a + (i.amount ?? 0), 0);

  // Runway: monthly burn from last 30d transactions
  const { data: txns30d } = await supabase
    .from('transactions')
    .select('amount_ugx, transaction_type')
    .eq('location_id', 'buziga')
    .eq('transaction_type', 'expense')
    .gte('transaction_date', new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));

  const monthlyBurn = (txns30d ?? []).reduce((a, t) => a + (Number(t.amount_ugx) || 0), 0);
  const runwayDays = monthlyBurn > 0 ? Math.round((cashOnHand / monthlyBurn) * 30) : null;

  const revenue30d = (salesRes.data ?? []).reduce((a, s) => a + (Number(s.amount_ugx) || 0), 0);

  return NextResponse.json({
    cash_on_hand_ugx: cashOnHand,
    accounts_payable_ugx: apTotal,
    revenue_30d_ugx: revenue30d,
    monthly_burn_ugx: monthlyBurn,
    runway_days: runwayDays,
    banks: bankRes.data ?? [],
    source_tag: `[source: bank_accounts + supplier_invoices, ${new Date().toISOString().slice(0, 10)}]`,
  });
}
