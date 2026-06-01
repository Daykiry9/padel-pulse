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
  // Defense-in-depth: skip si profileId no existe en profiles (caso guest).
  // Sin esto, la FK rechazaría el insert y el caller no se entera.
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', input.profileId)
    .maybeSingle();
  if (!existing) return;

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

  // Defense-in-depth: filtrar profileIds que no existan en profiles (caso
  // típico: un guest_player_id se cuela en pids por un bug upstream). Sin
  // este filtro, la FK notifications.profile_id → profiles(id) rechazaría el
  // INSERT entero del batch y nadie recibiría nada. Silent skip por design.
  const uniqueProfileIds = Array.from(new Set(inputs.map((i) => i.profileId).filter(Boolean)));
  if (uniqueProfileIds.length === 0) return;

  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .in('id', uniqueProfileIds);
  const validIds = new Set(((existing ?? []) as { id: string }[]).map((p) => p.id));

  const filtered = inputs.filter((i) => validIds.has(i.profileId));
  if (filtered.length === 0) return;
  if (filtered.length < inputs.length) {
    // eslint-disable-next-line no-console
    console.warn(
      `createNotifications: filtered ${inputs.length - filtered.length} invalid profileIds`,
    );
  }

  await admin.from('notifications').insert(
    filtered.map((i) => ({
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
