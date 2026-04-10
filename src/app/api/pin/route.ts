import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/pin
 * Body: { role: string; pin: string }
 * Returns: { ok: true; department_slug: string } or { ok: false; error: string }
 *
 * PIN comparison uses a simple hash here. In production, replace with bcrypt:
 *   import bcrypt from 'bcryptjs';
 *   const match = await bcrypt.compare(pin, row.pin_hash);
 */

function simpleHash(input: string): string {
  // Deterministic but NOT cryptographically safe — swap for bcrypt in production
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return String(Math.abs(hash));
}

export async function POST(req: NextRequest) {
  try {
    const { role, pin } = (await req.json()) as { role?: string; pin?: string };
    if (!role || !pin) {
      return NextResponse.json({ ok: false, error: 'Missing role or pin' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('user_pins')
      .select('*')
      .eq('role', role)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'Role not found' }, { status: 404 });
    }

    // Compare — swap simpleHash for bcrypt.compare in production
    const hash = simpleHash(pin);
    if (data.pin_hash !== hash) {
      return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
    }

    // Update last login
    await supabase.from('user_pins').update({ last_login: new Date().toISOString() }).eq('role', role);

    const response = NextResponse.json({ ok: true, department_slug: data.department_slug });
    response.cookies.set('maji_user_role', role, { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch {
    return NextResponse.json({ ok: false, error: 'Server error' }, { status: 500 });
  }
}
