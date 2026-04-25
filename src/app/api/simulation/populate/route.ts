import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const T1_PRICES: Record<string, number> = {
  '20L Refill': 3000, '20L Single-Use': 7500, '20L Reusable Jar': 15000, '5L Single-Use': 2800,
};
const PRODUCT_TYPES = Object.keys(T1_PRICES);

const DISTRIBUTORS_SEED = [
  { name: 'Kato Enterprises',     zone: 'Buziga',    tier: 'T1', status: 'active' },
  { name: 'Nakato Water Depot',   zone: 'Kansanga',  tier: 'T1', status: 'active' },
  { name: 'Ssemwogerere Bros',    zone: 'Makindye',  tier: 'T1', status: 'active' },
  { name: 'Kabanda Supplies',     zone: 'Namuwongo', tier: 'T1', status: 'active' },
  { name: 'Mirembe Shop',         zone: 'Muyenga',   tier: 'T1', status: 'active' },
  { name: 'Turyamureeba General', zone: 'Buziga',    tier: 'T1', status: 'active' },
  { name: 'Namukasa Trading',     zone: 'Kansanga',  tier: 'T1', status: 'active' },
  { name: 'Okello Distributors',  zone: 'Makindye',  tier: 'T1', status: 'active' },
  { name: 'Namutebi Stores',      zone: 'Namuwongo', tier: 'T1', status: 'active' },
  { name: 'Lwanga Water Co',      zone: 'Muyenga',   tier: 'T1', status: 'active' },
  { name: 'Mukasa Brothers',      zone: 'Buziga',    tier: 'T1', status: 'sleeping' },
  { name: 'Nakirya Depot',        zone: 'Kansanga',  tier: 'T1', status: 'sleeping' },
  { name: 'Ssali Wholesale',      zone: 'Makindye',  tier: 'T1', status: 'sleeping' },
  { name: 'Apio Supplies',        zone: 'Namuwongo', tier: 'T1', status: 'churned' },
  { name: 'Byarugaba Traders',    zone: 'Muyenga',   tier: 'T1', status: 'churned' },
];

const QC_TESTS = ['TDS', 'pH', 'Turbidity', 'Chlorine', 'Bacteria'];
const QC_PASS_THRESHOLDS: Record<string, { min: number; max: number }> = {
  TDS:       { min: 0,   max: 150 },
  pH:        { min: 6.5, max: 8.5 },
  Turbidity: { min: 0,   max: 1   },
  Chlorine:  { min: 0.2, max: 0.5 },
  Bacteria:  { min: 0,   max: 0   },
};

function randBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min: number, max: number, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function toDate(d: Date) {
  return d.toISOString().split('T')[0];
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Founder-only check via PIN token in header
    const authHeader = req.headers.get('x-user-role');
    if (authHeader !== 'founder') {
      return NextResponse.json({ error: 'Founder access required' }, { status: 403 });
    }

    const { data: simSettings } = await supabase
      .from('simulation_settings')
      .select('is_active')
      .eq('location_id', 'buziga')
      .maybeSingle();

    if (simSettings?.is_active) {
      return NextResponse.json({ error: 'Simulation already active — clear first' }, { status: 409 });
    }

    const today = new Date();
    const startDate = addDays(today, -30);
    const counts = { production_logs: 0, water_tests: 0, sales_ledger: 0, daily_cash: 0, distributors: 0, events: 0, capa_records: 0, transactions: 0 };

    // 1. Insert distributors
    const { data: insertedDists, error: distErr } = await supabase
      .from('distributors')
      .insert(DISTRIBUTORS_SEED.map((d) => ({ ...d, location_id: 'buziga', is_simulated: true })))
      .select('id, name, status');
    if (distErr) throw new Error(`Distributors: ${distErr.message}`);
    counts.distributors = insertedDists?.length ?? 0;

    const activeDists = insertedDists?.filter((d) => d.status === 'active') ?? [];

    // 2. Generate 30 days of data
    const prodLogs: any[] = [];
    const waterTests: any[] = [];
    const salesRows: any[] = [];
    const cashRows: any[] = [];
    const eventRows: any[] = [];
    const capaRows: any[] = [];
    const txnRows: any[] = [];

    for (let day = 0; day < 30; day++) {
      const date = addDays(startDate, day);
      const dateStr = toDate(date);
      const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Production: 450-520 weekday, 320-380 weekend
      const targetJars = isWeekend ? randBetween(320, 380) : randBetween(450, 520);
      const batchCount = randBetween(3, 6);
      const jarsPerBatch = Math.floor(targetJars / batchCount);
      let batchSeq = 1;

      for (let b = 0; b < batchCount; b++) {
        const jars = b === batchCount - 1 ? targetJars - jarsPerBatch * (batchCount - 1) : jarsPerBatch;
        const product = PRODUCT_TYPES[b % PRODUCT_TYPES.length];
        const seq = String(batchSeq).padStart(3, '0');
        const batchId = `BATCH-${dateStr.replace(/-/g, '')}-${seq}`;
        batchSeq++;

        prodLogs.push({
          batch_id: batchId,
          jar_count: jars,
          product_type: product,
          operator_name: b % 2 === 0 ? 'Bosco' : 'Amos',
          location_id: 'buziga',
          production_date: dateStr,
          status: 'created',
          is_simulated: true,
        });

        eventRows.push({
          location_id: 'buziga',
          event_type: 'batch_created',
          department: 'production',
          batch_id: batchId,
          severity: 'info',
          is_simulated: true,
          payload: { jar_count: jars, product_type: product, operator: b % 2 === 0 ? 'Bosco' : 'Amos' },
        });
      }

      // QC: 5 tests/day, 95% pass (1 fail roughly every 20 days)
      const shouldFail = day % 20 === 7; // cluster failures naturally
      for (const testType of QC_TESTS) {
        const thr = QC_PASS_THRESHOLDS[testType];
        let reading: number;
        let passed: boolean;

        if (shouldFail && testType === 'TDS') {
          reading = randFloat(155, 175); // intentionally over threshold
          passed = false;
        } else {
          switch (testType) {
            case 'TDS':       reading = randFloat(80, 140); break;
            case 'pH':        reading = randFloat(6.8, 8.2, 2); break;
            case 'Turbidity': reading = randFloat(0.1, 0.8, 2); break;
            case 'Chlorine':  reading = randFloat(0.25, 0.45, 2); break;
            case 'Bacteria':  reading = 0; break;
            default:          reading = 0;
          }
          passed = reading >= thr.min && reading <= thr.max;
        }

        const result = passed ? 'PASS' : 'FAIL';
        const batchRef = prodLogs[prodLogs.length - batchCount]?.batch_id ?? 'SIM-BATCH';

        waterTests.push({
          batch_id: batchRef,
          test_type: testType,
          reading,
          threshold: thr.max,
          result,
          tested_by: 'Amos',
          location_id: 'buziga',
          tested_at: `${dateStr}T08:${String(30 + QC_TESTS.indexOf(testType) * 10).padStart(2, '0')}:00+03:00`,
          is_simulated: true,
        });

        if (!passed) {
          eventRows.push({
            location_id: 'buziga',
            event_type: 'qc_fail',
            department: 'quality',
            batch_id: batchRef,
            severity: 'critical',
            is_simulated: true,
            payload: { test_type: testType, reading, threshold: thr.max },
          });
          capaRows.push({
            batch_id: batchRef,
            test_type: testType,
            reading,
            status: day < 20 ? 'closed' : 'open',
            resolution_notes: day < 20 ? 'Filter cleaned and batch re-run. Retest passed.' : null,
            resolved_at: day < 20 ? `${dateStr}T16:00:00+03:00` : null,
            location_id: 'buziga',
            is_simulated: true,
          });
        }
      }

      // Sales: 5-10 transactions/day spread across active distributors
      const salesCount = randBetween(5, 10);
      let dayRevenue = 0;
      for (let s = 0; s < salesCount; s++) {
        const dist = activeDists[s % activeDists.length];
        const product = PRODUCT_TYPES[s % PRODUCT_TYPES.length];
        const jars = randBetween(10, 80);
        const amount = jars * T1_PRICES[product];
        dayRevenue += amount;
        salesRows.push({
          distributor_id: dist?.id,
          distributor: dist?.name ?? 'Unknown',
          product_type: product,
          jar_count: jars,
          jars_sold: jars,
          amount_ugx: amount,
          tier: 'T1',
          sale_date: dateStr,
          location_id: 'buziga',
          logged_by: 'Bosco',
          is_simulated: true,
        });
      }

      // Daily expense transactions (OpEx seed for P&L)
      const OPEX_SEED = [
        { category: 'Chemicals', amount: randBetween(15000, 25000) },
        { category: 'Salaries', amount: day === 0 ? 650000 : 0 },  // once/month
        { category: 'Utilities', amount: day % 7 === 0 ? 45000 : 0 },
        { category: 'Transport', amount: randBetween(5000, 12000) },
      ];
      for (const exp of OPEX_SEED) {
        if (exp.amount === 0) continue;
        txnRows.push({
          transaction_date: dateStr,
          transaction_type: 'expense',
          category: exp.category,
          amount_ugx: exp.amount,
          description: `Simulated ${exp.category}`,
          recorded_by: 'founder',
          location_id: 'buziga',
          is_simulated: true,
        });
      }

      // Daily cash: physical close to expected with ±5000 variance
      const variance = randBetween(-5000, 5000);
      cashRows.push({
        date: dateStr,
        physical_cash_count_ugx: dayRevenue + variance,
        expected_cash_ugx: dayRevenue,
        recorded_by: 'Bosco',
        location_id: 'buziga',
        is_simulated: true,
      });
    }

    // Batch insert all data
    if (prodLogs.length) {
      const { error } = await supabase.from('production_logs').insert(prodLogs);
      if (error) throw new Error(`production_logs: ${error.message}`);
      counts.production_logs = prodLogs.length;
    }
    if (waterTests.length) {
      const { error } = await supabase.from('water_tests').insert(waterTests);
      if (error) throw new Error(`water_tests: ${error.message}`);
      counts.water_tests = waterTests.length;
    }
    if (salesRows.length) {
      const { error } = await supabase.from('sales_ledger').insert(salesRows);
      if (error) throw new Error(`sales_ledger: ${error.message}`);
      counts.sales_ledger = salesRows.length;
    }
    if (cashRows.length) {
      const { error } = await supabase.from('daily_cash').insert(cashRows);
      if (error) throw new Error(`daily_cash: ${error.message}`);
    }
    if (eventRows.length) {
      const { error } = await supabase.from('events').insert(eventRows);
      if (error) throw new Error(`events: ${error.message}`);
      counts.events = eventRows.length;
    }
    if (capaRows.length) {
      const { error } = await supabase.from('capa_records').insert(capaRows);
      if (error) throw new Error(`capa_records: ${error.message}`);
      counts.capa_records = capaRows.length;
    }
    if (txnRows.length) {
      const { error } = await supabase.from('transactions').insert(txnRows);
      if (error) throw new Error(`transactions: ${error.message}`);
      counts.transactions = txnRows.length;
    }

    // Seed a simulated bank account for cash position
    await supabase.from('bank_accounts').upsert({
      name: 'Simulation Account (Stanbic)',
      currency: 'UGX',
      current_balance: 8500000,
      active: true,
      is_simulated: true,
    } as any, { onConflict: 'name' });

    // Seed one scenario
    await supabase.from('scenarios').insert({
      name: 'Sim: 2x Volume',
      description: 'What if jars/day doubled during this simulation period?',
      base_period: new Date().toISOString().slice(0, 7),
      created_by: 'simulation',
      is_simulated: true,
    } as any).select().single();

    // Mark simulation active
    await supabase
      .from('simulation_settings')
      .update({ is_active: true, activated_by: 'founder', activated_at: new Date().toISOString(), deactivated_at: null, row_counts: counts })
      .eq('location_id', 'buziga');

    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
