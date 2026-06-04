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
 * Devuelve el community_id activo del usuario:
 *  1) cookie `active_community_id` validada contra membresía,
 *  2) fallback a `profiles.primary_community_id`,
 *  3) fallback al primer `community_members` del user,
 *  4) null si no pertenece a ninguna comunidad.
 */
export async function getActiveCommunityId(
  supabase: ServerSupabase,
  userId: string,
): Promise<string | null> {
  // 1) cookie
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ACTIVE_COMMUNITY_COOKIE)?.value;
  if (cookieValue && UUID_RE.test(cookieValue)) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('profile_id', userId)
      .eq('community_id', cookieValue)
      .maybeSingle();
    if (membership) return cookieValue;
  }

  // 2) profiles.primary_community_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_community_id')
    .eq('id', userId)
    .maybeSingle();
  const primaryId = (profile as { primary_community_id: string | null } | null)
    ?.primary_community_id;
  if (primaryId) {
    const { data: membership } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('profile_id', userId)
      .eq('community_id', primaryId)
      .maybeSingle();
    if (membership) return primaryId;
  }

  // 3) primer membership
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
