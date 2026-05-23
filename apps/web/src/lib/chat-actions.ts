'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { translateDbError } from './error-translate';
import type { ActionResult } from './auth-actions';

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function postChatMessage(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const targetKind = String(formData.get('target_kind') ?? 'tournament') as 'tournament';
  const targetId = String(formData.get('target_id') ?? '');
  const body = String(formData.get('body') ?? '').trim();

  if (!targetId) return { ok: false, error: 'Target inválido' };
  if (!body) return { ok: false, error: 'El mensaje no puede estar vacío' };
  if (body.length > 1000) return { ok: false, error: 'Mensaje muy largo (máx 1000 caracteres)' };

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb.from('chat_messages').insert({
    target_kind: targetKind,
    target_id: targetId,
    profile_id: user.id,
    body,
  });

  if (error) return { ok: false, error: translateDbError(error.message) };

  // Get the tournament slug for revalidation
  const { data: t } = await supabase
    .from('tournaments')
    .select('slug')
    .eq('id', targetId)
    .maybeSingle();
  const slug = (t as { slug: string } | null)?.slug;
  if (slug) {
    revalidatePath(`/tournaments/${slug}`);
    revalidatePath(`/tournaments/${slug}/live`);
  }

  return { ok: true };
}
