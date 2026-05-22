'use server';

import { revalidatePath } from 'next/cache';

import { applyPaddleElo, generateFixedAmericano, tierOf, weightOf } from '@padelking/domain';
import type {
  CategoryKind,
  PairingMode,
  TeamCategory,
  TournamentFormat,
} from '@padelking/domain';

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
  const clubId = String(formData.get('club_id') ?? '');
  const startsAt = String(formData.get('starts_at') ?? '');
  const maxTeams = Number(formData.get('max_teams') ?? 16);
  const pricePerTeam = Number(formData.get('price_per_team') ?? 0);
  const pairingMode = (String(formData.get('pairing_mode') ?? '') || null) as PairingMode | null;
  const description = String(formData.get('description') ?? '').trim() || null;

  if (!name || name.length < 4) return { ok: false, error: 'Nombre del torneo muy corto' };
  if (!format) return { ok: false, error: 'Selecciona un formato' };
  if (!clubId) return { ok: false, error: 'Selecciona una sede' };
  if (!startsAt) return { ok: false, error: 'Fecha de inicio requerida' };

  if (categoryKind === 'estandar' || categoryKind === 'queens_estandar') {
    if (!category) return { ok: false, error: 'Selecciona la categoría estándar del torneo' };
  }
  if (categoryKind === 'suma' || categoryKind === 'queens_suma' || categoryKind === 'mixto_suma') {
    if (!minSumRaw) return { ok: false, error: 'Especifica el min_sum del torneo' };
  }

  const supabase = await getSupabaseServerClient();

  const startsDate = new Date(startsAt);
  const endsDate = new Date(startsDate.getTime() + 6 * 3600 * 1000); // +6h default
  const registrationDeadline = new Date(startsDate.getTime() - 24 * 3600 * 1000);

  const tier = tierOf(format);
  const weight = weightOf(format);
  const competitionUnit = format === 'americano_random' ? 'player' : 'team';

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
      pairing_mode: pairingMode,
      club_id: clubId,
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
    club_id: string;
    clubs: { owner_id: string } | null;
  };
  const { data: tData } = await supabase
    .from('tournaments')
    .select('id, slug, status, format, courts, club_id, clubs(owner_id)')
    .eq('id', tournamentId)
    .single();
  const tournament = tData as unknown as TournamentForBracket | null;
  if (!tournament) return { ok: false, error: 'Torneo no existe' };
  if (tournament.clubs?.owner_id !== user.id) {
    return { ok: false, error: 'Solo el dueño del club puede cerrar las inscripciones' };
  }
  if (tournament.status !== 'open') {
    return { ok: false, error: `El torneo está "${tournament.status}", no se puede generar bracket.` };
  }
  if (!tournament.format.startsWith('americano')) {
    return {
      ok: false,
      error: 'Solo torneos Americano soportan bracket auto-generado por ahora.',
    };
  }
  if (tournament.format === 'americano_random') {
    return { ok: false, error: 'Americano Random aún no soportado en bracket auto. Próximamente.' };
  }

  // 2. Inscripciones confirmadas
  const { data: regs } = await supabase
    .from('tournament_registrations')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('status', 'confirmed');
  const registrations = (regs ?? []) as { id: string }[];
  if (registrations.length < 2) {
    return { ok: false, error: 'Mínimo 2 equipos inscritos para generar bracket' };
  }

  // 3. Generar pareo con Berger
  const rounds = generateFixedAmericano({
    participantIds: registrations.map((r) => r.id),
    courts: tournament.courts ?? 2,
  });

  const matchRows = rounds.flatMap((round) =>
    round.matches.map((m) => ({
      tournament_id: tournamentId,
      round_number: m.roundNumber,
      court_number: m.courtNumber,
      registration_one_id: m.pairOne.playerOneId,
      registration_two_id: m.pairTwo.playerOneId,
      status: 'scheduled' as const,
    })),
  );

  if (matchRows.length === 0) {
    return { ok: false, error: 'No se generaron matches (revisar #equipos vs canchas)' };
  }

  // 4. Limpiar matches viejos (idempotencia: si re-generan, empieza limpio)
  await supabase.from('matches').delete().eq('tournament_id', tournamentId);

  // 5. Insertar todos
  const { error: insertErr } = await supabase.from('matches').insert(matchRows as never);
  if (insertErr) return { ok: false, error: translateDbError(insertErr.message) };

  // 6. Pasar a in_progress
  const { error: updErr } = await supabase
    .from('tournaments')
    .update({ status: 'in_progress' } as never)
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

// ============================================================
// Reporte de marcadores (organizador-only en MVP)
// ============================================================
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

  const supabase = await getSupabaseServerClient();

  // RLS se encarga de validar que el caller sea owner o participante
  const isCompleted = scoreOne > 0 || scoreTwo > 0;
  const { data, error } = await supabase
    .from('matches')
    .update({
      score_one: scoreOne,
      score_two: scoreTwo,
      status: isCompleted ? 'completed' : 'scheduled',
      ended_at: isCompleted ? new Date().toISOString() : null,
    } as never)
    .eq('id', matchId)
    .select(
      'tournament_id, registration_one_id, registration_two_id, tournaments(slug)',
    )
    .single();

  if (error) return { ok: false, error: translateDbError(error.message) };

  const matchData = data as unknown as {
    tournament_id: string;
    registration_one_id: string;
    registration_two_id: string;
    tournaments: { slug: string } | null;
  } | null;
  const slug = matchData?.tournaments?.slug;

  // Side effects post-completed: notificaciones + ELO
  if (isCompleted && matchData) {
    type RegRow = {
      id: string;
      player_one_id: string | null;
      player_two_id: string | null;
      player_id: string | null;
    };
    const { data: regsData } = await supabase
      .from('tournament_registrations')
      .select('id, player_one_id, player_two_id, player_id')
      .in('id', [matchData.registration_one_id, matchData.registration_two_id]);
    const regs = (regsData ?? []) as RegRow[];
    const regOne = regs.find((r) => r.id === matchData.registration_one_id);
    const regTwo = regs.find((r) => r.id === matchData.registration_two_id);

    // ELO update — solo si ambas registrations son parejas (2 players cada)
    if (
      regOne?.player_one_id &&
      regOne?.player_two_id &&
      regTwo?.player_one_id &&
      regTwo?.player_two_id
    ) {
      const { data: tData } = await supabase
        .from('tournaments')
        .select('tier')
        .eq('id', matchData.tournament_id)
        .single();
      const tier = (tData as { tier: string } | null)?.tier;
      const k = tier === 'competitivo' ? 32 : 16;

      const playerIds = [
        regOne.player_one_id,
        regOne.player_two_id,
        regTwo.player_one_id,
        regTwo.player_two_id,
      ];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, elo_rating')
        .in('id', playerIds);
      const eloMap = new Map(
        ((profilesData ?? []) as unknown as { id: string; elo_rating: number }[]).map((p) => [
          p.id,
          p.elo_rating,
        ]),
      );

      const beforeOnePOne = eloMap.get(regOne.player_one_id) ?? 1000;
      const beforeOnePTwo = eloMap.get(regOne.player_two_id) ?? 1000;
      const beforeTwoPOne = eloMap.get(regTwo.player_one_id) ?? 1000;
      const beforeTwoPTwo = eloMap.get(regTwo.player_two_id) ?? 1000;

      const eloResult = applyPaddleElo({
        pairOne: { p1: beforeOnePOne, p2: beforeOnePTwo },
        pairTwo: { p1: beforeTwoPOne, p2: beforeTwoPTwo },
        scoreOne,
        scoreTwo,
        k,
      });

      const admin = getServiceRoleClient();
      await Promise.all([
        admin
          .from('profiles')
          .update({ elo_rating: eloResult.pairOne.p1 } as never)
          .eq('id', regOne.player_one_id),
        admin
          .from('profiles')
          .update({ elo_rating: eloResult.pairOne.p2 } as never)
          .eq('id', regOne.player_two_id),
        admin
          .from('profiles')
          .update({ elo_rating: eloResult.pairTwo.p1 } as never)
          .eq('id', regTwo.player_one_id),
        admin
          .from('profiles')
          .update({ elo_rating: eloResult.pairTwo.p2 } as never)
          .eq('id', regTwo.player_two_id),
      ]);

      // History
      await (admin as never as { from: (t: string) => { insert: (rows: unknown) => Promise<unknown> } })
        .from('elo_history')
        .insert([
          {
            profile_id: regOne.player_one_id,
            match_id: matchId,
            elo_before: beforeOnePOne,
            elo_after: eloResult.pairOne.p1,
            delta: eloResult.pairOne.delta,
          },
          {
            profile_id: regOne.player_two_id,
            match_id: matchId,
            elo_before: beforeOnePTwo,
            elo_after: eloResult.pairOne.p2,
            delta: eloResult.pairOne.delta,
          },
          {
            profile_id: regTwo.player_one_id,
            match_id: matchId,
            elo_before: beforeTwoPOne,
            elo_after: eloResult.pairTwo.p1,
            delta: eloResult.pairTwo.delta,
          },
          {
            profile_id: regTwo.player_two_id,
            match_id: matchId,
            elo_before: beforeTwoPTwo,
            elo_after: eloResult.pairTwo.p2,
            delta: eloResult.pairTwo.delta,
          },
        ]);
    }

    // Notificaciones a los 4 jugadores
    const playerIds = new Set<string>();
    for (const r of regs) {
      if (r.player_one_id) playerIds.add(r.player_one_id);
      if (r.player_two_id) playerIds.add(r.player_two_id);
      if (r.player_id) playerIds.add(r.player_id);
    }
    if (playerIds.size > 0 && slug) {
      await createNotifications(
        [...playerIds].map((pid) => ({
          profileId: pid,
          type: 'match_result',
          title: `Marcador reportado: ${scoreOne} - ${scoreTwo}`,
          body: 'Revisa el bracket en vivo.',
          link: `/tournaments/${slug}/live`,
        })),
      );
    }
  }
  if (slug) {
    revalidatePath(`/tournaments/${slug}`);
    revalidatePath(`/tournaments/${slug}/live`);
    revalidatePath(`/app/tournaments/${slug}/manage`);
  }
  return { ok: true };
}
