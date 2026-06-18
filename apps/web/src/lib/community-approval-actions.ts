'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { getServiceRoleClient } from './supabase/admin';
import { translateDbError } from './error-translate';
import { createNotification } from './notification-actions';
import type { ActionResult } from './auth-actions';

// ============================================================
// Community JOIN request (user pides unirse, owner aprueba)
// ============================================================
export async function requestJoinCommunity(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const communityId = String(formData.get('community_id') ?? '');
  const message = String(formData.get('message') ?? '').trim() || null;
  if (!communityId) return { ok: false, error: 'Comunidad inválida' };

  const supabase = await getSupabaseServerClient();

  // ¿Ya es miembro?
  const { data: existingMember } = await supabase
    .from('community_members')
    .select('community_id')
    .eq('community_id', communityId)
    .eq('profile_id', user.id)
    .maybeSingle();
  if (existingMember) {
    return { ok: false, error: 'Ya eres miembro de esta comunidad' };
  }

  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        insert: (row: unknown) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from('community_join_requests')
    .insert({
      community_id: communityId,
      profile_id: user.id,
      message,
    });

  if (error) return { ok: false, error: translateDbError(error.message) };

  // Notificar al owner de la comunidad
  type CRow = { owner_id: string; name: string };
  const { data: cData } = await supabase
    .from('communities')
    .select('owner_id, name')
    .eq('id', communityId)
    .single();
  const community = cData as unknown as CRow | null;
  if (community) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    const myName = (profile as { display_name: string } | null)?.display_name ?? 'Un jugador';
    await createNotification({
      profileId: community.owner_id,
      type: 'announcement',
      title: `Solicitud de ingreso a ${community.name}`,
      body: `${myName} quiere unirse${message ? `: "${message}"` : '.'}`,
      link: `/app/communities`,
    });
  }

  revalidatePath('/app/communities');
  return { ok: true };
}

// ============================================================
// Owner/admin decide join request
// ============================================================
export async function decideJoinRequest(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const requestId = String(formData.get('request_id') ?? '');
  const decision = String(formData.get('decision') ?? '') as 'approved' | 'rejected';
  const assignedCategory = String(formData.get('assigned_category') ?? '').trim() || null;
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!requestId || !['approved', 'rejected'].includes(decision)) {
    return { ok: false, error: 'Datos inválidos' };
  }

  const supabase = await getSupabaseServerClient();

  type JR = {
    id: string;
    community_id: string;
    profile_id: string;
    status: string;
    communities: { name: string; owner_id: string; slug: string } | null;
  };
  const { data: jrData } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (k: string, v: string) => { single: () => Promise<{ data: JR | null }> };
        };
      };
    }
  )
    .from('community_join_requests')
    .select('id, community_id, profile_id, status, communities(name, owner_id, slug)')
    .eq('id', requestId)
    .single();
  const jr = jrData;
  if (!jr) return { ok: false, error: 'Solicitud no existe' };
  if (jr.status !== 'pending') {
    return { ok: false, error: `Esta solicitud ya está "${jr.status}"` };
  }

  // RLS verifica perms, pero double-check
  if (jr.communities?.owner_id !== user.id) {
    // Permitir también admins de la comunidad
    const { data: cm } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', jr.community_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    const role = (cm as { role: string } | null)?.role;
    if (role !== 'owner' && role !== 'admin') {
      return { ok: false, error: 'No tienes permisos para decidir esta solicitud' };
    }
  }

  const adminClient = getServiceRoleClient();

  // Update join request
  await (
    adminClient as unknown as {
      from: (t: string) => {
        update: (b: unknown) => { eq: (k: string, v: string) => Promise<unknown> };
      };
    }
  )
    .from('community_join_requests')
    .update({
      status: decision,
      decided_by: user.id,
      decided_at: new Date().toISOString(),
      assigned_category: assignedCategory,
      decision_note: note,
    })
    .eq('id', requestId);

  // Si aprobado: crear community_member + optional asignar categoría al profile
  if (decision === 'approved') {
    await adminClient.from('community_members').insert({
      community_id: jr.community_id,
      profile_id: jr.profile_id,
      role: 'member',
    } as never);

    if (assignedCategory) {
      await adminClient
        .from('profiles')
        .update({ skill_category: assignedCategory } as never)
        .eq('id', jr.profile_id);
    }
  }

  // Notificar al user
  await createNotification({
    profileId: jr.profile_id,
    type: 'announcement',
    title:
      decision === 'approved'
        ? `Te aceptaron en ${jr.communities?.name ?? 'la comunidad'}`
        : `Tu solicitud a ${jr.communities?.name ?? 'la comunidad'} fue rechazada`,
    body: note ?? undefined,
    link: jr.communities?.slug ? `/app/communities/${jr.communities.slug}` : '/app/communities',
  });

  revalidatePath('/app/communities');
  return { ok: true };
}
