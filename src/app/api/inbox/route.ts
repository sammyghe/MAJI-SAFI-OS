import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('user_id');
  if (!userId) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Find last logout time from user_sessions (second most recent session's logout)
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('login_at, logout_at')
    .eq('user_id', userId)
    .order('login_at', { ascending: false })
    .limit(5);

  // The "since" timestamp: last session's logout, or 24h ago if never logged out
  let since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  if (sessions && sessions.length >= 2) {
    const lastLogout = sessions[1]?.logout_at;
    if (lastLogout) since = lastLogout;
  }

  // Load activity since last visit
  const { data: activities } = await supabase
    .from('user_activity')
    .select('*')
    .gte('created_at', since)
    .in('visibility', ['all'])
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({
    since,
    activities: activities ?? [],
    unread_count: (activities ?? []).filter(a => !((a.read_by as string[]) ?? []).includes(userId)).length,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { activity_id, user_id } = body;
  if (!activity_id || !user_id) return NextResponse.json({ error: 'activity_id and user_id required' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: existing } = await supabase.from('user_activity').select('read_by').eq('id', activity_id).single();
  const readBy: string[] = (existing?.read_by as string[]) ?? [];
  if (!readBy.includes(user_id)) readBy.push(user_id);

  await supabase.from('user_activity').update({ read_by: readBy }).eq('id', activity_id);
  return NextResponse.json({ ok: true });
}
