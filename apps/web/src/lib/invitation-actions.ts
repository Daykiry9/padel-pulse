'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { getServiceRoleClient } from './supabase/admin';
import { translateDbError } from './error-translate';
import type { ActionResult } from './auth-actions';

type InvitationKind = 'tournament' | 'team' | 'community';

// Tipos generados de Supabase aún no incluyen invitation_tokens (migración nueva).
// Cast tactico hasta que regeneren los tipos con `pnpm --filter @padelking/supabase gen:types`.
type SupaAny = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (k: string, v: unknown) => {
        maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
      };
    };
    insert: (
      row: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: { message: string } | null }>;
    update: (row: Record<string, unknown>) => {
      eq: (k: string, v: unknown) => Promise<{ data: unknown; error: unknown }>;
    };
  };
};

function generateCode(len = 10): string {
  // URL-safe sin caracteres confundibles (0/O, 1/l/I)
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  return s;
}

// ============================================================
// createInvitation — owner del target crea un link
// ============================================================
export async function createInvitation(
  formData: FormData,
): Promise<ActionResult & { code?: string }> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const kind = String(formData.get('kind') ?? '') as InvitationKind;
  const targetId = String(formData.get('target_id') ?? '');
  if (!kind || !targetId) return { ok: false, error: 'Datos inválidos' };
  if (!['tournament', 'team', 'community'].includes(kind)) {
    return { ok: false, error: 'Tipo de invitación inválido' };
  }

  const supabase = await getSupabaseServerClient();

  // Verificar permisos según kind:
  // - tournament: cualquier user autenticado puede compartir (el link es público)
  // - team / community: solo miembros / owner
  if (kind === 'tournament') {
    // Verificar que exista nada más
    const { data } = await supabase
      .from('tournaments')
      .select('id')
      .eq('id', targetId)
      .maybeSingle();
    if (!data) return { ok: false, error: 'El torneo no existe' };
  } else if (kind === 'team') {
    const { data } = await supabase
      .from('team_members')
      .select('profile_id, role')
      .eq('team_id', targetId)
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (!data) return { ok: false, error: 'Solo miembros activos pueden invitar al equipo' };
  } else if (kind === 'community') {
    type Row = { owner_id: string };
    const { data } = await supabase
      .from('communities')
      .select('owner_id')
      .eq('id', targetId)
      .single();
    const row = data as unknown as Row | null;
    if (!row || row.owner_id !== user.id) {
      return { ok: false, error: 'Solo el dueño de la comunidad puede invitar' };
    }
  }

  // Generar código único (retry hasta 5 veces ante colisión)
  // Lectura cross-user via service role: la nueva policy solo deja al
  // creator ver sus propios invites, así que para chequear colisiones
  // contra cualquier code hay que bypassar RLS.
  const admin = getServiceRoleClient();
  let code = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    code = generateCode();
    const { data: existing } = await (admin as never as SupaAny)
      .from('invitation_tokens')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!existing) break;
    code = '';
  }
  if (!code) return { ok: false, error: 'No pudimos generar un código. Intenta de nuevo.' };

  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

  const { error } = await (supabase as never as SupaAny).from('invitation_tokens').insert({
    code,
    kind,
    target_id: targetId,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) return { ok: false, error: translateDbError(error.message) };

  return { ok: true, code };
}

// ============================================================
// redeemInvitation — aplica el invite al user actual
// ============================================================
export async function redeemInvitation(code: string): Promise<ActionResult> {
  const user = await getSession();
  if (!user) {
    return { ok: false, error: 'Debes ingresar primero', redirectTo: `/login?next=/i/${code}` };
  }

  const supabase = await getSupabaseServerClient();
  // C2: la tabla invitation_tokens ya no es public read. La lectura por
  // code se hace con service role (validamos expires_at/max_uses en server).
  const admin = getServiceRoleClient();

  type InviteRow = {
    id: string;
    kind: InvitationKind;
    target_id: string;
    expires_at: string | null;
    max_uses: number | null;
    use_count: number;
  };
  const { data: invData } = await (admin as never as SupaAny)
    .from('invitation_tokens')
    .select('id, kind, target_id, expires_at, max_uses, use_count')
    .eq('code', code)
    .maybeSingle();
  const invite = invData as unknown as InviteRow | null;

  if (!invite) return { ok: false, error: 'Link de invitación inválido o expirado' };
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { ok: false, error: 'Este link de invitación ya expiró. Pídele uno nuevo al organizador.' };
  }
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return { ok: false, error: 'Este link ya llegó a su límite de usos.' };
  }

  // Verificar que el profile esté completo (skill_category)
  const { data: profileData } = await supabase
    .from('profiles')
    .select('skill_category')
    .eq('id', user.id)
    .maybeSingle();
  const profile = profileData as { skill_category: string | null } | null;
  if (!profile?.skill_category) {
    return { ok: false, error: 'Completa tu perfil primero', redirectTo: `/onboarding?invite=${code}` };
  }

  if (invite.kind === 'community') {
    // Verificar si ya es miembro
    const { data: existing } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('community_id', invite.target_id)
      .eq('profile_id', user.id)
      .maybeSingle();
    if (existing) {
      const { data: c } = await supabase
        .from('communities')
        .select('slug')
        .eq('id', invite.target_id)
        .single();
      const slug = (c as { slug: string } | null)?.slug;
      return { ok: true, redirectTo: slug ? `/app/communities/${slug}` : '/app/communities' };
    }
    // C3: community_members INSERT ya no permitido por authenticated.
    // Insert via service role tras validar el invite es legítimo.
    const { error } = await admin.from('community_members').insert({
      community_id: invite.target_id,
      profile_id: user.id,
      role: 'member',
    } as never);
    if (error) return { ok: false, error: translateDbError(error.message) };

    await (admin as never as SupaAny)
      .from('invitation_tokens')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    const { data: c } = await supabase
      .from('communities')
      .select('slug')
      .eq('id', invite.target_id)
      .single();
    const slug = (c as { slug: string } | null)?.slug;
    revalidatePath('/app/communities');
    return { ok: true, redirectTo: slug ? `/app/communities/${slug}` : '/app/communities' };
  }

  if (invite.kind === 'team') {
    // Verificar slots disponibles + no ya-miembro
    const { data: members } = await supabase
      .from('team_members')
      .select('profile_id')
      .eq('team_id', invite.target_id)
      .eq('is_active', true);
    const activeMembers = (members ?? []) as { profile_id: string }[];
    if (activeMembers.some((m) => m.profile_id === user.id)) {
      return { ok: true, redirectTo: '/app/teams' };
    }
    if (activeMembers.length >= 2) {
      return { ok: false, error: 'El equipo ya tiene 2 jugadores. No hay cupo.' };
    }
    // C4: team_members INSERT ya no permitido por authenticated.
    // Insert via service role tras validar el invite + cupo.
    const { error } = await admin.from('team_members').insert({
      team_id: invite.target_id,
      profile_id: user.id,
      role: 'member',
      is_active: true,
    } as never);
    if (error) return { ok: false, error: translateDbError(error.message) };

    await (admin as never as SupaAny)
      .from('invitation_tokens')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    revalidatePath('/app/teams');
    return { ok: true, redirectTo: '/app/teams' };
  }

  if (invite.kind === 'tournament') {
    // No auto-registramos — el usuario elige modalidad (team/adhoc/individual).
    // Solo lo llevamos a la página de detalle con un flag.
    const { data: t } = await supabase
      .from('tournaments')
      .select('slug')
      .eq('id', invite.target_id)
      .single();
    const slug = (t as { slug: string } | null)?.slug;
    if (!slug) return { ok: false, error: 'El torneo ya no existe' };

    await (admin as never as SupaAny)
      .from('invitation_tokens')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    return { ok: true, redirectTo: `/tournaments/${slug}?invited=1` };
  }

  return { ok: false, error: 'Tipo de invitación desconocido' };
}
