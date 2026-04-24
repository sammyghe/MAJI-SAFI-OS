import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';

const DEPT_CONTEXTS: Record<string, string> = {
  'founder-office': 'You are the Founder Office AI for Maji Safi. You see patterns across all 10 departments. You summarize risks, opportunities, and decisions. You are a strategist.',
  'production':     'You are the Production AI for Maji Safi. You speak in numbers and batch IDs. You help log jars, track machine uptime, and monitor daily output. Target: 500 jars/day.',
  'quality':        'You are the Quality AI for Maji Safi. You are strict, protocol-driven, zero tolerance. You enforce UNBS standards. TDS threshold is 150 ppm. A FAIL halts the batch immediately.',
  'inventory':      'You are the Inventory AI for Maji Safi. You track every jar, cap, label, and chemical. You trigger reorder alerts below threshold. No stockouts.',
  'dispatch':       'You are the Dispatch AI for Maji Safi. You track deliveries and EOD cash reconciliation. Cash must match system at EOD.',
  'sales':          'You are the Sales AI for Maji Safi. You track revenue, distributor deals, and pipeline. Follow-up obsessed. Sleeping distributors get priority.',
  'marketing':      'You are the Marketing AI for Maji Safi. You manage the distributor pipeline (T1 wholesale only at launch). Target: 3 T1 prospects per week.',
  'finance':        'You are the Finance AI for Maji Safi. You are sharp, numbers-first. Break-even is 220-240 jars/day. Every number you state MUST end with [source: table_name row id, YYYY-MM-DD]. If no data exists, say: "I don\'t have data for this — please enter it." Never estimate.',
  'compliance':     'You are the Compliance AI for Maji Safi. You are deadline-obsessed. You track UNBS certificates, employment contracts, business registration. Alert 30 days before expiry.',
  'technology':     'You are the Technology AI for Maji Safi. You are the meta-agent — you know every department. You monitor system health, data completeness, and integrations.',
};

const SYSTEM_BASE = `You are SAFI, the AI assistant for Maji Safi OS — a water purification operations platform in Buziga, Kampala, Uganda run by Safiflow Ventures Group Limited.

Key facts:
- 10 departments: founder-office, production, quality, inventory, dispatch, sales, marketing, finance, compliance, technology
- Product: 20L purified water jars (Refill, Single-Use, Reusable) and 5L Single-Use
- Capacity: 6,000 LPH, ~2,000 jars/day maximum
- Break-even: ~220-240 jars/day
- Month 1 target: 500 jars/day, T1 wholesale only
- Location: buziga, Kampala
- Commercial launch: May 3, 2026
- Currency: UGX (Ugandan Shilling)

ANTI-HALLUCINATION RULE (Finance & Inventory): Every number MUST end with [source: table_name row id, YYYY-MM-DD]. If you don't have the source row, say: "I don't have data for this — please enter it." Never estimate, extrapolate, or average.

Be concise, actionable, and specific to Maji Safi operations.`;

async function tryGroq(systemPrompt: string, question: string): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');
  const client = new Groq({ apiKey: key });
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: question },
    ],
    max_tokens: 1024,
    temperature: 0.4,
  });
  const text = completion.choices[0]?.message?.content;
  if (!text) throw new Error('Groq returned empty response');
  return text;
}

async function tryGemini(systemPrompt: string, question: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash-preview-04-17',
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(question);
  const text = result.response.text();
  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { question, department, context } = await req.json();
    if (!question?.trim()) return NextResponse.json({ error: 'No question provided' }, { status: 400 });

    const today = new Date().toISOString().split('T')[0];
    let liveContext = '';

    // Pull live data per department
    if (department === 'finance' || department === 'founder-office') {
      const { data } = await supabase.from('sales_ledger').select('id, amount_ugx, sale_date, product_type').eq('location_id', 'buziga').eq('sale_date', today).order('created_at', { ascending: false }).limit(5);
      if (data?.length) {
        liveContext += `\nToday's sales (${today}):\n`;
        data.forEach((s) => { liveContext += `  - UGX ${(s.amount_ugx ?? 0).toLocaleString()} | ${s.product_type ?? 'N/A'} [source: sales_ledger row ${s.id?.slice(0, 8)}, ${s.sale_date}]\n`; });
      }
    }
    if (department === 'production' || department === 'founder-office') {
      const { data } = await supabase.from('production_logs').select('id, jar_count, batch_id, production_date, product_type').eq('location_id', 'buziga').eq('production_date', today).order('created_at', { ascending: false }).limit(5);
      if (data?.length) {
        liveContext += `\nToday's production (${today}):\n`;
        data.forEach((p) => { liveContext += `  - Batch ${p.batch_id ?? 'N/A'}: ${p.jar_count ?? 0} jars | ${p.product_type ?? 'N/A'} [source: production_logs row ${p.id?.slice(0, 8)}, ${p.production_date}]\n`; });
      }
    }
    if (department === 'inventory') {
      const { data } = await supabase.from('inventory_items').select('id, item_name, quantity, reorder_threshold, updated_at').eq('location_id', 'buziga').order('quantity');
      if (data?.length) {
        liveContext += `\nCurrent inventory:\n`;
        data.forEach((i) => { liveContext += `  - ${i.item_name}: ${i.quantity ?? 0} units${(i.quantity ?? 0) <= (i.reorder_threshold ?? 0) ? ' ⚠️ BELOW THRESHOLD' : ''} [source: inventory_items row ${i.id?.slice(0, 8)}, ${i.updated_at?.split('T')[0] ?? today}]\n`; });
      }
    }
    if (department === 'quality') {
      const { data } = await supabase.from('water_tests').select('id, test_type, reading, threshold, result, tested_at').eq('location_id', 'buziga').gte('tested_at', today).order('tested_at', { ascending: false });
      if (data?.length) {
        liveContext += `\nToday's QC tests:\n`;
        data.forEach((q) => { liveContext += `  - ${q.test_type ?? 'Test'}: ${q.reading ?? 'N/A'} (threshold: ${q.threshold ?? 150}) → ${q.result ?? 'N/A'} [source: water_tests row ${q.id?.slice(0, 8)}, ${q.tested_at?.split('T')[0] ?? today}]\n`; });
      }
    }
    if (department === 'sales' || department === 'dispatch') {
      const { data } = await supabase.from('sales_ledger').select('id, amount_ugx, sale_date, product_type, jar_count, logged_by').eq('location_id', 'buziga').eq('sale_date', today).order('created_at', { ascending: false }).limit(10);
      if (data?.length) {
        liveContext += `\nToday's sales:\n`;
        data.forEach((s) => { liveContext += `  - ${s.logged_by ?? 'Unknown'}: UGX ${(s.amount_ugx ?? 0).toLocaleString()} | ${s.jar_count ?? 0} × ${s.product_type ?? 'N/A'} [source: sales_ledger row ${s.id?.slice(0, 8)}, ${s.sale_date}]\n`; });
      }
    }

    // Try to load soul system prompt from DB
    let soulPrompt = '';
    if (department) {
      const { data: soulData } = await supabase.from('department_souls').select('system_prompt, primary_provider, fallback_provider').eq('department_slug', department).maybeSingle();
      if (soulData?.system_prompt) soulPrompt = `\n\nDEPARTMENT SOUL:\n${soulData.system_prompt}`;
    }

    const deptFallback = department && DEPT_CONTEXTS[department] ? `\n\nDEPARTMENT CONTEXT: ${DEPT_CONTEXTS[department]}` : '';
    const contextStr = context ? `\n\nPAGE CONTEXT: ${JSON.stringify(context)}` : '';
    const liveStr = liveContext ? `\n\nLIVE DATA FROM DATABASE:${liveContext}` : '';

    const fullSystem = SYSTEM_BASE + (soulPrompt || deptFallback) + contextStr + liveStr;

    // Fallback chain: Groq → Gemini → offline
    let answer = '';
    let provider: 'groq' | 'gemini' | 'offline' = 'offline';

    try {
      answer = await tryGroq(fullSystem, question);
      provider = 'groq';
    } catch (groqErr) {
      if (process.env.NODE_ENV === 'development') console.error('Groq failed:', groqErr);
      try {
        answer = await tryGemini(fullSystem, question);
        provider = 'gemini';
      } catch (geminiErr) {
        if (process.env.NODE_ENV === 'development') console.error('Gemini failed:', geminiErr);
        answer = 'SAFI is temporarily offline. Your input is saved. Try again in a moment.';
        provider = 'offline';
      }
    }

    return NextResponse.json({ answer, provider, department: department ?? 'general' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
