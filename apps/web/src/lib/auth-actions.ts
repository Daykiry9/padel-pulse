'use server';

import { redirect } from 'next/navigation';

import { getSupabaseServerClient } from './supabase/server';

export interface ActionResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const displayName = String(formData.get('display_name') ?? '');

  if (!email || !password || !displayName) {
    return { ok: false, error: 'Faltan campos obligatorios' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });

  if (error) return { ok: false, error: error.message };

  return { ok: true, redirectTo: '/onboarding' };
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/app');

  if (!email || !password) {
    return { ok: false, error: 'Email y contraseña son obligatorios' };
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { ok: false, error: 'Credenciales inválidas' };

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
