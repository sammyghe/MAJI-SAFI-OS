import { supabase } from './supabase';

interface LogActivityParams {
  user_id?: string;
  activity_type: string;
  entity_type: string;
  entity_id?: string;
  entity_name?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  visibility?: 'all' | 'department' | 'role' | 'private';
  visibility_target?: string;
}

export async function logActivity(params: LogActivityParams) {
  const { error } = await supabase.from('user_activity').insert({
    user_id: params.user_id ?? null,
    activity_type: params.activity_type,
    entity_type: params.entity_type,
    entity_id: params.entity_id ?? null,
    entity_name: params.entity_name ?? null,
    description: params.description ?? null,
    metadata: params.metadata ?? {},
    visibility: params.visibility ?? 'all',
    visibility_target: params.visibility_target ?? null,
  });
  if (error && process.env.NODE_ENV === 'development') {
    console.error('logActivity error:', error);
  }
}

export async function getActivityForUser(
  userId: string,
  since: string,
  limit = 50
) {
  const { data } = await supabase
    .from('user_activity')
    .select('*')
    .gte('created_at', since)
    .or(`visibility.eq.all,and(visibility.eq.private,visibility_target.eq.${userId})`)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getActivitySinceLastLogin(userId: string) {
  // Find the second-most-recent session (the one before current)
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('login_at, logout_at')
    .eq('user_id', userId)
    .order('login_at', { ascending: false })
    .limit(3);

  const prevSession = sessions?.[1];
  const since = prevSession?.logout_at ?? prevSession?.login_at
    ?? new Date(Date.now() - 24 * 3600 * 1000).toISOString();

  return getActivityForUser(userId, since, 30);
}

export async function markRead(activityId: string, userId: string) {
  const { data } = await supabase
    .from('user_activity')
    .select('read_by')
    .eq('id', activityId)
    .single();

  const readBy: { user_id: string; read_at: string }[] = data?.read_by ?? [];
  if (readBy.some((r) => r.user_id === userId)) return;

  await supabase
    .from('user_activity')
    .update({ read_by: [...readBy, { user_id: userId, read_at: new Date().toISOString() }] })
    .eq('id', activityId);
}
