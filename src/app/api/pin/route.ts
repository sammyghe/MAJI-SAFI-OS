import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json();

    if (!pin || pin.length !== 4) {
      return NextResponse.json(
        { error: 'Invalid PIN format' },
        { status: 400 }
      );
    }

    // Query team_members table by PIN
    // Uses contract_status (not 'status') and limit(1) to handle duplicate seed rows
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('pin', pin)
      .eq('contract_status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    const member = data?.[0];
    if (!member) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Derive role: treat as 'founder' if access_level = 'founder' OR department_slug
    // starts with 'founder' — covers both the original seed row and the session-2 seed row
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
    console.error('PIN auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
