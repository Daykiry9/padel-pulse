import { NextResponse, type NextRequest } from 'next/server';

import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Búsqueda de profiles para el ManualPlayerForm del organizer.
 *
 * Devuelve { results: { id, display_name, skill_category }[] } filtrado por
 * ilike sobre display_name (case-insensitive, partial match).
 *
 * Requiere autenticación (solo organizers de torneo usan este endpoint).
 * Lee de profiles_public (view publica safe — no expone phone/email/etc).
 */
export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ results: [], error: 'No autenticado' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const supabase = await getSupabaseServerClient();

  // profiles_public es una view (security_invoker=off). Usamos cast porque los
  // types regenerados todavía no la incluyen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  const { data, error } = await sb
    .from('profiles_public')
    .select('id, display_name, skill_category')
    .ilike('display_name', `%${q}%`)
    .neq('id', user.id)
    .limit(10);

  if (error) {
    console.error('[api/profiles/search] error:', error);
    return NextResponse.json({ results: [], error: 'Error buscando' }, { status: 500 });
  }

  return NextResponse.json({ results: data ?? [] });
}
