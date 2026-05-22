'use server';

import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from './supabase/server';

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

  // Caso: email confirmation enabled. Sin sesión activa, el usuario tiene que
  // confirmar antes de continuar. Mandamos a /login con flag para mostrar mensaje.
  if (!data.session) {
    return { ok: true, redirectTo: '/login?verify=1' };
  }

  return { ok: true, redirectTo: '/onboarding' };
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
  const city = String(formData.get('city') ?? '') || null;

  const { error } = await supabase
    .from('profiles')
    .update({
      skill_category: skillCategory,
      gender,
      city,
    } as never)
    .eq('id', user.id);

  if (error) return { ok: false, error: error.message };

  return { ok: true, redirectTo: '/app' };
}
