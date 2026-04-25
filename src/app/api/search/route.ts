import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json([]);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const pattern = `%${q}%`;

  const [products, accounts, issues, rocks, distributors, team] = await Promise.all([
    supabase.from('products').select('id, name, sku').ilike('name', pattern).limit(5),
    supabase.from('chart_of_accounts').select('id, code, name').ilike('name', pattern).limit(5),
    supabase.from('issues').select('id, title, stage').ilike('title', pattern).neq('stage', 'resolved').limit(5),
    supabase.from('rocks').select('id, title, status, quarter').ilike('title', pattern).limit(5),
    supabase.from('distributors').select('id, name, area').ilike('name', pattern).limit(5),
    supabase.from('team_members').select('id, name, role').ilike('name', pattern).limit(5),
  ]);

  const results: SearchResult[] = [
    ...(products.data ?? []).map(p => ({ type: 'Product', id: p.id, title: p.name, subtitle: p.sku, href: '/finance/products' })),
    ...(accounts.data ?? []).map(a => ({ type: 'Account', id: a.id, title: a.name, subtitle: a.code, href: '/finance/accounts' })),
    ...(issues.data ?? []).map(i => ({ type: 'Issue', id: i.id, title: i.title, subtitle: i.stage, href: '/rhythm/issues' })),
    ...(rocks.data ?? []).map(r => ({ type: 'Rock', id: r.id, title: r.title, subtitle: `${r.quarter} · ${r.status}`, href: '/rhythm/rocks' })),
    ...(distributors.data ?? []).map(d => ({ type: 'Distributor', id: d.id, title: d.name, subtitle: d.area, href: '/sales' })),
    ...(team.data ?? []).map(t => ({ type: 'Team', id: t.id, title: t.name, subtitle: t.role, href: '/team' })),
  ];

  return NextResponse.json(results);
}
