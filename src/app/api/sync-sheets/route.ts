import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function clearAndWrite(sheets: ReturnType<typeof google.sheets>, spreadsheetId: string, sheetName: string, rows: unknown[][]) {
  await sheets.spreadsheets.values.clear({ spreadsheetId, range: sheetName });
  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      requestBody: { values: rows },
    });
  }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    if (!spreadsheetId) return NextResponse.json({ error: 'GOOGLE_SHEETS_ID not set' }, { status: 500 });

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [
      { data: prodData },
      { data: qcData },
      { data: salesData },
      { data: invData },
      { data: cashData },
      { data: teamData },
      { data: compData },
      { data: dispData },
    ] = await Promise.all([
      supabase.from('production_logs').select('*').eq('location_id', 'buziga').gte('production_date', monthStart).order('production_date', { ascending: false }),
      supabase.from('water_tests').select('*').eq('location_id', 'buziga').gte('tested_at', monthStart).order('tested_at', { ascending: false }),
      supabase.from('sales_ledger').select('*').eq('location_id', 'buziga').gte('sale_date', monthStart).order('sale_date', { ascending: false }),
      supabase.from('inventory_items').select('*').eq('location_id', 'buziga').order('item_name'),
      supabase.from('daily_cash').select('*').eq('location_id', 'buziga').gte('date', monthStart).order('date', { ascending: false }),
      supabase.from('team_members').select('*').eq('location_id', 'buziga').order('name'),
      supabase.from('compliance_records').select('*').eq('location_id', 'buziga').order('expiry_date'),
      supabase.from('distributors').select('*').eq('location_id', 'buziga').order('name'),
    ]);

    const syncedAt = new Date().toISOString();

    // Tab 1: Production
    const prodRows: unknown[][] = [
      ['ID', 'Batch Number', 'Jar Count', 'Product Type', 'Production Date', 'Shift', 'Notes', 'Created At'],
      ...(prodData ?? []).map((r) => [r.id, r.batch_number ?? '', r.jar_count ?? 0, r.product_type ?? '', r.production_date ?? '', r.shift ?? '', r.notes ?? '', r.created_at ?? '']),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Production', prodRows);

    // Tab 2: Quality
    const qcRows: unknown[][] = [
      ['ID', 'Batch ID', 'Test Type', 'Reading', 'Threshold', 'Result', 'Tested By', 'Tested At'],
      ...(qcData ?? []).map((r) => [r.id, r.batch_id ?? '', r.test_type ?? '', r.reading ?? '', r.threshold ?? '', r.result ?? '', r.tested_by ?? '', r.tested_at ?? '']),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Quality', qcRows);

    // Tab 3: Sales
    const salesRows: unknown[][] = [
      ['ID', 'Sale Date', 'Amount UGX', 'Product Type', 'Tier', 'Distributor ID', 'Jar Count', 'Notes', 'Created At'],
      ...(salesData ?? []).map((r) => [r.id, r.sale_date ?? '', r.amount_ugx ?? 0, r.product_type ?? '', r.tier ?? '', r.distributor_id ?? '', r.jar_count ?? 0, r.notes ?? '', r.created_at ?? '']),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Sales', salesRows);

    // Tab 4: Inventory
    const invRows: unknown[][] = [
      ['ID', 'Item Name', 'Unit', 'Quantity', 'Reorder Threshold', 'Unit Cost UGX', 'Supplier', 'Updated At'],
      ...(invData ?? []).map((r) => [r.id, r.item_name ?? '', r.unit ?? '', r.quantity ?? 0, r.reorder_threshold ?? 0, r.unit_cost_ugx ?? 0, r.supplier ?? '', r.updated_at ?? '']),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Inventory', invRows);

    // Tab 5: Cash
    const cashRows: unknown[][] = [
      ['ID', 'Date', 'Physical Cash UGX', 'Expected Cash UGX', 'Variance UGX', 'Recorded By', 'Notes', 'Created At'],
      ...(cashData ?? []).map((r) => [r.id, r.date ?? '', r.physical_cash_count_ugx ?? 0, r.expected_cash_ugx ?? 0, (r.physical_cash_count_ugx ?? 0) - (r.expected_cash_ugx ?? 0), r.recorded_by ?? '', r.notes ?? '', r.created_at ?? '']),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Cash', cashRows);

    // Tab 6: Team
    const teamRows: unknown[][] = [
      ['ID', 'Name', 'Role', 'Department', 'Access Level', 'Contract Status', 'Phone', 'Hire Date'],
      ...(teamData ?? []).map((r) => [r.id, r.name ?? '', r.role ?? '', r.department_slug ?? '', r.access_level ?? '', r.contract_status ?? '', r.phone ?? '', r.hire_date ?? '']),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Team', teamRows);

    // Tab 7: Compliance
    const compRows: unknown[][] = [
      ['ID', 'Document Name', 'Type', 'Status', 'Expiry Date', 'Days Remaining', 'Issuing Body', 'Notes'],
      ...(compData ?? []).map((r) => {
        const expiry = r.expiry_date ? new Date(r.expiry_date) : null;
        const days = expiry ? Math.ceil((expiry.getTime() - Date.now()) / 86400000) : '';
        return [r.id, r.document_name ?? '', r.type ?? '', r.status ?? '', r.expiry_date ?? '', days, r.issuing_body ?? '', r.notes ?? ''];
      }),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Compliance', compRows);

    // Tab 8: Distributors
    const distRows: unknown[][] = [
      ['ID', 'Name', 'Phone', 'Zone', 'Tier', 'Status', 'Last Order Date', 'Total Orders', 'Notes'],
      ...(dispData ?? []).map((r) => [r.id, r.name ?? '', r.phone ?? '', r.zone ?? '', r.tier ?? '', r.status ?? '', r.last_order_date ?? '', r.total_orders ?? 0, r.notes ?? '']),
    ];
    await clearAndWrite(sheets, spreadsheetId, 'Distributors', distRows);

    return NextResponse.json({ ok: true, syncedAt, tabs: 8 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
