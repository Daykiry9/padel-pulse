import { cookies } from 'next/headers';

import type { ServerSupabase } from './supabase/server';

const ACTIVE_COMMUNITY_COOKIE = 'active_community_id';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UserCommunity {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
}

/**
 * Devuelve el community_id activo del usuario.
 *
 * SOURCE OF TRUTH: `profiles.active_community_id`.
 * La cookie `active_community_id` es un hint cliente-side; si no matchea
 * con DB, gana DB.
 *
 * Orden:
 *  1) Lee `profiles.active_community_id` (validado contra membresía).
 *  2) Si la cookie matchea con DB → devuelve ese id (rápido y consistente).
 *  3) Si DB tiene valor válido → devuelve DB.
 *  4) Fallback a primer `community_members` del user.
 *  5) null si no pertenece a ninguna comunidad.
 */
export async function getActiveCommunityId(
  supabase: ServerSupabase,
  userId: string,
): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_COMMUNITY_COOKIE)?.value;

  // 1) profiles.active_community_id (source of truth)
  const { data: profile } = await supabase
    .from('profiles')
    .select('active_community_id')
    .eq('id', userId)
    .maybeSingle();
  const dbActiveId = (profile as { active_community_id: string | null } | null)
    ?.active_community_id;

  if (dbActiveId) {
    // Validar membership (defensa en profundidad: la columna tiene FK + trigger,
    // pero el user pudo salir entre dos requests).
    const { data: membership } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('profile_id', userId)
      .eq('community_id', dbActiveId)
      .maybeSingle();
    if (membership) {
      // Si la cookie matchea, perfecto. Si no matchea, igual devolvemos DB
      // (la cookie se resincroniza la próxima vez que el user use el switcher).
      if (cookieValue && UUID_RE.test(cookieValue) && cookieValue === dbActiveId) {
        return cookieValue;
      }
      return dbActiveId;
    }
  }

  // 2) fallback al primer membership
  const { data: first } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('profile_id', userId)
    .order('joined_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  const firstId = (first as { community_id: string } | null)?.community_id;
  if (firstId) return firstId;

  return null;
}

/**
 * Devuelve todas las comunidades a las que pertenece el usuario.
 */
export async function getUserCommunities(
  supabase: ServerSupabase,
  userId: string,
): Promise<UserCommunity[]> {
  const { data, error } = await supabase
    .from('community_members')
    .select('communities(id, name, slug, logo_url)')
    .eq('profile_id', userId);

  if (error || !data) return [];

  type Row = {
    communities:
      | { id: string; name: string; slug: string; logo_url: string | null }
      | { id: string; name: string; slug: string; logo_url: string | null }[]
      | null;
  };

  const rows = data as unknown as Row[];
  const out: UserCommunity[] = [];
  for (const row of rows) {
    const c = Array.isArray(row.communities) ? row.communities[0] : row.communities;
    if (!c) continue;
    out.push({ id: c.id, name: c.name, slug: c.slug, logoUrl: c.logo_url });
  }
  return out;
}
