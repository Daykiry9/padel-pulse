import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@/lib/supabase/server';

export interface SearchResult {
  kind: 'tournament' | 'community' | 'player';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  meta?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q') ?? '').trim();

  if (query.length < 2) {
    return NextResponse.json({ results: [] satisfies SearchResult[] });
  }

  const supabase = await getSupabaseServerClient();
  const term = `%${query}%`;

  const [tournamentsRes, communitiesRes, playersRes] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, slug, name, format, status, starts_at, clubs(city)')
      .ilike('name', term)
      .in('status', ['open', 'in_progress'])
      .limit(5),
    supabase
      .from('communities')
      .select('id, slug, name, city')
      .ilike('name', term)
      .limit(5),
    supabase
      .from('profiles')
      .select('id, display_name, city, skill_category')
      .ilike('display_name', term)
      .not('skill_category', 'is', null)
      .limit(8),
  ]);

  const results: SearchResult[] = [];

  for (const t of (tournamentsRes.data ?? []) as {
    id: string;
    slug: string;
    name: string;
    format: string;
    status: string;
    starts_at: string;
    clubs: { city: string } | null;
  }[]) {
    results.push({
      kind: 'tournament',
      id: t.id,
      title: t.name,
      subtitle: `${t.format.replace('_', ' ')}${t.clubs?.city ? ` · ${t.clubs.city}` : ''}`,
      meta: t.status === 'in_progress' ? 'EN VIVO' : new Date(t.starts_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }),
      href: `/tournaments/${t.slug}`,
    });
  }

  for (const c of (communitiesRes.data ?? []) as {
    id: string;
    slug: string;
    name: string;
    city: string;
  }[]) {
    results.push({
      kind: 'community',
      id: c.id,
      title: c.name,
      subtitle: c.city,
      href: `/app/communities/${c.slug}`,
    });
  }

  for (const p of (playersRes.data ?? []) as {
    id: string;
    display_name: string;
    city: string | null;
    skill_category: string | null;
  }[]) {
    results.push({
      kind: 'player',
      id: p.id,
      title: p.display_name,
      subtitle: [p.city, p.skill_category].filter(Boolean).join(' · '),
      href: `/players/${p.id}`,
    });
  }

  return NextResponse.json({ results });
}
