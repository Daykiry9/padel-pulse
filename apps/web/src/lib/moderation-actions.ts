'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { translateDbError } from './error-translate';
import type { ActionResult } from './auth-actions';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Motivos ofrecidos al denunciar. El valor viaja tal cual a la DB. */
export const REPORT_REASONS = [
  'Lenguaje ofensivo o insultos',
  'Acoso o amenazas',
  'Spam o publicidad',
  'Contenido sexual o inapropiado',
  'Suplantación de identidad',
  'Otro',
] as const;

export async function reportContent(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const targetKind = String(formData.get('target_kind') ?? '');
  const targetId = String(formData.get('target_id') ?? '');
  const reason = String(formData.get('reason') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim();
  const reportedProfileId = String(formData.get('reported_profile_id') ?? '');

  if (targetKind !== 'chat_message' && targetKind !== 'profile') {
    return { ok: false, error: 'Tipo de contenido inválido' };
  }
  if (!targetId) return { ok: false, error: 'Contenido inválido' };
  if (!reason) return { ok: false, error: 'Elige un motivo' };
  if (note.length > 500) return { ok: false, error: 'La nota es muy larga (máx 500)' };

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb.from('content_reports').insert({
    target_kind: targetKind,
    target_id: targetId,
    reported_profile_id: reportedProfileId || null,
    reporter_id: user.id,
    reason,
    note: note || null,
  });

  // El unique (reporter_id, target_kind, target_id) impide reportar dos veces
  // lo mismo. No es un fallo desde el punto de vista del usuario: ya lo hizo.
  if (error) {
    if (error.code === '23505' || /duplicate key/i.test(error.message ?? '')) {
      return { ok: true };
    }
    return { ok: false, error: translateDbError(error.message) };
  }

  return { ok: true };
}

export async function blockUser(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const blockedId = String(formData.get('blocked_id') ?? '');
  if (!blockedId) return { ok: false, error: 'Usuario inválido' };
  if (blockedId === user.id) return { ok: false, error: 'No puedes bloquearte a ti mismo' };

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb
    .from('user_blocks')
    .insert({ blocker_id: user.id, blocked_id: blockedId });

  if (error && !/duplicate key/i.test(error.message ?? '')) {
    return { ok: false, error: translateDbError(error.message) };
  }

  // El chat filtra por RLS, asi que hay que revalidar lo que ya esta cacheado.
  revalidatePath('/app');
  return { ok: true };
}

export async function unblockUser(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const blockedId = String(formData.get('blocked_id') ?? '');
  if (!blockedId) return { ok: false, error: 'Usuario inválido' };

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb
    .from('user_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath('/app');
  return { ok: true };
}
