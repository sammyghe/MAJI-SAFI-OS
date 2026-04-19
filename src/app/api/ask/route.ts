import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const DEPT_CONTEXTS: Record<string, string> = {
  'founder-office': 'You are the Founder Office AI for Maji Safi. You see patterns across all 9 departments. You summarize risks, opportunities, and decisions. You are a strategist.',
  'production': 'You are the Production AI for Maji Safi. You speak in numbers and batch IDs. You help log jars, track machine uptime, and monitor daily output. Target: 500 jars/day.',
  'quality': 'You are the Quality AI for Maji Safi. You are strict, protocol-driven, zero tolerance. You enforce UNBS standards. TDS threshold is 150 ppm. A FAIL halts the batch immediately.',
  'inventory': 'You are the Inventory AI for Maji Safi. You track every jar, cap, label, and chemical. You trigger reorder alerts below threshold. You track stock value. No stockouts.',
  'dispatch': 'You are the Dispatch AI for Maji Safi. You track sales, cash collection, distributor deliveries. Cash must match system at EOD. You are relationship-focused and revenue-driven.',
  'marketing': 'You are the Marketing AI for Maji Safi. You manage the distributor pipeline (T1 wholesale only at launch). Target: 3 T1 prospects per week. You track sleeping distributors.',
  'finance': 'You are the Finance AI for Maji Safi. You are sharp, numbers-first. Break-even is 220-240 jars/day. Every number you state MUST end with [source: table_name row id, YYYY-MM-DD]. If no data exists, say: "I don\'t have data for this — please enter it." Never estimate.',
  'compliance': 'You are the Compliance AI for Maji Safi. You are deadline-obsessed. You track UNBS certificates, employment contracts, business registration. Alert 30 days before expiry.',
  'technology': 'You are the Technology AI for Maji Safi. You are the meta-agent — you know every department. You monitor system health, data completeness, and integrations.',
};

const SYSTEM_BASE = `You are SAFI, the AI assistant for Maji Safi OS — a water purification operations platform in Buziga, Kampala, Uganda run by Safiflow Ventures Group Limited.

Key facts:
- 9 departments: founder-office, production, quality, inventory, dispatch, marketing, finance, compliance, technology
- Product: 20L purified water jars (Refill, Single-Use, Reusable) and 5L Single-Use
- Capacity: 6,000 LPH, ~2,000 jars/day maximum
- Break-even: ~220-240 jars/day
- Month 1 target: 500 jars/day, T1 wholesale only
- Location: buziga, Kampala
- Commercial launch: May 3, 2026
- Currency: UGX (Ugandan Shilling)

ANTI-HALLUCINATION RULE (Finance & Inventory): Every number MUST end with [source: table_name row id, YYYY-MM-DD]. If you don't have the source row, say: "I don't have data for this — please enter it." Never estimate, extrapolate, or average.

Be concise, actionable, and specific to Maji Safi operations. If a question is about a department you don't have data for, say what data would be needed.`;

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { question, department, context } = await req.json();
    if (!question?.trim()) return NextResponse.json({ error: 'No question provided' }, { status: 400 });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });

    // Pull relevant live data for context
    const today = new Date().toISOString().split('T')[0];
    let liveContext = '';

    if (department === 'finance' || department === 'founder-office') {
      const { data: salesData } = await supabase
        .from('sales_ledger')
        .select('id, amount_ugx, sale_date, product_type')
        .eq('location_id', 'buziga')
        .eq('sale_date', today)
        .order('created_at', { ascending: false })
        .limit(5);
      if (salesData?.length) {
        liveContext += `\nToday's sales (${today}):\n`;
        salesData.forEach((s) => {
          liveContext += `  - UGX ${(s.amount_ugx ?? 0).toLocaleString()} | ${s.product_type ?? 'N/A'} [source: sales_ledger row ${s.id?.slice(0, 8)}, ${s.sale_date}]\n`;
        });
      }
    }

    if (department === 'production' || department === 'founder-office') {
      const { data: prodData } = await supabase
        .from('production_logs')
        .select('id, jar_count, batch_number, production_date, product_type')
        .eq('location_id', 'buziga')
        .eq('production_date', today)
        .order('created_at', { ascending: false })
        .limit(5);
      if (prodData?.length) {
        liveContext += `\nToday's production (${today}):\n`;
        prodData.forEach((p) => {
          liveContext += `  - Batch ${p.batch_number ?? 'N/A'}: ${p.jar_count ?? 0} jars | ${p.product_type ?? 'N/A'} [source: production_logs row ${p.id?.slice(0, 8)}, ${p.production_date}]\n`;
        });
      }
    }

    if (department === 'inventory') {
      const { data: invData } = await supabase
        .from('inventory_items')
        .select('id, item_name, quantity, reorder_threshold, unit_cost_ugx, updated_at')
        .eq('location_id', 'buziga')
        .order('quantity');
      if (invData?.length) {
        liveContext += `\nCurrent inventory:\n`;
        invData.forEach((i) => {
          const flag = (i.quantity ?? 0) <= (i.reorder_threshold ?? 0) ? ' ⚠️ BELOW THRESHOLD' : '';
          liveContext += `  - ${i.item_name}: ${i.quantity ?? 0} units${flag} [source: inventory_items row ${i.id?.slice(0, 8)}, ${i.updated_at?.split('T')[0] ?? today}]\n`;
        });
      }
    }

    if (department === 'quality') {
      const { data: qcData } = await supabase
        .from('water_tests')
        .select('id, test_type, reading, threshold, result, tested_at')
        .eq('location_id', 'buziga')
        .gte('tested_at', today)
        .order('tested_at', { ascending: false });
      if (qcData?.length) {
        liveContext += `\nToday's QC tests:\n`;
        qcData.forEach((q) => {
          liveContext += `  - ${q.test_type ?? 'Test'}: ${q.reading ?? 'N/A'} (threshold: ${q.threshold ?? 150}) → ${q.result ?? 'N/A'} [source: water_tests row ${q.id?.slice(0, 8)}, ${q.tested_at?.split('T')[0] ?? today}]\n`;
        });
      }
    }

    const deptSystemPrompt = department && DEPT_CONTEXTS[department]
      ? `\n\nDEPARTMENT CONTEXT: ${DEPT_CONTEXTS[department]}`
      : '';

    const userContextStr = context ? `\n\nPAGE CONTEXT: ${JSON.stringify(context)}` : '';
    const liveContextStr = liveContext ? `\n\nLIVE DATA FROM DATABASE:${liveContext}` : '';

    const fullSystem = SYSTEM_BASE + deptSystemPrompt + userContextStr + liveContextStr;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: fullSystem,
    });

    const result = await model.generateContent(question);
    const answer = result.response.text();

    return NextResponse.json({ answer, department: department ?? 'general' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
