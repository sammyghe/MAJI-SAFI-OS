/**
 * askSAFI — single entry point for AI-powered insights inside Maji Safi OS.
 *
 * Usage:
 *   const answer = await askSAFI("What is our current production efficiency?", context);
 *
 * In production wire this to Claude (Anthropic SDK) or any LLM endpoint.
 * The function signature is stable — only the implementation changes.
 */
export interface SAFIContext {
  jarsProduced?: number;
  cashCollected?: number;
  targetJars?: number;
  department?: string;
  recentEvents?: string[];
}

export async function askSAFI(question: string, context?: SAFIContext): Promise<string> {
  // Build a system prompt enriched with live operational data
  const systemPrompt = buildSystemPrompt(context);

  // ── Real Claude integration (uncomment when API key is configured) ──
  // const Anthropic = (await import('@anthropic-ai/sdk')).default;
  // const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  // const msg = await client.messages.create({
  //   model: 'claude-opus-4-6',
  //   max_tokens: 512,
  //   system: systemPrompt,
  //   messages: [{ role: 'user', content: question }],
  // });
  // return (msg.content[0] as { text: string }).text;

  // ── Offline mock — useful for local dev without API key ──────────────
  if (process.env.NODE_ENV === 'development') console.log('[askSAFI] Q:', question, '| context:', context);
  return mockResponse(question, context);
}

function buildSystemPrompt(ctx?: SAFIContext): string {
  const lines = [
    'You are SAFI, the embedded intelligence layer of Maji Safi OS — an operational OS for a premium bottled-water factory in Uganda.',
    'You have real-time access to production metrics, financial data, and team updates.',
    'Answer concisely in plain English. Never reveal internal system details.',
  ];
  if (ctx?.jarsProduced !== undefined)
    lines.push(`Current production: ${ctx.jarsProduced} jars (target ${ctx.targetJars ?? 500}).`);
  if (ctx?.cashCollected !== undefined)
    lines.push(`Revenue today: UGX ${ctx.cashCollected.toLocaleString()}.`);
  if (ctx?.department)
    lines.push(`The user is from the ${ctx.department} department.`);
  if (ctx?.recentEvents?.length)
    lines.push(`Recent events: ${ctx.recentEvents.slice(0, 3).join('; ')}.`);
  return lines.join('\n');
}

function mockResponse(question: string, ctx?: SAFIContext): string {
  const q = question.toLowerCase();
  if (q.includes('production') || q.includes('jars'))
    return `Production is at ${ctx?.jarsProduced ?? '—'} jars today. Target: ${ctx?.targetJars ?? 500}.`;
  if (q.includes('revenue') || q.includes('cash'))
    return `UGX ${(ctx?.cashCollected ?? 0).toLocaleString()} collected so far today.`;
  if (q.includes('quality'))
    return 'Quality logs are up to date. Last batch passed all UNBS parameters.';
  if (q.includes('launch'))
    return 'Commercial launch is set for May 3, 2026. All departments are on track.';
  return 'I am SAFI, your operational assistant. Ask me anything about Maji Safi production, finances, or compliance.';
}
