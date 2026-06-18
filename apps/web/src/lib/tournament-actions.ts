'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

import { playerRankingTag, teamRankingTag } from './community-ranking';

import {
  computePaddleEloDeltas,
  generateExpress,
  generateFixedAmericano,
  generateLeague,
  generateLiguillaCasual,
  generateRandomAmericano,
  generateSingleElimination,
  tierOf,
  weightOf,
} from '@padelking/domain';
import type { CategoryKind, TeamCategory, TournamentFormat } from '@padelking/domain';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { getServiceRoleClient } from './supabase/admin';
import type { ActionResult } from './auth-actions';
import { translateDbError } from './error-translate';
import { createNotifications } from './notification-actions';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50);
}

export async function createTournament(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const name = String(formData.get('name') ?? '').trim();
  const format = String(formData.get('format') ?? '') as TournamentFormat;
  const categoryKind = String(formData.get('category_kind') ?? '') as CategoryKind;
  const category = String(formData.get('category') ?? '') as TeamCategory | '';
  const minSumRaw = String(formData.get('min_sum') ?? '').trim();
  const maxPlayerCategoryRaw = String(formData.get('max_player_category_value') ?? '').trim();
  const scope = String(formData.get('scope') ?? '') as
    | 'community'
    | 'club_private'
    | 'club_open'
    | '';
  const clubIdRaw = String(formData.get('club_id') ?? '') || null;
  const communityIdRaw = String(formData.get('community_id') ?? '') || null;
  const cityIdRaw = String(formData.get('city_id') ?? '') || null;
  const startsAt = String(formData.get('starts_at') ?? '');
  const maxTeams = Number(formData.get('max_teams') ?? 16);
  const pricePerTeam = Number(formData.get('price_per_team') ?? 0);
  const pointsPerMatchRaw = String(formData.get('points_per_match') ?? '').trim();
  const totalRoundsRaw = String(formData.get('total_rounds') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;

  if (!name || name.length < 4) return { ok: false, error: 'Nombre del torneo muy corto' };
  if (!format) return { ok: false, error: 'Selecciona un formato' };
  if (scope !== 'community' && scope !== 'club_private' && scope !== 'club_open') {
    return { ok: false, error: 'Selecciona el alcance del torneo' };
  }
  if (!startsAt) return { ok: false, error: 'Fecha de inicio requerida' };

  if (categoryKind === 'estandar' || categoryKind === 'queens_estandar') {
    if (!category) return { ok: false, error: 'Selecciona la categoría estándar del torneo' };
  }
  if (categoryKind === 'suma' || categoryKind === 'queens_suma' || categoryKind === 'mixto_suma') {
    if (!minSumRaw) return { ok: false, error: 'Especifica el min_sum del torneo' };
  }

  const supabase = await getSupabaseServerClient();

  // ============================================================
  // Validación de scope: el user tiene permiso + setear FK correcto
  // ============================================================
  let clubId: string | null = null;
  let communityId: string | null = null;
  let cityId: string | null = null;

  if (scope === 'community') {
    if (!communityIdRaw) return { ok: false, error: 'Selecciona la comunidad organizadora' };
    const { data: memb } = await supabase
      .from('community_members')
      .select('role')
      .eq('community_id', communityIdRaw)
      .eq('profile_id', user.id)
      .in('role', ['owner', 'admin'])
      .maybeSingle();
    if (!memb) return { ok: false, error: 'No sos owner/admin de esa comunidad' };
    communityId = communityIdRaw;
  } else {
    // club_private o club_open
    if (!clubIdRaw) return { ok: false, error: 'Selecciona el club organizador' };
    const { data: club } = await supabase
      .from('clubs')
      .select('id, owner_id, city_id')
      .eq('id', clubIdRaw)
      .maybeSingle();
    const c = club as { id: string; owner_id: string; city_id: string | null } | null;
    if (!c) return { ok: false, error: 'El club no existe' };
    if (c.owner_id !== user.id) {
      return { ok: false, error: 'Solo el dueño del club puede crear torneos del club' };
    }
    clubId = c.id;

    if (scope === 'club_open') {
      // Preferimos city_id explícito del form; fallback al city_id del club.
      const resolvedCityId = cityIdRaw || c.city_id;
      if (!resolvedCityId) {
        return {
          ok: false,
          error: 'El torneo abierto requiere una ciudad. Configurala en el form o en el club.',
        };
      }
      cityId = resolvedCityId;
    } else {
      // club_private igualmente puede setear city_id por descubrimiento, pero
      // no es obligatorio.
      cityId = c.city_id;
    }
  }

  const startsDate = new Date(startsAt);
  const endsDate = new Date(startsDate.getTime() + 6 * 3600 * 1000); // +6h default
  const registrationDeadline = new Date(startsDate.getTime() - 24 * 3600 * 1000);

  const tier = tierOf(format);
  const weight = weightOf(format);
  // americano_random y express son player-based (los jugadores rotan de
  // compañero cada ronda). El resto son team-based (parejas fijas).
  const competitionUnit =
    format === 'americano_random' || format === 'express' ? 'player' : 'team';

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabase
    .from('tournaments')
    .insert({
      slug,
      name,
      format,
      tier,
      weight,
      status: 'open',
      category_kind: categoryKind,
      category: category || null,
      min_sum: minSumRaw ? Number(minSumRaw) : null,
      max_player_category_value: maxPlayerCategoryRaw ? Number(maxPlayerCategoryRaw) : null,
      competition_unit: competitionUnit,
      pairing_mode:
        format === 'americano_random' || format === 'express'
          ? 'random'
          : format === 'americano_fijo'
            ? 'fixed'
            : null,
      points_per_match: pointsPerMatchRaw ? Number(pointsPerMatchRaw) : 12,
      total_rounds: totalRoundsRaw ? Number(totalRoundsRaw) : null,
      scope,
      club_id: clubId,
      community_id: communityId,
      city_id: cityId,
      starts_at: startsDate.toISOString(),
      ends_at: endsDate.toISOString(),
      registration_deadline: registrationDeadline.toISOString(),
      max_teams: maxTeams,
      min_teams: Math.min(4, maxTeams),
      price_per_team: pricePerTeam,
      rotation_games: 24,
      description,
    } as never)
    .select('slug')
    .single();

  if (error) return { ok: false, error: translateDbError(error.message) };

  const slugResult = (data as { slug: string } | null)?.slug ?? '';
  revalidatePath('/tournaments');
  revalidatePath('/app');
  return { ok: true, redirectTo: `/tournaments/${slugResult}` };
}

export async function registerToTournament(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const tournamentId = String(formData.get('tournament_id') ?? '');
  const modality = String(formData.get('modality') ?? '') as 'team' | 'adhoc' | 'individual';

  if (!tournamentId) return { ok: false, error: 'Torneo inválido' };

  const supabase = await getSupabaseServerClient();

  // Anti-duplicado: si el usuario ya aparece como player en alguna inscripción
  // del torneo, no dejamos inscribir otra vez.
  const { data: existingForUser } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('tournament_id', tournamentId)
    .or(
      `player_id.eq.${user.id},player_one_id.eq.${user.id},player_two_id.eq.${user.id}`,
    )
    .limit(1)
    .maybeSingle();
  if (existingForUser) {
    return { ok: false, error: 'Ya estás inscrito en este torneo.' };
  }

  // Cupo (best-effort): check read-then-insert sin lock; dos inscripciones
  // simultáneas en el último cupo podrían colarse. Garantía real = RPC/trigger.
  const [{ data: capData }, { count: confirmedCount }] = await Promise.all([
    supabase.from('tournaments').select('max_teams').eq('id', tournamentId).single(),
    supabase
      .from('tournament_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'confirmed'),
  ]);
  const maxTeams = (capData as { max_teams: number } | null)?.max_teams;
  if (maxTeams != null && (confirmedCount ?? 0) >= maxTeams) {
    return { ok: false, error: 'El torneo ya está lleno.' };
  }

  if (modality === 'individual') {
    const { error } = await supabase.from('tournament_registrations').insert({
      tournament_id: tournamentId,
      player_id: user.id,
      registered_by: user.id,
      status: 'confirmed',
      payment_amount: 0,
    } as never);
    if (error) return { ok: false, error: translateDbError(error.message) };
  } else if (modality === 'team') {
    const teamId = String(formData.get('team_id') ?? '');
    if (!teamId) return { ok: false, error: 'Selecciona tu equipo' };

    const { data: members } = await supabase
      .from('team_members')
      .select('profile_id')
      .eq('team_id', teamId)
      .eq('is_active', true)
      .limit(2);

    const memberRows = (members ?? []) as { profile_id: string }[];
    if (memberRows.length !== 2) {
      return { ok: false, error: 'El equipo debe tener exactamente 2 miembros activos' };
    }

    const { error } = await supabase.from('tournament_registrations').insert({
      tournament_id: tournamentId,
      team_id: teamId,
      player_one_id: memberRows[0]!.profile_id,
      player_two_id: memberRows[1]!.profile_id,
      registered_by: user.id,
      status: 'confirmed',
      payment_amount: 0,
    } as never);
    if (error) return { ok: false, error: translateDbError(error.message) };
  } else if (modality === 'adhoc') {
    const partnerSearch = String(formData.get('partner_search') ?? '').trim();
    if (!partnerSearch) return { ok: false, error: 'Indica con quién te inscribes' };

    // Buscar partner por display_name (MVP, idealmente por email)
    const partnerRes = await supabase
      .from('profiles')
      .select('id, display_name, skill_category')
      .ilike('display_name', `%${partnerSearch}%`)
      .neq('id', user.id)
      .limit(1)
      .maybeSingle();

    const partner = partnerRes.data as { id: string; display_name: string } | null;
    if (!partner) {
      return { ok: false, error: `No encontré a "${partnerSearch}". Asegúrate que esté registrado.` };
    }

    const { error } = await supabase.from('tournament_registrations').insert({
      tournament_id: tournamentId,
      team_id: null,
      player_one_id: user.id,
      player_two_id: partner.id,
      registered_by: user.id,
      status: 'confirmed',
      payment_amount: 0,
    } as never);
    if (error) return { ok: false, error: translateDbError(error.message) };
  } else {
    return { ok: false, error: 'Modalidad de inscripción inválida' };
  }

  revalidatePath('/tournaments');
  return { ok: true };
}

/**
 * El organizador elimina una inscripción del torneo. Solo dueño del club o
 * de la comunidad organizadora. Si la inscripción usaba guests (sin más
 * referencias activas), también limpia los rows en guest_players para no
 * dejar invitados huérfanos.
 */
export async function removeRegistration(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const registrationId = String(formData.get('registration_id') ?? '');
  if (!registrationId) return { ok: false, error: 'Inscripción inválida' };

  const supabase = await getSupabaseServerClient();
  const { data: regData } = await supabase
    .from('tournament_registrations')
    .select(
      'id, tournament_id, guest_player_id, guest_player_one_id, guest_player_two_id, tournaments(slug, status, clubs(owner_id), communities(owner_id))',
    )
    .eq('id', registrationId)
    .single();
  const reg = regData as unknown as {
    id: string;
    tournament_id: string;
    guest_player_id: string | null;
    guest_player_one_id: string | null;
    guest_player_two_id: string | null;
    tournaments: {
      slug: string;
      status: string;
      clubs: { owner_id: string } | null;
      communities: { owner_id: string } | null;
    } | null;
  } | null;
  if (!reg) return { ok: false, error: 'Inscripción no existe' };

  const isOrganizer =
    reg.tournaments?.clubs?.owner_id === user.id ||
    reg.tournaments?.communities?.owner_id === user.id;
  if (!isOrganizer) {
    return { ok: false, error: 'Solo el organizador puede eliminar inscripciones' };
  }

  const guestIds = [reg.guest_player_id, reg.guest_player_one_id, reg.guest_player_two_id].filter(
    Boolean,
  ) as string[];

  const admin = getServiceRoleClient();

  // Si el torneo está in_progress y el guest tiene matches asignados, abortamos
  // (la FK ON DELETE RESTRICT en matches.pair_*_guest_*_id lo bloquearía igual,
  // pero damos un mensaje claro).
  if (guestIds.length && reg.tournaments?.status === 'in_progress') {
    const { data: matchUse } = await admin
      .from('matches')
      .select('id')
      .eq('tournament_id', reg.tournament_id)
      .or(
        guestIds
          .flatMap((gid) => [
            `pair_one_guest_one_id.eq.${gid}`,
            `pair_one_guest_two_id.eq.${gid}`,
            `pair_two_guest_one_id.eq.${gid}`,
            `pair_two_guest_two_id.eq.${gid}`,
          ])
          .join(','),
      )
      .limit(1);
    if ((matchUse ?? []).length > 0) {
      return {
        ok: false,
        error: 'El invitado ya tiene partidos asignados. Cancela el torneo o esperá a que terminen.',
      };
    }
  }

  const { error } = await admin
    .from('tournament_registrations')
    .delete()
    .eq('id', registrationId);
  if (error) return { ok: false, error: translateDbError(error.message) };

  // Limpieza de guest_players ahora que ya no hay FK que los retenga.
  // La FK guest_*_id en otras registrations es ON DELETE RESTRICT, así que
  // si el guest fuera reutilizado en otra inscripción (no debería por UNIQUE
  // partial, pero defensive) el delete fallará silenciosamente y lo dejamos.
  // Cast a `any` porque la tabla guest_players aún no está en los types
  // auto-generados de Supabase (se regenera tras aplicar la migración).
  if (guestIds.length) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    await (admin as any).from('guest_players').delete().in('id', guestIds);
  }

  if (reg.tournaments?.slug) revalidatePath(`/tournaments/${reg.tournaments.slug}`);
  return { ok: true };
}

// ============================================================
// Inscripción manual del organizador (profile existente o guest sin cuenta)
// ============================================================
/**
 * El organizador agrega gente manualmente al torneo:
 *  - mode='single': un jugador (player_id o guest_player_id). Para formatos
 *    de jugadores sueltos (americano random, express).
 *  - mode='pair':   una pareja completa (2 slots, cada uno profile XOR guest).
 *    Para formatos de parejas (americano fijo, liga, liguilla, eliminación).
 *
 * Cada slot llega como `profile_id_<one|two>` (cuenta existente) o
 * `guest_name_<one|two>` (invitado nuevo). Esto deja que una sola persona
 * arme el cuadro entero con invitados sin que cada jugador tenga cuenta.
 *
 * Solo organizador (club owner OR community owner). Anti-duplicado: si un
 * profile ya está inscrito, falla; si el nombre de guest ya existe en el
 * torneo, falla por UNIQUE partial.
 */
export async function addManualPlayer(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const tournamentId = String(formData.get('tournament_id') ?? '');
  const mode = String(formData.get('mode') ?? '') as 'single' | 'pair';

  if (!tournamentId) return { ok: false, error: 'Torneo inválido' };
  if (mode !== 'single' && mode !== 'pair') return { ok: false, error: 'Modo inválido' };

  // Parsear slots: cada uno es profile XOR guest.
  type SlotInput = { profileId: string | null; guestName: string | null };
  const parseSlot = (suffix: string): SlotInput => ({
    profileId: String(formData.get(`profile_id${suffix}`) ?? '').trim() || null,
    guestName: String(formData.get(`guest_name${suffix}`) ?? '').trim() || null,
  });
  const slots: SlotInput[] = [parseSlot('_one')];
  if (mode === 'pair') slots.push(parseSlot('_two'));

  const validateSlot = (s: SlotInput, label: string): string | null => {
    if (s.profileId && s.guestName) return `${label}: elige cuenta o invitado, no ambos`;
    if (!s.profileId && !s.guestName) return `${label}: falta el jugador`;
    if (s.guestName && (s.guestName.length < 2 || s.guestName.length > 60)) {
      return `${label}: el nombre del invitado debe tener 2-60 caracteres`;
    }
    return null;
  };
  for (let i = 0; i < slots.length; i++) {
    const err = validateSlot(slots[i]!, mode === 'pair' ? `Jugador ${i + 1}` : 'Jugador');
    if (err) return { ok: false, error: err };
  }
  if (
    mode === 'pair' &&
    slots[0]!.profileId &&
    slots[0]!.profileId === slots[1]!.profileId
  ) {
    return { ok: false, error: 'Los dos jugadores no pueden ser la misma cuenta' };
  }

  const supabase = await getSupabaseServerClient();

  // 1. Verificar ownership + estado
  const { data: tData } = await supabase
    .from('tournaments')
    .select('id, slug, status, clubs(owner_id), communities(owner_id)')
    .eq('id', tournamentId)
    .single();
  const tournament = tData as unknown as {
    id: string;
    slug: string;
    status: string;
    clubs: { owner_id: string } | null;
    communities: { owner_id: string } | null;
  } | null;
  if (!tournament) return { ok: false, error: 'Torneo no existe' };
  const isOrganizer =
    tournament.clubs?.owner_id === user.id || tournament.communities?.owner_id === user.id;
  if (!isOrganizer) {
    return { ok: false, error: 'Solo el organizador puede inscribir manualmente' };
  }
  if (tournament.status !== 'open' && tournament.status !== 'in_progress') {
    return { ok: false, error: `El torneo está "${tournament.status}", no se aceptan inscripciones` };
  }

  // Service role para sortear RLS (especialmente útil mid-torneo).
  const admin = getServiceRoleClient();
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const adminAny = admin as any;

  // 2. Validar profiles: existen y no están ya inscritos.
  for (const s of slots) {
    if (!s.profileId) continue;
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('id', s.profileId)
      .maybeSingle();
    if (!profile) return { ok: false, error: 'El perfil no existe' };

    const { data: existing } = await admin
      .from('tournament_registrations')
      .select('id')
      .eq('tournament_id', tournamentId)
      .or(`player_id.eq.${s.profileId},player_one_id.eq.${s.profileId},player_two_id.eq.${s.profileId}`)
      .limit(1)
      .maybeSingle();
    if (existing) return { ok: false, error: 'Ese jugador ya está inscrito en el torneo.' };
  }

  // 3. Crear los guests necesarios (sin TX: si algo falla después, limpiamos).
  const createdGuestIds: string[] = [];
  const failAndRollback = async (error: string): Promise<ActionResult> => {
    if (createdGuestIds.length) {
      await adminAny.from('guest_players').delete().in('id', createdGuestIds);
    }
    return { ok: false, error };
  };

  const slotIds: { profileId: string | null; guestId: string | null }[] = [];
  for (const s of slots) {
    if (s.profileId) {
      slotIds.push({ profileId: s.profileId, guestId: null });
      continue;
    }
    const { data: guestData, error: guestErr } = await adminAny
      .from('guest_players')
      .insert({ tournament_id: tournamentId, display_name: s.guestName, created_by: user.id })
      .select('id')
      .single();
    if (guestErr) return failAndRollback(translateDbError(guestErr.message));
    const guestId = (guestData as { id: string }).id;
    createdGuestIds.push(guestId);
    slotIds.push({ profileId: null, guestId });
  }

  // 4. Armar la fila de inscripción según el modo.
  const baseRow = {
    tournament_id: tournamentId,
    registered_by: user.id,
    status: 'confirmed',
    payment_amount: 0,
    confirmed_at: new Date().toISOString(),
  };
  const row: Record<string, unknown> =
    mode === 'single'
      ? slotIds[0]!.profileId
        ? { ...baseRow, player_id: slotIds[0]!.profileId }
        : { ...baseRow, guest_player_id: slotIds[0]!.guestId }
      : {
          ...baseRow,
          ...(slotIds[0]!.profileId
            ? { player_one_id: slotIds[0]!.profileId }
            : { guest_player_one_id: slotIds[0]!.guestId }),
          ...(slotIds[1]!.profileId
            ? { player_two_id: slotIds[1]!.profileId }
            : { guest_player_two_id: slotIds[1]!.guestId }),
        };

  const { error } = await admin.from('tournament_registrations').insert(row as never);
  if (error) return failAndRollback(translateDbError(error.message));

  revalidatePath(`/tournaments/${tournament.slug}`);
  revalidatePath(`/app/tournaments/${tournament.slug}/manage`);
  return { ok: true };
}

// ============================================================
// Bracket auto-generation (Americano Fijo)
// ============================================================
export async function closeRegistrationsAndGenerateBracket(
  formData: FormData,
): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const tournamentId = String(formData.get('tournament_id') ?? '');
  if (!tournamentId) return { ok: false, error: 'Torneo inválido' };

  const supabase = await getSupabaseServerClient();

  // 1. Verificar ownership + estado
  type TournamentForBracket = {
    id: string;
    slug: string;
    status: string;
    format: string;
    courts: number;
    total_rounds: number | null;
    clubs: { owner_id: string } | null;
    communities: { owner_id: string } | null;
  };
  const { data: tData } = await supabase
    .from('tournaments')
    .select('id, slug, status, format, courts, total_rounds, clubs(owner_id), communities(owner_id)')
    .eq('id', tournamentId)
    .single();
  const tournament = tData as unknown as TournamentForBracket | null;
  if (!tournament) return { ok: false, error: 'Torneo no existe' };
  const isOrganizer =
    tournament.clubs?.owner_id === user.id || tournament.communities?.owner_id === user.id;
  if (!isOrganizer) {
    return { ok: false, error: 'Solo el organizador puede cerrar las inscripciones' };
  }
  if (tournament.status !== 'open') {
    return { ok: false, error: `El torneo está "${tournament.status}", no se puede generar bracket.` };
  }
  // 2. Inscripciones confirmadas (incluye guests para soporte de inscripción manual)
  const { data: regs } = await supabase
    .from('tournament_registrations')
    .select('id, player_id, guest_player_id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');
  // Cast vía `unknown` porque guest_player_id aún no está en los types generados.
  const registrations = (regs ?? []) as unknown as {
    id: string;
    player_id: string | null;
    guest_player_id: string | null;
  }[];

  // Canchas: el organizador las elige manualmente, acotadas por #inscritos.
  // random/express son jugadores individuales (4 por cancha); el resto parejas
  // (2 por cancha). Fallback al valor guardado si no llega nada.
  const perCourt = tournament.format === 'americano_random' || tournament.format === 'express' ? 4 : 2;
  const maxCourts = Math.max(1, Math.floor(registrations.length / perCourt));
  const requestedCourts = Number(formData.get('courts') ?? 0);
  const courts =
    requestedCourts > 0
      ? Math.min(requestedCourts, maxCourts)
      : Math.min(tournament.courts ?? 2, maxCourts);

  // Helper para round-robin team-based (fijo/liga/liguilla): mapea round.matches
  // al shape de la tabla `matches` con registration_one_id/two_id.
  type TeamBasedRound = ReturnType<typeof generateFixedAmericano>[number];
  const teamBasedMatchRows = (rounds: TeamBasedRound[]) =>
    rounds.flatMap((round) =>
      round.matches.map((m) => ({
        tournament_id: tournamentId,
        round_number: m.roundNumber,
        court_number: m.courtNumber,
        registration_one_id: m.pairOne.playerOneId,
        registration_two_id: m.pairTwo.playerOneId,
        status: 'scheduled' as const,
      })),
    );

  // 3. Generar pareo + filas de matches según formato
  let matchRows: Record<string, unknown>[];

  switch (tournament.format) {
    case 'americano_random': {
      // Random (social): los participantes son jugadores individuales (profiles
      // o guests) y las parejas rotan cada ronda → guardamos los 4 slots por
      // partido (player_*_id O guest_*_id, XOR por slot).
      const guestIdSet = new Set<string>();
      const participantIds: string[] = [];
      for (const r of registrations) {
        if (r.player_id) {
          participantIds.push(r.player_id);
        } else if (r.guest_player_id) {
          participantIds.push(r.guest_player_id);
          guestIdSet.add(r.guest_player_id);
        }
      }
      if (participantIds.length < 4) {
        return { ok: false, error: 'Mínimo 4 jugadores inscritos para un Americano Random' };
      }
      const rounds = generateRandomAmericano({
        participantIds,
        courts,
        rounds: tournament.total_rounds ?? undefined,
      });
      const slot = (id: string, kind: 'player' | 'guest'): string | null => {
        const isGuest = guestIdSet.has(id);
        if (kind === 'player') return isGuest ? null : id;
        return isGuest ? id : null;
      };
      matchRows = rounds.flatMap((round) =>
        round.matches.map((m) => ({
          tournament_id: tournamentId,
          round_number: m.roundNumber,
          court_number: m.courtNumber,
          pair_one_player_one_id: slot(m.pairOne.playerOneId, 'player'),
          pair_one_player_two_id: slot(m.pairOne.playerTwoId, 'player'),
          pair_two_player_one_id: slot(m.pairTwo.playerOneId, 'player'),
          pair_two_player_two_id: slot(m.pairTwo.playerTwoId, 'player'),
          pair_one_guest_one_id: slot(m.pairOne.playerOneId, 'guest'),
          pair_one_guest_two_id: slot(m.pairOne.playerTwoId, 'guest'),
          pair_two_guest_one_id: slot(m.pairTwo.playerOneId, 'guest'),
          pair_two_guest_two_id: slot(m.pairTwo.playerTwoId, 'guest'),
          status: 'scheduled' as const,
        })),
      );
      break;
    }

    case 'express': {
      // Express: jugadores individuales (igual que random), pero pocas rondas.
      const guestIdSet = new Set<string>();
      const participantIds: string[] = [];
      for (const r of registrations) {
        if (r.player_id) {
          participantIds.push(r.player_id);
        } else if (r.guest_player_id) {
          participantIds.push(r.guest_player_id);
          guestIdSet.add(r.guest_player_id);
        }
      }
      if (participantIds.length < 4) {
        return { ok: false, error: 'Mínimo 4 jugadores inscritos para Express' };
      }
      const rounds = generateExpress({
        participantIds,
        courts,
        rounds: tournament.total_rounds ?? 6,
      });
      const slot = (id: string, kind: 'player' | 'guest'): string | null => {
        const isGuest = guestIdSet.has(id);
        if (kind === 'player') return isGuest ? null : id;
        return isGuest ? id : null;
      };
      matchRows = rounds.flatMap((round) =>
        round.matches.map((m) => ({
          tournament_id: tournamentId,
          round_number: m.roundNumber,
          court_number: m.courtNumber,
          pair_one_player_one_id: slot(m.pairOne.playerOneId, 'player'),
          pair_one_player_two_id: slot(m.pairOne.playerTwoId, 'player'),
          pair_two_player_one_id: slot(m.pairTwo.playerOneId, 'player'),
          pair_two_player_two_id: slot(m.pairTwo.playerTwoId, 'player'),
          pair_one_guest_one_id: slot(m.pairOne.playerOneId, 'guest'),
          pair_one_guest_two_id: slot(m.pairOne.playerTwoId, 'guest'),
          pair_two_guest_one_id: slot(m.pairTwo.playerOneId, 'guest'),
          pair_two_guest_two_id: slot(m.pairTwo.playerTwoId, 'guest'),
          status: 'scheduled' as const,
        })),
      );
      break;
    }

    case 'americano_fijo': {
      // Fijo: los participantes son parejas (registrations). Round-robin Berger.
      if (registrations.length < 2) {
        return { ok: false, error: 'Mínimo 2 parejas inscritas para generar bracket' };
      }
      const rounds = generateFixedAmericano({
        participantIds: registrations.map((r) => r.id),
        courts,
      });
      matchRows = teamBasedMatchRows(rounds);
      break;
    }

    case 'liga': {
      if (registrations.length < 2) {
        return { ok: false, error: 'Mínimo 2 parejas inscritas para Liga' };
      }
      const rounds = generateLeague({
        participantIds: registrations.map((r) => r.id),
        courts,
      });
      matchRows = teamBasedMatchRows(rounds);
      break;
    }

    case 'liguilla_casual': {
      if (registrations.length < 2) {
        return { ok: false, error: 'Mínimo 2 parejas inscritas para Liguilla' };
      }
      if (registrations.length > 8) {
        return {
          ok: false,
          error: 'Liguilla Casual soporta máximo 8 parejas. Usá Liga para más participantes.',
        };
      }
      const rounds = generateLiguillaCasual({
        participantIds: registrations.map((r) => r.id),
        courts,
      });
      matchRows = teamBasedMatchRows(rounds);
      break;
    }

    case 'eliminacion': {
      if (registrations.length < 2) {
        return { ok: false, error: 'Mínimo 2 parejas inscritas para eliminación directa' };
      }
      const elimRounds = generateSingleElimination({
        participantIds: registrations.map((r) => r.id),
        courts,
      });
      // Para eliminación directa solo insertamos ronda 1 (los participantes ya
      // están definidos por seeding). Las rondas siguientes se generan cuando
      // se completan los matches previos (acción pendiente: advanceWinner).
      // Los matches con BYE quedan auto-completed con winner = lado con
      // registración válida.
      matchRows = elimRounds
        .filter((r) => r.roundNumber === 1)
        .flatMap((round) =>
          round.matches
            .filter((m) => m.registrationOne.registrationId && m.registrationTwo.registrationId)
            .map((m) => ({
              tournament_id: tournamentId,
              round_number: m.roundNumber,
              court_number: m.courtNumber,
              registration_one_id: m.registrationOne.registrationId,
              registration_two_id: m.registrationTwo.registrationId,
              status: 'scheduled' as const,
            })),
        );
      break;
    }

    default: {
      return {
        ok: false,
        error: `Formato "${tournament.format}" no soportado para generación automática de bracket.`,
      };
    }
  }

  if (matchRows.length === 0) {
    return { ok: false, error: 'No se generaron matches (revisar #jugadores/parejas vs canchas)' };
  }

  // 4. Limpiar matches viejos (idempotencia: si re-generan, empieza limpio).
  //    Service role: la RLS de insert/delete de matches exige club owner, pero
  //    un torneo de comunidad no tiene club. La autorización ya se validó arriba.
  const admin = getServiceRoleClient();
  await admin.from('matches').delete().eq('tournament_id', tournamentId);

  // 5. Insertar todos
  const { error: insertErr } = await admin.from('matches').insert(matchRows as never);
  if (insertErr) return { ok: false, error: translateDbError(insertErr.message) };

  // 6. Pasar a in_progress
  const { error: updErr } = await supabase
    .from('tournaments')
    .update({ status: 'in_progress', courts } as never)
    .eq('id', tournamentId);
  if (updErr) return { ok: false, error: translateDbError(updErr.message) };

  // 7. Notificar a todos los participantes que el torneo arrancó
  type RegPlayer = {
    player_one_id: string | null;
    player_two_id: string | null;
    player_id: string | null;
  };
  const { data: regsForNotif } = await supabase
    .from('tournament_registrations')
    .select('player_one_id, player_two_id, player_id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');
  const playerIds = new Set<string>();
  for (const r of (regsForNotif ?? []) as RegPlayer[]) {
    if (r.player_one_id) playerIds.add(r.player_one_id);
    if (r.player_two_id) playerIds.add(r.player_two_id);
    if (r.player_id) playerIds.add(r.player_id);
  }
  if (playerIds.size > 0) {
    await createNotifications(
      [...playerIds].map((pid) => ({
        profileId: pid,
        type: 'tournament_starting',
        title: 'El torneo arrancó',
        body: 'Ya está el bracket listo. Mira tus matches.',
        link: `/tournaments/${tournament.slug}/live`,
      })),
    );
  }

  revalidatePath(`/tournaments/${tournament.slug}`);
  revalidatePath(`/app/tournaments/${tournament.slug}/manage`);
  return { ok: true };
}

/**
 * Finaliza el torneo (organizador). Pasa a 'finished'; el ranking de la
 * comunidad lo toma desde sus matches completados.
 */
export async function finishTournament(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const tournamentId = String(formData.get('tournament_id') ?? '');
  if (!tournamentId) return { ok: false, error: 'Torneo inválido' };

  const supabase = await getSupabaseServerClient();
  const { data: tData } = await supabase
    .from('tournaments')
    .select('id, slug, status, community_id, clubs(owner_id), communities(owner_id, slug)')
    .eq('id', tournamentId)
    .single();
  const t = tData as unknown as {
    id: string;
    slug: string;
    status: string;
    community_id: string | null;
    clubs: { owner_id: string } | null;
    communities: { owner_id: string; slug: string } | null;
  } | null;
  if (!t) return { ok: false, error: 'Torneo no existe' };
  const isOrganizer = t.clubs?.owner_id === user.id || t.communities?.owner_id === user.id;
  if (!isOrganizer) return { ok: false, error: 'Solo el organizador puede finalizar el torneo' };
  if (t.status !== 'in_progress') {
    return { ok: false, error: `El torneo está "${t.status}", no se puede finalizar.` };
  }

  const { error } = await supabase
    .from('tournaments')
    .update({ status: 'finished' } as never)
    .eq('id', tournamentId);
  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath(`/tournaments/${t.slug}`);
  revalidatePath(`/tournaments/${t.slug}/live`);
  if (t.communities?.slug) revalidatePath(`/app/communities/${t.communities.slug}`);
  revalidatePath('/app/communities');

  // Invalidar cache de rankings de la comunidad organizadora.
  if (t.community_id) {
    revalidateTag(playerRankingTag(t.community_id));
    revalidateTag(teamRankingTag(t.community_id));
  }

  return { ok: true };
}

// ============================================================
// Reporte de marcadores (organizador-only en MVP)
// ============================================================
// ============================================================
// Scoring: reporte + confirmación por las 2 parejas + override organizador
// ============================================================

type MatchCtx = {
  id: string;
  tournament_id: string;
  registration_one_id: string | null;
  registration_two_id: string | null;
  status: string;
  score_one: number | null;
  score_two: number | null;
  confirmed_by_one: boolean;
  confirmed_by_two: boolean;
  reported_by_registration_id: string | null;
  reported_by_side: number | null;
  pair_one_player_one_id: string | null;
  pair_one_player_two_id: string | null;
  pair_two_player_one_id: string | null;
  pair_two_player_two_id: string | null;
};
type RegCtx = {
  id: string;
  team_id: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  player_id: string | null;
};

/**
 * Determina el rol del caller respecto a un match: si es el organizador
 * (owner del club o de la comunidad) y de qué lado juega. Funciona para:
 *  - fijo: el lado sale de las registrations (jugador directo o team member);
 *  - random: el lado sale de los 4 jugadores del partido (parejas efímeras).
 * `reportedBySide` unifica quién reportó (registration en fijo, side en random).
 */
async function getMatchContext(
  matchId: string,
  userId: string,
): Promise<{
  match: MatchCtx;
  slug: string | null;
  isOrganizer: boolean;
  side: 'one' | 'two' | null;
  isRandom: boolean;
  reportedBySide: 'one' | 'two' | null;
} | null> {
  const supabase = await getSupabaseServerClient();
  const { data: m } = await supabase
    .from('matches')
    .select(
      'id, tournament_id, registration_one_id, registration_two_id, status, score_one, score_two, confirmed_by_one, confirmed_by_two, reported_by_registration_id, reported_by_side, pair_one_player_one_id, pair_one_player_two_id, pair_two_player_one_id, pair_two_player_two_id',
    )
    .eq('id', matchId)
    .maybeSingle();
  const match = m as unknown as MatchCtx | null;
  if (!match) return null;

  const { data: t } = await supabase
    .from('tournaments')
    .select('slug, clubs(owner_id), communities(owner_id)')
    .eq('id', match.tournament_id)
    .single();
  const tour = t as unknown as {
    slug: string;
    clubs: { owner_id: string } | null;
    communities: { owner_id: string } | null;
  } | null;
  const isOrganizer =
    (Boolean(tour?.clubs?.owner_id) && tour?.clubs?.owner_id === userId) ||
    (Boolean(tour?.communities?.owner_id) && tour?.communities?.owner_id === userId);

  const isRandom = Boolean(match.pair_one_player_one_id);
  let side: 'one' | 'two' | null = null;

  if (isRandom) {
    if (match.pair_one_player_one_id === userId || match.pair_one_player_two_id === userId) {
      side = 'one';
    } else if (
      match.pair_two_player_one_id === userId ||
      match.pair_two_player_two_id === userId
    ) {
      side = 'two';
    }
  } else {
    const regIds = [match.registration_one_id, match.registration_two_id].filter(Boolean) as string[];
    const { data: regsData } = await supabase
      .from('tournament_registrations')
      .select('id, team_id, player_one_id, player_two_id, player_id')
      .in('id', regIds);
    const regs = (regsData ?? []) as RegCtx[];

    const teamIds = regs.map((r) => r.team_id).filter(Boolean) as string[];
    let userTeamIds = new Set<string>();
    if (teamIds.length) {
      const { data: tmData } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('profile_id', userId)
        .eq('is_active', true)
        .in('team_id', teamIds);
      userTeamIds = new Set(((tmData ?? []) as { team_id: string }[]).map((x) => x.team_id));
    }

    const isMember = (r: RegCtx | undefined): boolean => {
      if (!r) return false;
      if (r.player_one_id === userId || r.player_two_id === userId || r.player_id === userId) return true;
      return Boolean(r.team_id && userTeamIds.has(r.team_id));
    };
    side = isMember(regs.find((r) => r.id === match.registration_one_id))
      ? 'one'
      : isMember(regs.find((r) => r.id === match.registration_two_id))
        ? 'two'
        : null;
  }

  const reportedBySide: 'one' | 'two' | null = isRandom
    ? match.reported_by_side === 1
      ? 'one'
      : match.reported_by_side === 2
        ? 'two'
        : null
    : match.reported_by_registration_id === match.registration_one_id
      ? 'one'
      : match.reported_by_registration_id === match.registration_two_id
        ? 'two'
        : null;

  return { match, slug: tour?.slug ?? null, isOrganizer, side, isRandom, reportedBySide };
}

function revalidateMatch(slug: string | null) {
  if (!slug) return;
  revalidatePath(`/tournaments/${slug}`);
  revalidatePath(`/tournaments/${slug}/live`);
  revalidatePath(`/app/tournaments/${slug}/manage`);
}

/**
 * Aplica ELO a los 4 jugadores del match + notifica. Idempotente: no
 * re-aplica si elo_applied_at ya está seteado. Se invoca al completar un
 * match (confirmación de ambas parejas, override del organizador, o cron).
 * Exportada para que el cron de auto-confirm la reutilice.
 */
export async function applyMatchEloAndNotify(matchId: string): Promise<void> {
  // service role en todas las lecturas para que el cron (sin sesión) funcione.
  const admin = getServiceRoleClient();
  const { data } = await admin
    .from('matches')
    .select(
      'tournament_id, registration_one_id, registration_two_id, score_one, score_two, elo_applied_at, pair_one_player_one_id, pair_one_player_two_id, pair_two_player_one_id, pair_two_player_two_id, pair_one_guest_one_id, pair_one_guest_two_id, pair_two_guest_one_id, pair_two_guest_two_id, tournaments(slug, community_id)',
    )
    .eq('id', matchId)
    .single();
  const matchData = data as unknown as {
    tournament_id: string;
    registration_one_id: string | null;
    registration_two_id: string | null;
    score_one: number | null;
    score_two: number | null;
    elo_applied_at: string | null;
    pair_one_player_one_id: string | null;
    pair_one_player_two_id: string | null;
    pair_two_player_one_id: string | null;
    pair_two_player_two_id: string | null;
    pair_one_guest_one_id: string | null;
    pair_one_guest_two_id: string | null;
    pair_two_guest_one_id: string | null;
    pair_two_guest_two_id: string | null;
    tournaments: { slug: string; community_id: string | null } | null;
  } | null;
  if (!matchData || matchData.elo_applied_at) return;

  const scoreOne = matchData.score_one ?? 0;
  const scoreTwo = matchData.score_two ?? 0;

  type RegRow = {
    id: string;
    player_one_id: string | null;
    player_two_id: string | null;
    player_id: string | null;
    guest_player_id: string | null;
    guest_player_one_id: string | null;
    guest_player_two_id: string | null;
  };
  const regIds = [matchData.registration_one_id, matchData.registration_two_id].filter(
    Boolean,
  ) as string[];
  const { data: regsData } = regIds.length
    ? await admin
        .from('tournament_registrations')
        .select(
          'id, player_one_id, player_two_id, player_id, guest_player_id, guest_player_one_id, guest_player_two_id',
        )
        .in('id', regIds)
    : { data: [] };
  // Cast vía `unknown` porque las columnas guest_*_id aún no están en los types generados.
  const regs = (regsData ?? []) as unknown as RegRow[];
  const regOne = regs.find((r) => r.id === matchData.registration_one_id);
  const regTwo = regs.find((r) => r.id === matchData.registration_two_id);

  // Guard: ELO solo se aplica si los 4 slots son profiles válidos. Si hay
  // algún guest (en matches o en regs) o si las 4 columnas player_*_id no
  // están presentes, salteamos el cálculo. SIEMPRE marcamos elo_applied_at
  // al final para que el cron no reintente eternamente (bug pre-existente).
  const hasGuestInMatch = Boolean(
    matchData.pair_one_guest_one_id ||
      matchData.pair_one_guest_two_id ||
      matchData.pair_two_guest_one_id ||
      matchData.pair_two_guest_two_id,
  );
  const hasGuestInRegs = Boolean(
    regOne?.guest_player_id ||
      regOne?.guest_player_one_id ||
      regOne?.guest_player_two_id ||
      regTwo?.guest_player_id ||
      regTwo?.guest_player_one_id ||
      regTwo?.guest_player_two_id,
  );
  const allFourAreProfiles = Boolean(
    regOne?.player_one_id && regOne?.player_two_id && regTwo?.player_one_id && regTwo?.player_two_id,
  );

  if (allFourAreProfiles && !hasGuestInMatch && !hasGuestInRegs) {
    // Validación extra: los 4 ids tienen un profile real en la tabla. Si por
    // alguna razón uno fue borrado (ON DELETE RESTRICT debería impedirlo,
    // pero defense-in-depth), abortamos el cálculo pero igual marcamos el
    // match como elo_applied para no loopear.
    const playerIds = [
      regOne!.player_one_id!,
      regOne!.player_two_id!,
      regTwo!.player_one_id!,
      regTwo!.player_two_id!,
    ];
    const { data: profilesData } = await admin
      .from('profiles')
      .select('id, elo_rating')
      .in('id', playerIds);
    const profiles = (profilesData ?? []) as unknown as { id: string; elo_rating: number }[];
    const allProfilesExist = profiles.length === new Set(playerIds).size;

    if (allProfilesExist) {
      const { data: tData } = await admin
        .from('tournaments')
        .select('tier')
        .eq('id', matchData.tournament_id)
        .single();
      const tier = (tData as { tier: string } | null)?.tier;
      const k = tier === 'competitivo' ? 32 : 16;

      const eloMap = new Map(profiles.map((p) => [p.id, p.elo_rating]));

      const { deltaOne, deltaTwo } = computePaddleEloDeltas({
        pairOne: {
          p1: eloMap.get(regOne!.player_one_id!) ?? 1000,
          p2: eloMap.get(regOne!.player_two_id!) ?? 1000,
        },
        pairTwo: {
          p1: eloMap.get(regTwo!.player_one_id!) ?? 1000,
          p2: eloMap.get(regTwo!.player_two_id!) ?? 1000,
        },
        scoreOne,
        scoreTwo,
        k,
      });

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const rpc = (admin as any).rpc.bind(admin) as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{ error: { message: string } | null }>;

      await Promise.all([
        rpc('apply_elo_delta', { p_profile_id: regOne!.player_one_id, p_delta: deltaOne, p_match_id: matchId }),
        rpc('apply_elo_delta', { p_profile_id: regOne!.player_two_id, p_delta: deltaOne, p_match_id: matchId }),
        rpc('apply_elo_delta', { p_profile_id: regTwo!.player_one_id, p_delta: deltaTwo, p_match_id: matchId }),
        rpc('apply_elo_delta', { p_profile_id: regTwo!.player_two_id, p_delta: deltaTwo, p_match_id: matchId }),
      ]);
    }
  }

  // SIEMPRE marcar elo_applied_at al completar (con ELO o sin ELO) — esto
  // arregla el bug pre-existente donde matches random o mixtos hacían loop
  // infinito en el cron de auto-confirm.
  await admin
    .from('matches')
    .update({ elo_applied_at: new Date().toISOString() } as never)
    .eq('id', matchId);

  const slug = matchData.tournaments?.slug ?? null;
  const pids = new Set<string>();
  for (const r of regs) {
    if (r.player_one_id) pids.add(r.player_one_id);
    if (r.player_two_id) pids.add(r.player_two_id);
    if (r.player_id) pids.add(r.player_id);
  }
  // Random: los jugadores no salen de registrations sino de los 4 del partido.
  // Solo agregamos slots de profile (los guests no reciben notificaciones).
  for (const pid of [
    matchData.pair_one_player_one_id,
    matchData.pair_one_player_two_id,
    matchData.pair_two_player_one_id,
    matchData.pair_two_player_two_id,
  ]) {
    if (pid) pids.add(pid);
  }
  if (pids.size > 0 && slug) {
    await createNotifications(
      [...pids].map((pid) => ({
        profileId: pid,
        type: 'match_result',
        title: `Resultado confirmado: ${scoreOne} - ${scoreTwo}`,
        body: 'Revisa el bracket en vivo.',
        link: `/tournaments/${slug}/live`,
      })),
    );
  }

  // Invalidar cache de rankings de la comunidad (si el torneo pertenece a una).
  const communityId = matchData.tournaments?.community_id ?? null;
  if (communityId) {
    revalidateTag(playerRankingTag(communityId));
    revalidateTag(teamRankingTag(communityId));
  }

  revalidateMatch(slug);
}

/**
 * Reporta el marcador de un partido.
 * - Organizador (owner del club): cierra directo → completed + ELO.
 * - Jugador participante: queda pending_confirmation (sin ELO) hasta que
 *   la otra pareja confirme o el organizador fuerce el cierre.
 */
export async function reportMatchScore(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const matchId = String(formData.get('match_id') ?? '');
  const scoreOneRaw = String(formData.get('score_one') ?? '').trim();
  const scoreTwoRaw = String(formData.get('score_two') ?? '').trim();

  if (!matchId) return { ok: false, error: 'Match inválido' };
  if (scoreOneRaw === '' || scoreTwoRaw === '') {
    return { ok: false, error: 'Faltan los dos marcadores' };
  }
  const scoreOne = Number(scoreOneRaw);
  const scoreTwo = Number(scoreTwoRaw);
  if (!Number.isInteger(scoreOne) || !Number.isInteger(scoreTwo)) {
    return { ok: false, error: 'Marcador debe ser número entero' };
  }
  if (scoreOne < 0 || scoreTwo < 0 || scoreOne > 99 || scoreTwo > 99) {
    return { ok: false, error: 'Marcador fuera de rango (0-99)' };
  }

  const ctx = await getMatchContext(matchId, user.id);
  if (!ctx) return { ok: false, error: 'Partido no encontrado' };
  if (!ctx.isOrganizer && !ctx.side) {
    return { ok: false, error: 'No participás en este partido' };
  }

  // Validación + autorización ya resueltas en getMatchContext → usamos
  // service role para el UPDATE (las parejas ad-hoc no pasan la RLS de
  // matches, que solo cubre team_members).
  const admin = getServiceRoleClient();

  // Organizador: autoridad, cierra directo.
  if (ctx.isOrganizer) {
    const { error } = await admin
      .from('matches')
      .update({
        score_one: scoreOne,
        score_two: scoreTwo,
        status: 'completed',
        confirmed_by_one: true,
        confirmed_by_two: true,
        reported_by_registration_id: null,
        reported_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
      } as never)
      .eq('id', matchId);
    if (error) return { ok: false, error: translateDbError(error.message) };
    await applyMatchEloAndNotify(matchId);
    return { ok: true };
  }

  // Jugador: reporta → pending_confirmation, marca su lado, sin ELO.
  const reportUpdate: Record<string, unknown> = {
    score_one: scoreOne,
    score_two: scoreTwo,
    status: 'pending_confirmation',
    reported_at: new Date().toISOString(),
    confirmed_by_one: ctx.side === 'one',
    confirmed_by_two: ctx.side === 'two',
    ended_at: null,
  };
  if (ctx.isRandom) {
    // Random: no hay registration-pareja; marcamos el lado que reportó.
    reportUpdate.reported_by_side = ctx.side === 'one' ? 1 : 2;
  } else {
    reportUpdate.reported_by_registration_id =
      ctx.side === 'one' ? ctx.match.registration_one_id : ctx.match.registration_two_id;
  }
  const { error } = await admin.from('matches').update(reportUpdate as never).eq('id', matchId);
  if (error) return { ok: false, error: translateDbError(error.message) };

  // Jugadores de la otra pareja, para notificarles que confirmen.
  let otherPids: string[];
  if (ctx.isRandom) {
    otherPids = (
      ctx.side === 'one'
        ? [ctx.match.pair_two_player_one_id, ctx.match.pair_two_player_two_id]
        : [ctx.match.pair_one_player_one_id, ctx.match.pair_one_player_two_id]
    ).filter(Boolean) as string[];
  } else {
    const otherReg =
      ctx.side === 'one' ? ctx.match.registration_two_id : ctx.match.registration_one_id;
    const { data: otherRegData } = await admin
      .from('tournament_registrations')
      .select('player_one_id, player_two_id, player_id')
      .eq('id', otherReg ?? '')
      .maybeSingle();
    const other = otherRegData as {
      player_one_id: string | null;
      player_two_id: string | null;
      player_id: string | null;
    } | null;
    otherPids = [other?.player_one_id, other?.player_two_id, other?.player_id].filter(
      Boolean,
    ) as string[];
  }
  if (otherPids.length && ctx.slug) {
    await createNotifications(
      otherPids.map((pid) => ({
        profileId: pid,
        type: 'match_result',
        title: `Confirma el marcador: ${scoreOne} - ${scoreTwo}`,
        body: 'La otra pareja reportó el resultado. Confírmalo o repórtalo distinto.',
        link: `/tournaments/${ctx.slug}/live`,
      })),
    );
  }
  revalidateMatch(ctx.slug);
  return { ok: true };
}

/**
 * La otra pareja confirma o disputa el marcador reportado.
 * - confirm=true: ambos confirmados → completed + ELO.
 * - confirm=false: queda disputed → lo resuelve el organizador.
 */
export async function confirmMatchScore(matchId: string, confirm: boolean): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const ctx = await getMatchContext(matchId, user.id);
  if (!ctx) return { ok: false, error: 'Partido no encontrado' };
  if (!ctx.side) return { ok: false, error: 'No participás en este partido' };
  if (ctx.match.status !== 'pending_confirmation') {
    return { ok: false, error: 'Este partido no está pendiente de confirmación' };
  }
  if (ctx.reportedBySide && ctx.reportedBySide === ctx.side) {
    return { ok: false, error: 'Vos reportaste este marcador. Espera que la otra pareja confirme.' };
  }

  const admin = getServiceRoleClient();

  if (!confirm) {
    const { error } = await admin
      .from('matches')
      .update({ status: 'disputed' } as never)
      .eq('id', matchId);
    if (error) return { ok: false, error: translateDbError(error.message) };
    revalidateMatch(ctx.slug);
    return { ok: true };
  }

  const { error } = await admin
    .from('matches')
    .update({
      status: 'completed',
      confirmed_by_one: true,
      confirmed_by_two: true,
      ended_at: new Date().toISOString(),
    } as never)
    .eq('id', matchId);
  if (error) return { ok: false, error: translateDbError(error.message) };
  await applyMatchEloAndNotify(matchId);
  return { ok: true };
}

/**
 * El organizador fuerza el cierre de un partido (desbloquea ragequit /
 * disputa). Requiere que haya un marcador reportado.
 */
export async function forceCompleteMatch(matchId: string): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const ctx = await getMatchContext(matchId, user.id);
  if (!ctx) return { ok: false, error: 'Partido no encontrado' };
  if (!ctx.isOrganizer) {
    return { ok: false, error: 'Solo el organizador puede forzar el cierre' };
  }
  if (ctx.match.score_one == null || ctx.match.score_two == null) {
    return { ok: false, error: 'No hay marcador reportado para cerrar' };
  }

  const admin = getServiceRoleClient();
  const { error } = await admin
    .from('matches')
    .update({
      status: 'completed',
      confirmed_by_one: true,
      confirmed_by_two: true,
      ended_at: new Date().toISOString(),
    } as never)
    .eq('id', matchId);
  if (error) return { ok: false, error: translateDbError(error.message) };
  await applyMatchEloAndNotify(matchId);
  return { ok: true };
}
