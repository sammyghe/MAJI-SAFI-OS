import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Default role data for legacy users without role_id assigned
const FOUNDER_DEFAULTS = {
  role_slug: 'founder',
  landing_page: '/home/founder',
  permissions: { all: true },
  sidebar_items: ['home','founder-office','production','quality','inventory','dispatch','sales','marketing','finance','compliance','technology','investor','settings'],
  ui_density: 'normal',
};

const GENERIC_DEFAULTS = {
  role_slug: 'lead_operator',
  landing_page: '/home/operator',
  permissions: { departments: ['production','quality'], scope: 'own_shift' },
  sidebar_items: ['home','production','quality'],
  ui_density: 'large',
};

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

    // Determine role
    const isFounder =
      member.access_level === 'founder' ||
      (member.department_slug ?? '').startsWith('founder');

    const legacyRole = isFounder ? 'founder' : (member.access_level ?? 'operator');

    // Load role from roles table if role_id is set
    let roleData: { role_slug: string; landing_page: string; permissions: any; sidebar_items: any; ui_density: string } | null = null;
    if (member.role_id) {
      const { data: rd } = await supabase
        .from('roles')
        .select('slug, landing_page, permissions, sidebar_items, ui_density')
        .eq('id', member.role_id)
        .maybeSingle();
      if (rd) roleData = { role_slug: rd.slug, landing_page: rd.landing_page, permissions: rd.permissions, sidebar_items: rd.sidebar_items, ui_density: rd.ui_density };
    }

    // Fallback: if no role assigned, use legacy-derived defaults
    const defaults = isFounder ? FOUNDER_DEFAULTS : GENERIC_DEFAULTS;
    const resolved = roleData ?? defaults;

    // Successful login
    await supabase.from('pin_attempts').insert({ ip_address: ip, success: true });
    await supabase.from('login_audit').insert({
      user_id: member.id,
      user_name: member.name,
      ip_address: ip,
      user_agent: userAgent,
      success: true,
    });

    return NextResponse.json({
      id: member.id,
      name: member.name,
      role: legacyRole,
      role_slug: resolved.role_slug,
      department_slug: member.department_slug,
      departments: member.departments || [],
      phone: member.phone,
      landing_page: resolved.landing_page,
      permissions: resolved.permissions,
      sidebar_items: resolved.sidebar_items,
      ui_density: resolved.ui_density,
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.error('PIN auth error:', error);
    try { await supabase.from('login_audit').insert({ ip_address: ip, user_agent: userAgent, success: false }); } catch {}
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
