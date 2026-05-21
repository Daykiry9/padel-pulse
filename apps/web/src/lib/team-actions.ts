'use server';

import { revalidatePath } from 'next/cache';

import { computeTeamCategory, sumOfPair } from '@padelking/domain';
import type { TeamCategory, Gender } from '@padelking/domain';

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

export async function createTeam(formData: FormData): Promise<ActionResult> {
  const user = await getSession();
  if (!user) return { ok: false, error: 'No autenticado' };

  const name = String(formData.get('name') ?? '').trim();
  const partnerEmail = String(formData.get('partner_email') ?? '').trim();
  const communityId = String(formData.get('community_id') ?? '').trim();

  if (name.length < 3) return { ok: false, error: 'El nombre debe tener al menos 3 caracteres' };
  if (!partnerEmail) return { ok: false, error: 'Debes invitar a un compañero' };
  if (!communityId) return { ok: false, error: 'Selecciona una comunidad' };

  const supabase = await getSupabaseServerClient();

  type ProfileLookup = { id: string; display_name: string; skill_category: TeamCategory | null; gender: Gender | null };

  // Encontrar partner por nombre (MVP shortcut — luego por email vía auth.users)
  const partnerRes = await supabase
    .from('profiles')
    .select('id, display_name, skill_category, gender')
    .eq('display_name', partnerEmail)
    .maybeSingle();
  const partnerLookup = partnerRes.data as ProfileLookup | null;

  let partnerId = partnerLookup?.id;
  let partnerCategory = partnerLookup?.skill_category;
  let partnerGender = partnerLookup?.gender;

  if (!partnerId) {
    const directId = String(formData.get('partner_id') ?? '');
    if (directId) {
      const byIdRes = await supabase
        .from('profiles')
        .select('id, skill_category, gender')
        .eq('id', directId)
        .maybeSingle();
      const byId = byIdRes.data as { id: string; skill_category: TeamCategory | null; gender: Gender | null } | null;
      if (byId) {
        partnerId = byId.id;
        partnerCategory = byId.skill_category;
        partnerGender = byId.gender;
      }
    }
  }

  if (!partnerId) {
    return {
      ok: false,
      error: 'Compañero no encontrado. Pídele que se registre y use su nombre exacto.',
    };
  }
  if (partnerId === user.id) return { ok: false, error: 'No puedes ser tu propio compañero' };

  const meRes = await supabase
    .from('profiles')
    .select('skill_category, gender')
    .eq('id', user.id)
    .single();
  const me = meRes.data as { skill_category: TeamCategory | null; gender: Gender | null } | null;

  if (!me?.skill_category || !partnerCategory) {
    return { ok: false, error: 'Ambos jugadores deben tener categoría asignada' };
  }

  const teamCategory = computeTeamCategory(
    { skillCategory: me.skill_category, gender: me.gender },
    { skillCategory: partnerCategory, gender: partnerGender },
  );
  const teamSum = sumOfPair(me.skill_category, partnerCategory);

  const baseSlug = slugify(name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

  const teamInsert = await supabase
    .from('teams')
    .insert({
      slug,
      name,
      primary_community_id: communityId,
      category: teamCategory,
    } as never)
    .select('id, slug')
    .single();

  const team = teamInsert.data as { id: string; slug: string } | null;
  const teamErr = teamInsert.error;

  if (teamErr || !team) return { ok: false, error: teamErr?.message ?? 'Error creando equipo' };

  // Insertar miembros activos
  const { error: memberErr } = await supabase.from('team_members').insert([
    { team_id: team.id, profile_id: user.id, invited_by: user.id },
    { team_id: team.id, profile_id: partnerId, invited_by: user.id },
  ] as never);

  if (memberErr) return { ok: false, error: `Equipo creado pero error al añadir miembros: ${memberErr.message}` };

  revalidatePath('/app');
  return { ok: true, redirectTo: `/app/teams/${team.slug}?sum=${teamSum}` };
}
