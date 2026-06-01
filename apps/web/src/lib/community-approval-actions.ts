'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { getServiceRoleClient } from './supabase/admin';
import { translateDbError } from './error-translate';
import { createNotification } from './notification-actions';
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

// ============================================================
// Community CREATION request (anyone can request, super admin approves)
// ============================================================
export async function requestCommunityCreation(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const name = String(formData.get('name') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  // founding_members viene como múltiples campos "founding_member_<i>" con formato "Nombre - email/phone (opcional)"
  const founders: { name: string; contact: string | null }[] = [];
  for (let i = 0; i < 20; i++) {
    const raw = String(formData.get(`founding_member_${i}`) ?? '').trim();
    if (!raw) continue;
    const parts = raw.split(/\s*-\s*/);
    const memberName = parts[0]?.trim() ?? '';
    const contact = parts[1]?.trim() || null;
    if (memberName) founders.push({ name: memberName, contact });
  }

  if (!name || name.length < 4) return { ok: false, error: 'Nombre muy corto (mín 4 caracteres)' };
  if (!city) return { ok: false, error: 'Especifica la ciudad' };
  if (founders.length < 1) {
    return {
      ok: false,
      error: 'Lista al menos 1 fundador.',
    };
  }

  const supabase = await getSupabaseServerClient();
  const slug = slugify(name);

  const { error } = await (
    supabase as unknown as {
      from: (t: string) => {
        insert: (row: unknown) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .from('community_creation_requests')
    .insert({
      proposed_name: name,
      proposed_slug: slug,
      proposed_city: city,
      proposed_description: description,
      requested_by: user.id,
      founding_members: founders,
    });

  if (error) return { ok: false, error: translateDbError(error.message) };

  return { ok: true, redirectTo: '/app/communities?requested=1' };
}

// ============================================================
// Super admin decides on community creation request
// ============================================================
export async function decideCommunityCreation(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const requestId = String(formData.get('request_id') ?? '');
  const decision = String(formData.get('decision') ?? '') as 'approved' | 'rejected';
  const note = String(formData.get('note') ?? '').trim() || null;

  if (!requestId || !['approved', 'rejected'].includes(decision)) {
    return { ok: false, error: 'Datos inválidos' };
  }

  const supabase = await getSupabaseServerClient();

  // Verify is super admin
  const { data: me } = await supabase
    .from('profiles')
    .select('is_super_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (!(me as { is_super_admin: boolean } | null)?.is_super_admin) {
    return { ok: false, error: 'Solo super admins pueden aprobar comunidades' };
  }

  type Req = {
    id: string;
    proposed_name: string;
    proposed_slug: string;
    proposed_city: string;
    proposed_description: string | null;
    requested_by: string;
    status: string;
  };
  const { data: reqData } = await (
    supabase as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          eq: (k: string, v: string) => { single: () => Promise<{ data: Req | null }> };
        };
      };
    }
  )
    .from('community_creation_requests')
    .select('id, proposed_name, proposed_slug, proposed_city, proposed_description, requested_by, status')
    .eq('id', requestId)
    .single();
  const req = reqData;
  if (!req) return { ok: false, error: 'Solicitud no existe' };
  if (req.status !== 'pending') {
    return { ok: false, error: `Esta solicitud ya está en estado "${req.status}"` };
  }

  const adminClient = getServiceRoleClient();

  let approvedCommunityId: string | null = null;
  if (decision === 'approved') {
    // Crear la comunidad real (con el requester como owner)
    const { data: c, error: cErr } = await (
      adminClient as unknown as {
        from: (t: string) => {
          insert: (row: unknown) => {
            select: (cols: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> };
          };
        };
      }
    )
      .from('communities')
      .insert({
        slug: req.proposed_slug,
        name: req.proposed_name,
        city: req.proposed_city,
        description: req.proposed_description,
        owner_id: req.requested_by,
        status: 'active',
      })
      .select('id')
      .single();
    if (cErr) return { ok: false, error: `Error creando comunidad: ${cErr.message}` };
    approvedCommunityId = c?.id ?? null;
  }

  // Actualizar el request
  const updateBody: Record<string, unknown> = {
    status: decision,
    decided_by: user.id,
    decided_at: new Date().toISOString(),
    decision_note: note,
  };
  if (approvedCommunityId) updateBody.approved_community_id = approvedCommunityId;

  await (
    adminClient as unknown as {
      from: (t: string) => {
        update: (b: unknown) => { eq: (k: string, v: string) => Promise<unknown> };
      };
    }
  )
    .from('community_creation_requests')
    .update(updateBody)
    .eq('id', requestId);

  // Notificar al requester
  await createNotification({
    profileId: req.requested_by,
    type: 'announcement',
    title:
      decision === 'approved'
        ? `Tu comunidad "${req.proposed_name}" fue aprobada`
        : `Tu solicitud de comunidad "${req.proposed_name}" fue rechazada`,
    body: note ?? undefined,
    link: decision === 'approved' && approvedCommunityId ? `/app/communities/${req.proposed_slug}` : '/app/communities',
  });

  revalidatePath('/app/admin');
  revalidatePath('/app/communities');
  return { ok: true };
}

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
