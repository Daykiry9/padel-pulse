'use server';

import { revalidatePath } from 'next/cache';

import { getSession, getSupabaseServerClient } from './supabase/server';
import { getServiceRoleClient } from './supabase/admin';
import { translateDbError } from './error-translate';
import { createNotifications } from './notification-actions';
import type { ActionResult } from './auth-actions';

// open_matches y open_match_participants no están en database.types generado.
// Casteo a permisivo para evitar verbosity de generics. Runtime es correcto.
/* eslint-disable @typescript-eslint/no-explicit-any */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

export async function createOpenMatch(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const city = String(formData.get('city') ?? '').trim();
  const venue = String(formData.get('venue') ?? '').trim() || null;
  const scheduledAt = String(formData.get('scheduled_at') ?? '');
  const durationMinutes = Number(formData.get('duration_minutes') ?? 90);
  const category = String(formData.get('category') ?? '').trim() || null;
  const maxPlayersRaw = Number(formData.get('max_players') ?? 4);
  const message = String(formData.get('message') ?? '').trim() || null;

  if (!city) return { ok: false, error: 'Ciudad requerida' };
  if (!scheduledAt) return { ok: false, error: 'Fecha y hora requeridas' };
  const when = new Date(scheduledAt);
  if (isNaN(when.getTime())) return { ok: false, error: 'Fecha inválida' };
  if (when.getTime() < Date.now() + 30 * 60 * 1000) {
    return { ok: false, error: 'La fecha debe ser al menos 30 minutos en el futuro' };
  }
  const maxPlayers = Math.max(2, Math.min(4, maxPlayersRaw));

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;
  const adm = getServiceRoleClient() as any;

  const slug = `${slugify(city)}-${when.toISOString().slice(0, 10)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await sb
    .from('open_matches')
    .insert({
      slug,
      host_id: user.id,
      city,
      venue,
      scheduled_at: when.toISOString(),
      duration_minutes: durationMinutes,
      category,
      max_players: maxPlayers,
      current_players: 1,
      message,
      status: 'open',
    })
    .select('id, slug')
    .single();

  if (error || !data) {
    return {
      ok: false,
      error: translateDbError(error?.message ?? 'Error creando partido'),
    };
  }

  await adm.from('open_match_participants').insert({
    open_match_id: data.id,
    profile_id: user.id,
  });

  revalidatePath('/app/matches');
  return { ok: true, redirectTo: '/app/matches' };
}

export async function joinOpenMatch(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const matchId = String(formData.get('match_id') ?? '');
  if (!matchId) return { ok: false, error: 'Partido inválido' };

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;
  const adm = getServiceRoleClient() as any;

  const { data: m } = await sb
    .from('open_matches')
    .select('id, host_id, current_players, max_players, status')
    .eq('id', matchId)
    .maybeSingle();

  if (!m) return { ok: false, error: 'El partido ya no existe' };
  if (m.status !== 'open') return { ok: false, error: 'Este partido ya no acepta jugadores' };
  if (m.current_players >= m.max_players) {
    return { ok: false, error: 'El partido ya está lleno' };
  }

  const { error: pErr } = await sb.from('open_match_participants').insert({
    open_match_id: matchId,
    profile_id: user.id,
  });
  if (pErr) {
    if (String(pErr.message).includes('duplicate')) {
      return { ok: false, error: 'Ya estás dentro de este partido' };
    }
    return { ok: false, error: translateDbError(pErr.message) };
  }

  const newCount = m.current_players + 1;
  const newStatus = newCount >= m.max_players ? 'full' : 'open';
  await adm
    .from('open_matches')
    .update({ current_players: newCount, status: newStatus })
    .eq('id', matchId);

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single();
  const myName = (profile as { display_name: string } | null)?.display_name ?? 'Un jugador';
  await createNotifications([
    {
      profileId: m.host_id,
      type: 'announcement',
      title: `${myName} se unió a tu partido`,
      body: newStatus === 'full' ? '¡Cancha completa!' : `${newCount}/${m.max_players} jugadores`,
      link: '/app/matches',
    },
  ]);

  revalidatePath('/app/matches');
  return { ok: true };
}

export async function leaveOpenMatch(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const matchId = String(formData.get('match_id') ?? '');
  if (!matchId) return { ok: false, error: 'Partido inválido' };

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;
  const adm = getServiceRoleClient() as any;

  const { data: m } = await sb
    .from('open_matches')
    .select('id, host_id, current_players, max_players')
    .eq('id', matchId)
    .maybeSingle();

  if (!m) return { ok: false, error: 'El partido ya no existe' };
  if (m.host_id === user.id) {
    return { ok: false, error: 'El host no puede salirse. Cancela el partido si quieres.' };
  }

  const { error: pErr } = await sb
    .from('open_match_participants')
    .delete()
    .eq('open_match_id', matchId)
    .eq('profile_id', user.id);
  if (pErr) return { ok: false, error: translateDbError(pErr.message) };

  const newCount = Math.max(1, m.current_players - 1);
  await adm
    .from('open_matches')
    .update({ current_players: newCount, status: 'open' })
    .eq('id', matchId);

  revalidatePath('/app/matches');
  return { ok: true };
}

export async function cancelOpenMatch(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const matchId = String(formData.get('match_id') ?? '');
  if (!matchId) return { ok: false, error: 'Partido inválido' };

  const supabase = await getSupabaseServerClient();
  const sb = supabase as any;

  const { error } = await sb
    .from('open_matches')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('id', matchId);

  if (error) return { ok: false, error: translateDbError(error.message) };

  revalidatePath('/app/matches');
  return { ok: true };
}
