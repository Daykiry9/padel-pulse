'use server';

import { redirect } from 'next/navigation';

import { translateDbError } from './error-translate';
import { getSupabaseServerClient } from './supabase/server';
import { getServiceRoleClient } from './supabase/admin';

export interface ActionResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

function translateSupabaseAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('already registered') || m.includes('user already exists')) {
    return 'Ese email ya tiene cuenta. Ingresa o usa otro.';
  }
  if (m.includes('email not confirmed')) {
    return 'Tu email aún no está confirmado. Revisa tu bandeja de entrada.';
  }
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return 'Email o contraseña incorrectos.';
  }
  if (m.includes('weak password') || m.includes('password should be')) {
    return 'Contraseña muy débil. Mezcla letras, números y al menos 8 caracteres.';
  }
  if (m.includes('rate limit') || m.includes('too many requests')) {
    return 'Demasiados intentos. Espera un minuto e intenta de nuevo.';
  }
  if (m.includes('signup is disabled')) {
    return 'Registro temporalmente deshabilitado. Vuelve pronto.';
  }
  return 'No pudimos completar la operación. Intenta de nuevo.';
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('display_name') ?? '').trim();

  if (!email || !password || !displayName) {
    return { ok: false, error: 'Faltan campos obligatorios' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'Email inválido' };
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) return { ok: false, error: translateSupabaseAuthError(error.message) };

  const invite = String(formData.get('invite') ?? '').trim();

  // Caso: email confirmation enabled. Sin sesión activa, el usuario tiene que
  // confirmar antes de continuar. Mandamos a /login con flag para mostrar mensaje.
  if (!data.session) {
    const next = invite ? `&next=/i/${invite}` : '';
    return { ok: true, redirectTo: `/login?verify=1${next}` };
  }

  // Si vino con invite, pasarlo a onboarding para que la siguiente redirect lo aplique
  return { ok: true, redirectTo: invite ? `/onboarding?invite=${invite}` : '/onboarding' };
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/app');

  if (!email || !password) {
    return { ok: false, error: 'Email y contraseña son obligatorios' };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: translateSupabaseAuthError(error.message) };

  return { ok: true, redirectTo: next };
}

export async function signOut() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const skillCategory = String(formData.get('skill_category') ?? '');
  const gender = String(formData.get('gender') ?? '') || null;
  const city = String(formData.get('city') ?? '').trim() || null;
  const displayName = String(formData.get('display_name') ?? '').trim() || null;

  // Datos del jugador (ahora obligatorios para el onboarding completo)
  const phone = String(formData.get('phone') ?? '').trim() || null;
  const birthdate = String(formData.get('birthdate') ?? '').trim() || null;
  const instagramHandle =
    String(formData.get('instagram_handle') ?? '').trim().replace(/^@/, '') || null;
  const dominantHand = String(formData.get('dominant_hand') ?? '') || null;
  const favoritePosition = String(formData.get('favorite_position') ?? '') || null;
  const playingSinceRaw = String(formData.get('playing_since_year') ?? '').trim();
  const playingSinceYear = playingSinceRaw ? Number(playingSinceRaw) : null;
  const marketingOptIn = formData.get('marketing_opt_in') === 'true';

  // Validación: si vienen del onboarding (display_name presente), exigimos todos
  // los campos del perfil. Si vienen del /app/profile editando solo unos campos,
  // permitimos partial update.
  const isFullOnboarding = Boolean(displayName);
  if (isFullOnboarding) {
    if (!skillCategory) {
      return {
        ok: false,
        error: 'Elige tu categoría: completa el quiz o usa "Prefiero elegir manualmente".',
      };
    }
    if (!phone) return { ok: false, error: 'Teléfono obligatorio' };
    if (!birthdate) return { ok: false, error: 'Fecha de nacimiento obligatoria' };
    if (!instagramHandle) return { ok: false, error: 'Instagram obligatorio' };
    if (!dominantHand) return { ok: false, error: 'Selecciona tu mano dominante' };
    if (!favoritePosition) return { ok: false, error: 'Selecciona tu posición preferida' };
    if (!playingSinceYear || Number.isNaN(playingSinceYear)) {
      return { ok: false, error: 'Indica desde qué año juegas pádel' };
    }
  }

  // Validaciones de formato (mismos límites que los CHECK de la DB, pero con
  // mensaje claro de QUÉ corregir en vez del genérico "reglas del torneo").
  if (phone && !/^[+0-9 ()-]{7,20}$/.test(phone)) {
    return {
      ok: false,
      error: 'Teléfono inválido: 7 a 20 caracteres, solo números, espacios y + ( ) - (ej: +57 300 123 4567).',
    };
  }
  if (instagramHandle && !/^[A-Za-z0-9._]{1,30}$/.test(instagramHandle)) {
    return {
      ok: false,
      error: 'Instagram inválido: solo letras, números, punto y guion bajo, sin @ ni espacios (ej: juanesp_padel).',
    };
  }
  const currentYear = new Date().getFullYear();
  if (playingSinceYear != null && (playingSinceYear < 1990 || playingSinceYear > currentYear)) {
    return { ok: false, error: `El año desde que juegas debe estar entre 1990 y ${currentYear}.` };
  }
  if (birthdate) {
    const bd = new Date(birthdate);
    const maxBirth = new Date();
    maxBirth.setFullYear(maxBirth.getFullYear() - 5);
    if (Number.isNaN(bd.getTime()) || bd < new Date('1920-01-02') || bd > maxBirth) {
      return {
        ok: false,
        error: 'Fecha de nacimiento inválida: revisá el año (debés tener al menos 5 años y haber nacido después de 1920).',
      };
    }
  }

  const updates: Record<string, unknown> = {
    skill_category: skillCategory,
    gender,
    city,
    marketing_opt_in: marketingOptIn,
  };
  if (displayName) updates.display_name = displayName;
  if (phone) updates.phone = phone;
  if (birthdate) updates.birthdate = birthdate;
  if (instagramHandle) updates.instagram_handle = instagramHandle;
  if (dominantHand) updates.dominant_hand = dominantHand;
  if (favoritePosition) updates.favorite_position = favoritePosition;
  if (playingSinceYear && !Number.isNaN(playingSinceYear)) {
    updates.playing_since_year = playingSinceYear;
  }

  // Auth ya validada arriba (getUser). Escribimos con service role: un UPDATE
  // con contexto de usuario sobre profiles estaba afectando 0 filas en silencio
  // (sin error), dejando el perfil sin skill_category y rompiendo el onboarding
  // en loop. Solo tocamos la fila del propio usuario (eq id). El .select()
  // confirma que efectivamente se escribió: si vuelve vacío, devolvemos error
  // en vez de "éxito" silencioso.
  const admin = getServiceRoleClient();
  const { data: updated, error } = await admin
    .from('profiles')
    .update(updates as never)
    .eq('id', user.id)
    .select('id');

  if (error) {
    console.error('[updateProfile] supabase error:', error);
    return { ok: false, error: translateDbError(error.message) };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, error: 'No encontramos tu perfil. Recargá la página e intentá de nuevo.' };
  }

  // Si vienen del flujo de invitación, redirigir a resolverlo en vez de /app
  const nextInvite = String(formData.get('next_invite') ?? '').trim();
  if (nextInvite) {
    return { ok: true, redirectTo: `/i/${nextInvite}` };
  }

  return { ok: true, redirectTo: '/app' };
}
