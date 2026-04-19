import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function sendTelegram(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telegram API error: ${err}`);
  }
  return res.json();
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [
      { data: prodData },
      { data: qcData },
      { data: salesData },
      { data: cashData },
      { data: invData },
      { data: compData },
    ] = await Promise.all([
      supabase.from('production_logs').select('jar_count').eq('location_id', 'buziga').eq('production_date', yesterday),
      supabase.from('water_tests').select('result').eq('location_id', 'buziga').gte('tested_at', yesterday).lt('tested_at', new Date().toISOString().split('T')[0]),
      supabase.from('sales_ledger').select('amount_ugx, jar_count').eq('location_id', 'buziga').eq('sale_date', yesterday),
      supabase.from('daily_cash').select('physical_cash_count_ugx, expected_cash_ugx').eq('location_id', 'buziga').eq('date', yesterday).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('inventory_items').select('item_name, quantity, reorder_threshold').eq('location_id', 'buziga'),
      supabase.from('compliance_records').select('document_name, expiry_date').eq('location_id', 'buziga').eq('status', 'active'),
    ]);

    const jarsProduced = prodData?.reduce((s, r) => s + (r.jar_count || 0), 0) ?? 0;
    const revenue = salesData?.reduce((s, r) => s + (r.amount_ugx || 0), 0) ?? 0;
    const jarsSold = salesData?.reduce((s, r) => s + (r.jar_count || 0), 0) ?? 0;

    const passCount = qcData?.filter((q) => q.result === 'PASS').length ?? 0;
    const totalTests = qcData?.length ?? 0;
    const passRate = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : null;

    const cashActual = cashData?.physical_cash_count_ugx ?? null;
    const cashExpected = cashData?.expected_cash_ugx ?? null;
    const cashVariance = cashActual !== null && cashExpected !== null ? cashActual - cashExpected : null;

    const lowStock = (invData ?? []).filter((i) => (i.quantity ?? 0) <= (i.reorder_threshold ?? 0));

    const today = new Date().toISOString().split('T')[0];
    const expiringItems = (compData ?? []).filter((c) => {
      if (!c.expiry_date) return false;
      const days = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / 86400000);
      return days <= 30;
    });

    const targetJars = 500;
    const jarStatus = jarsProduced >= targetJars ? '✅' : jarsProduced >= targetJars * 0.8 ? '⚠️' : '❌';
    const qcStatus = passRate === 100 ? '✅' : passRate !== null ? '⚠️' : '❓';
    const cashStatus = cashVariance === null ? '❓' : Math.abs(cashVariance) < 5000 ? '✅' : '⚠️';
    const stockStatus = lowStock.length === 0 ? '✅' : lowStock.length <= 2 ? '⚠️' : '❌';

    const lines: string[] = [
      `🌊 <b>Maji Safi Morning Brief — ${yesterday}</b>`,
      `<i>Safiflow Ventures · Buziga, Kampala</i>`,
      '',
      `<b>📦 PRODUCTION</b>`,
      `${jarStatus} Jars produced: <b>${jarsProduced.toLocaleString()}</b> / ${targetJars.toLocaleString()} target`,
      jarsProduced === 0 ? '   ⚠️ No production log recorded yesterday' : `   ${Math.round((jarsProduced / targetJars) * 100)}% of daily target`,
      '',
      `<b>🔬 QUALITY</b>`,
      passRate !== null
        ? `${qcStatus} Pass rate: <b>${passRate}%</b> (${passCount}/${totalTests} tests passed)`
        : `${qcStatus} No QC tests recorded yesterday`,
      '',
      `<b>💰 REVENUE &amp; CASH</b>`,
      revenue > 0
        ? `💵 Revenue: <b>UGX ${revenue.toLocaleString()}</b> (${jarsSold} jars sold)`
        : `💵 Revenue: No sales recorded yesterday`,
      cashActual !== null
        ? `${cashStatus} Cash count: UGX ${cashActual.toLocaleString()} ${cashVariance !== null ? `(variance: ${cashVariance >= 0 ? '+' : ''}${cashVariance.toLocaleString()})` : ''}`
        : `${cashStatus} No cash count recorded yesterday`,
      '',
      `<b>📦 INVENTORY</b>`,
      lowStock.length === 0
        ? `${stockStatus} All stock levels OK`
        : `${stockStatus} ${lowStock.length} item(s) below threshold:\n${lowStock.map((i) => `   • ${i.item_name}: ${i.quantity} remaining`).join('\n')}`,
      '',
    ];

    if (expiringItems.length > 0) {
      lines.push(`<b>⚠️ COMPLIANCE ALERTS</b>`);
      expiringItems.forEach((c) => {
        const days = Math.ceil((new Date(c.expiry_date!).getTime() - Date.now()) / 86400000);
        lines.push(`   🔴 ${c.document_name} — expires in ${days} days`);
      });
      lines.push('');
    }

    lines.push(`<b>🎯 TODAY'S FOCUS</b>`);
    if (jarsProduced < targetJars) lines.push(`   → Production gap: need ${(targetJars - jarsProduced).toLocaleString()} more jars to hit target`);
    if (passRate !== null && passRate < 100) lines.push(`   → QC: ${totalTests - passCount} test(s) failed — review batch before dispatch`);
    if (lowStock.length > 0) lines.push(`   → Reorder: ${lowStock.map((i) => i.item_name).join(', ')}`);
    if (jarsProduced >= targetJars && passRate === 100 && lowStock.length === 0) lines.push(`   ✨ All systems green — strong execution yesterday`);

    lines.push('');
    lines.push(`<i>Sent by Maji Safi OS · ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Africa/Kampala' })} EAT</i>`);

    const message = lines.join('\n');
    await sendTelegram(message);

    return NextResponse.json({ ok: true, sentAt: new Date().toISOString(), summary: { jarsProduced, revenue, passRate, lowStock: lowStock.length } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
