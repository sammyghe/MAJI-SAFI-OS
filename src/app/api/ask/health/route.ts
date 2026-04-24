import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';

const PING = 'Say hello in 3 words.';

async function checkGroq(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return { ok: false, ms: 0, error: 'GROQ_API_KEY not set' };
  const t = Date.now();
  try {
    const client = new Groq({ apiKey: key });
    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: PING }],
      max_tokens: 20,
    });
    if (!completion.choices[0]?.message?.content) throw new Error('empty response');
    return { ok: true, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkGemini(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, ms: 0, error: 'GEMINI_API_KEY not set' };
  const t = Date.now();
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-preview-04-17' });
    const result = await model.generateContent(PING);
    if (!result.response.text()) throw new Error('empty response');
    return { ok: true, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkClaude(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, ms: 0, error: 'ANTHROPIC_API_KEY not set' };
  const t = Date.now();
  try {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{ role: 'user', content: PING }],
    });
    const block = msg.content[0];
    if (!block || block.type !== 'text') throw new Error('empty response');
    return { ok: true, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const [groq, gemini, claude] = await Promise.all([checkGroq(), checkGemini(), checkClaude()]);

  const anyWorking = groq.ok || gemini.ok || claude.ok;
  const activeProvider = groq.ok ? 'groq' : gemini.ok ? 'gemini' : claude.ok ? 'claude' : 'offline';

  return NextResponse.json(
    {
      status: anyWorking ? 'ok' : 'degraded',
      active_provider: activeProvider,
      checked_at: new Date().toISOString(),
      providers: { groq, gemini, claude },
    },
    { status: anyWorking ? 200 : 503 }
  );
}
