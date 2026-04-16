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
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('pin', pin)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Return user data
    return NextResponse.json({
      id: data.id,
      name: data.name,
      role: data.role,
      department_slug: data.department_slug,
      departments: data.departments || [],
      phone: data.phone,
    });
  } catch (error) {
    console.error('PIN auth error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
