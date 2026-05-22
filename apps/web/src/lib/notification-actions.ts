'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { getServiceRoleClient } from './supabase/admin';
import type { ActionResult } from './auth-actions';

type NotificationType =
  | 'tournament_open'
  | 'tournament_starting'
  | 'match_scheduled'
  | 'match_result'
  | 'team_invite'
  | 'category_change_suggested'
  | 'announcement'
  | 'payment_received';

interface CreateNotificationInput {
  profileId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Helper interno para crear notificaciones desde server actions. Usa service
 * role para poder insertar notificaciones a otros usuarios (cross-user).
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const admin = getServiceRoleClient();
  await admin.from('notifications').insert({
    profile_id: input.profileId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
  } as never);
}

export async function createNotifications(inputs: CreateNotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;
  const admin = getServiceRoleClient();
  await admin.from('notifications').insert(
    inputs.map((i) => ({
      profile_id: i.profileId,
      type: i.type,
      title: i.title,
      body: i.body ?? null,
      link: i.link ?? null,
    })) as never,
  );
}

// ============================================================
// Actions del usuario: marcar leídas
// ============================================================
export async function markNotificationRead(notificationId: string): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('id', notificationId)
    .eq('profile_id', user.id);

  if (error) return { ok: false, error: 'No pudimos marcar como leída' };

  revalidatePath('/app');
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() } as never)
    .eq('profile_id', user.id)
    .is('read_at', null);

  if (error) return { ok: false, error: 'No pudimos marcar todas como leídas' };

  revalidatePath('/app');
  return { ok: true };
}
