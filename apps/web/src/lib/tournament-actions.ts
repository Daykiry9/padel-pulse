'use server';

import { revalidatePath } from 'next/cache';

import { tierOf, weightOf } from '@padelking/domain';
import type {
  CategoryKind,
  PairingMode,
  TeamCategory,
  TournamentFormat,
} from '@padelking/domain';

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

  if (error) return { ok: false, error: error.message };

  const slugResult = (data as { slug: string } | null)?.slug ?? '';
  revalidatePath('/tournaments');
  revalidatePath('/app');
  return { ok: true, redirectTo: `/tournaments/${slugResult}` };
}

export async function registerToTournament(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const tournamentId = String(formData.get('tournament_id') ?? '');
  const teamId = String(formData.get('team_id') ?? '') || null;
  const asPlayer = formData.get('as_player') === '1';

  if (!tournamentId) return { ok: false, error: 'Torneo inválido' };

  const supabase = await getSupabaseServerClient();

  if (asPlayer) {
    const { error } = await supabase.from('tournament_registrations').insert({
      tournament_id: tournamentId,
      player_id: user.id,
      registered_by: user.id,
      status: 'confirmed', // sin pagos en MVP
      payment_amount: 0,
    } as never);
    if (error) return { ok: false, error: error.message };
  } else {
    if (!teamId) return { ok: false, error: 'Selecciona tu equipo' };

    // Obtener miembros activos del team
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
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/tournaments`);
  return { ok: true };
}
