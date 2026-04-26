import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { team_member_id, member_name } = await req.json();
  if (!team_member_id) return NextResponse.json({ error: 'team_member_id required' }, { status: 400 });

  const { data: defs } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('active', true);
  if (!defs?.length) return NextResponse.json({ earned: [] });

  const { data: already } = await supabase
    .from('worker_achievements')
    .select('achievement_definition_id')
    .eq('team_member_id', team_member_id);
  const alreadySet = new Set((already ?? []).map((r) => r.achievement_definition_id));

  const today = new Date().toISOString().split('T')[0];
  const monthStart = `${today.slice(0, 7)}-01`;
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  // Fetch required data
  const [batchRes, qcRes, qcMonthRes, shiftsRes] = await Promise.all([
    supabase.from('production_logs').select('id', { count: 'exact', head: true })
      .eq('operator_name', member_name ?? '').eq('location_id', 'buziga'),
    supabase.from('water_tests').select('result')
      .eq('tested_by', member_name ?? '').eq('location_id', 'buziga')
      .gte('tested_at', sevenDaysAgo),
    supabase.from('water_tests').select('result')
      .eq('tested_by', member_name ?? '').eq('location_id', 'buziga')
      .gte('tested_at', thirtyDaysAgo),
    supabase.from('shifts').select('id', { count: 'exact', head: true })
      .eq('team_member_id', team_member_id).eq('status', 'ended')
      .gte('shift_date', thirtyDaysAgo.slice(0, 10)),
  ]);

  const totalBatches = batchRes.count ?? 0;
  const qc7 = qcRes.data ?? [];
  const qc30 = qcMonthRes.data ?? [];
  const attendanceCount = shiftsRes.count ?? 0;

  const evaluate = (def: any): boolean => {
    const rule = def.trigger_rule as any;
    if (!rule?.type) return false;
    if (rule.type === 'milestone') {
      if (rule.metric === 'batches') return totalBatches >= rule.threshold;
    }
    if (rule.type === 'streak') {
      if (rule.metric === 'qc_pass_rate') {
        const pool = rule.threshold <= 7 ? qc7 : qc30;
        return pool.length > 0 && pool.every((t) => t.result === 'PASS');
      }
      if (rule.metric === 'attendance') return attendanceCount >= rule.threshold;
    }
    return false;
  };

  const newlyEarned: any[] = [];
  for (const def of defs) {
    if (alreadySet.has(def.id)) continue;
    if (evaluate(def)) {
      const { data: row } = await supabase
        .from('worker_achievements')
        .insert([{
          team_member_id,
          achievement_definition_id: def.id,
          context: { batches: totalBatches, attendance: attendanceCount },
        }])
        .select()
        .single();
      if (row) newlyEarned.push({ ...def, earned_at: row.earned_at });
    }
  }

  return NextResponse.json({ earned: newlyEarned });
}
