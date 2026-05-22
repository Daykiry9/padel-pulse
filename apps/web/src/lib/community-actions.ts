'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import type { ActionResult } from './auth-actions';

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
