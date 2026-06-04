'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import type { ActionResult } from './auth-actions';

const ACTIVE_COMMUNITY_COOKIE = 'active_community_id';
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

export async function createCommunity(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const name = String(formData.get('name') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const city = String(formData.get('city') ?? '').trim() || 'Bogotá';

  if (name.length < 3) return { ok: false, error: 'El nombre debe tener al menos 3 caracteres' };

  const supabase = await getSupabaseServerClient();

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabase
    .from('communities')
    .insert({
      slug,
      name,
      description,
      city,
      owner_id: user.id,
    } as never)
    .select('slug')
    .single();

  if (error) return { ok: false, error: error.message };

  const slugResult = (data as { slug: string } | null)?.slug ?? slug;
  revalidatePath('/app/communities');
  revalidatePath('/app');
  return { ok: true, redirectTo: `/app/communities/${slugResult}` };
}

// joinCommunity ahora delega al flujo de request — la membresía requiere
// aprobación del owner/admin de la comunidad.
import { requestJoinCommunity } from './community-approval-actions';

export async function joinCommunity(formData: FormData): Promise<ActionResult> {
  return requestJoinCommunity(formData);
}

export async function setActiveCommunity(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const communityId = String(formData.get('community_id') ?? '').trim();
  if (!UUID_RE.test(communityId)) {
    return { ok: false, error: 'Comunidad inválida' };
  }

  const supabase = await getSupabaseServerClient();
  const { data: membership, error } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('profile_id', user.id)
    .eq('community_id', communityId)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!membership) return { ok: false, error: 'No perteneces a esa comunidad' };

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMMUNITY_COOKIE, communityId, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return { ok: true };
}
