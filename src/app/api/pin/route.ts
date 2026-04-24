import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') ?? '';

  try {
    const { pin } = await request.json();

    if (!pin || pin.length !== 4) {
      return NextResponse.json({ error: 'Invalid PIN format' }, { status: 400 });
    }

    // Brute-force check: max 5 failures in 15 minutes
    const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const { count: failCount } = await supabase
      .from('pin_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip_address', ip)
      .eq('success', false)
      .gte('attempted_at', windowStart);

    if ((failCount ?? 0) >= 5) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again in 1 hour.' },
        { status: 429 }
      );
    }

    // Query team_members by PIN
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('pin', pin)
      .eq('contract_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      if (process.env.NODE_ENV === 'development') console.error('Supabase error:', error);
      await supabase.from('pin_attempts').insert({ ip_address: ip, success: false });
      await supabase.from('login_audit').insert({ ip_address: ip, user_agent: userAgent, success: false });
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    const member = data?.[0];

    if (!member) {
      await supabase.from('pin_attempts').insert({ ip_address: ip, success: false });
      await supabase.from('login_audit').insert({ ip_address: ip, user_agent: userAgent, success: false });
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    // Successful login
    await supabase.from('pin_attempts').insert({ ip_address: ip, success: true });
    await supabase.from('login_audit').insert({
      user_id: member.id,
      user_name: member.name,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
    });

    const isFounder =
      member.access_level === 'founder' ||
      (member.department_slug ?? '').startsWith('founder');

    return NextResponse.json({
      id: member.id,
      name: member.name,
      role: isFounder ? 'founder' : member.access_level,
      department_slug: member.department_slug,
      departments: member.departments || [],
      phone: member.phone,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('PIN auth error:', error);
    try { await supabase.from('login_audit').insert({ ip_address: ip, user_agent: userAgent, success: false }); } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
