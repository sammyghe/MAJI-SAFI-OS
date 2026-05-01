import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function GET() {
  const startTime = Date.now();
  const health: any = {
    status: 'ok',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',
    timestamp: new Date().toISOString(),
  };

  // Check Supabase
  try {
    const { data, error } = await supabase.from('team_members').select('id').limit(1);
    health.supabase = error ? { status: 'error', error: error.message } : { status: 'ok' };
  } catch (err: any) {
    health.supabase = { status: 'error', error: err.message };
  }

  // Check AI providers
  const aiStatus: Record<string, any> = {};

  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      });
      aiStatus.groq = res.ok ? 'ok' : 'error';
    } catch {
      aiStatus.groq = 'timeout';
    }
  }

  if (process.env.GEMINI_API_KEY) {
    aiStatus.gemini = 'configured';
  }

  if (process.env.ANTHROPIC_API_KEY) {
    aiStatus.anthropic = 'configured';
  }

  health.ai = aiStatus;
  health.latency = `${Date.now() - startTime}ms`;

  const isHealthy = health.supabase?.status === 'ok' && Object.keys(aiStatus).length > 0;
  
  return Response.json(health, {
    status: isHealthy ? 200 : 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}
