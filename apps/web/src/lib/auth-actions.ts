'use server';

import { headers } from 'next/headers';
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

  const invite = String(formData.get('invite') ?? '').trim();
  const nextPath = invite ? `/i/${invite}` : '/app';

  // emailRedirectTo: si Supabase tiene email confirmation enabled, el link del
  // mail debe caer en /auth/callback (PKCE) en vez de /, sino el code se pierde
  // y el user nunca queda logueado tras confirmar.
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'padelking.co';
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  const emailRedirectTo = `${proto}://${host}/auth/callback?next=${encodeURIComponent(nextPath)}`;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo,
    },
  });

  if (error) return { ok: false, error: translateSupabaseAuthError(error.message) };

  // Caso: email confirmation enabled. Sin sesión activa, el usuario tiene que
  // confirmar antes de continuar. Mandamos a /login con flag para mostrar mensaje.
  if (!data.session) {
    const next = invite ? `&next=/i/${invite}` : '';
    return { ok: true, redirectTo: `/login?verify=1${next}` };
  }

  // Sin onboarding intermedio: signup → /app (o invite). El dashboard muestra
  // un banner para completar perfil si faltan datos opcionales.
  return { ok: true, redirectTo: nextPath };
}

/** Sanitiza un destino interno: rechaza URLs externas, protocol-relative y
 *  redirects de vuelta a páginas de auth (loop visual / open redirect). */
function sanitizeNext(raw: string): string {
  if (!raw.startsWith('/')) return '/app'; // No externa.
  if (raw.startsWith('//')) return '/app'; // protocol-relative → externo disfrazado.
  if (raw.startsWith('/login') || raw.startsWith('/signup')) return '/app';
  return raw;
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = sanitizeNext(String(formData.get('next') ?? '/app'));

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

/**
 * Pide a Supabase que envíe un email con link de reset. Por seguridad
 * (anti-enumeración) NO revelamos si el email existe o no — siempre devolvemos
 * éxito y redirigimos a la pantalla de "revisá tu correo".
 */
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return { ok: false, error: 'Ingresá un email válido' };
  }
  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'padelking.co';
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  const redirectTo = `${proto}://${host}/auth/callback?next=/reset-password`;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) console.error('[requestPasswordReset] supabase error:', error);
  // Siempre redirigimos a "?sent=1" sin importar si el email existió.
  return { ok: true, redirectTo: '/forgot-password?sent=1' };
}

/**
 * Cambia la contraseña del usuario actualmente autenticado. Se usa después de
 * que el link de reset cae en /auth/callback → ya hay sesión.
 */
export async function updatePassword(formData: FormData): Promise<ActionResult> {
  const password = String(formData.get('password') ?? '');
  if (password.length < 8) {
    return { ok: false, error: 'La contraseña debe tener al menos 8 caracteres' };
  }
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: 'Link de reset inválido o expirado. Pedí uno nuevo.' };
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: translateSupabaseAuthError(error.message) };
  return { ok: true, redirectTo: '/app' };
}

/**
 * Elimina la cuenta del usuario actual: borra el registro de auth.users via
 * service role (cascadea a profiles + datos personales) y cierra la sesión.
 * Requisito de App Store: la baja debe poder hacerse desde dentro de la app.
 * Exige confirmación tipeada ("ELIMINAR") como guard adicional.
 */
export async function deleteMyAccount(formData: FormData): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const confirmation = String(formData.get('confirmation') ?? '').trim();
  if (confirmation !== 'ELIMINAR') {
    redirect('/app/profile?delete_error=confirmation');
  }

  const admin = getServiceRoleClient();
  const adminAuth = (admin as unknown as { auth: { admin: { deleteUser: (id: string) => Promise<{ error: { message: string } | null }> } } }).auth.admin;
  const { error } = await adminAuth.deleteUser(user.id);
  if (error) {
    console.error('[deleteMyAccount] supabase error:', error);
    redirect('/app/profile?delete_error=server');
  }

  await supabase.auth.signOut();
  redirect('/?account_deleted=1');
}

/**
 * Inicia el flujo OAuth con Apple o Google. Lee `provider` y `next` del form,
 * pide a Supabase la URL del proveedor (con redirectTo a /auth/callback) y
 * redirige al usuario allá. La sesión se establece en el callback.
 */
export async function signInWithOAuthProvider(formData: FormData): Promise<void> {
  const provider = String(formData.get('provider') ?? '');
  if (provider !== 'apple' && provider !== 'google') {
    redirect('/login?oauth_error=invalid_provider');
  }

  const hdrs = await headers();
  const host = hdrs.get('host') ?? 'padelking.co';
  const proto = hdrs.get('x-forwarded-proto') ?? 'https';
  const origin = `${proto}://${host}`;
  const nextRaw = String(formData.get('next') ?? '/app');
  const next = nextRaw.startsWith('/') ? nextRaw : '/app';
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: provider as 'apple' | 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) {
    redirect(`/login?oauth_error=${encodeURIComponent(error?.message ?? 'oauth_failed')}`);
  }
  redirect(data.url);
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
  // Normalizamos phone: WhatsApp/iOS/Android meten NBSP (U+00A0), guiones
  // tipográficos (– — ‒ ― U+2010-U+2015) y otros caracteres Unicode invisibles
  // que rompen el regex sin que el user note la diferencia visualmente.
  const phoneRaw = String(formData.get('phone') ?? '');
  const phone =
    phoneRaw
      .replace(/[‐-―−]/g, '-') // guiones tipográficos → '-'
      .replace(/ /g, ' ') // NBSP → espacio normal
      .replace(/\s+/g, ' ')
      .trim() || null;
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
  // Todos los campos del onboarding son OPCIONALES (nombre + email son lo único
  // que la app necesita para funcionar; el resto se puede llenar después en el
  // perfil). Solo validamos formato si vienen con valor.

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
    skill_category: skillCategory || null,
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
    console.error('[updateProfile] update affected 0 rows for user', user.id, {
      updates,
    });
    return { ok: false, error: 'No encontramos tu perfil. Recargá la página e intentá de nuevo.' };
  }

  // Si vienen del flujo de invitación, redirigir a resolverlo en vez de /app
  const nextInvite = String(formData.get('next_invite') ?? '').trim();
  if (nextInvite) {
    return { ok: true, redirectTo: `/i/${nextInvite}` };
  }

  // Después de guardar: quedarse en /app/profile con flag de éxito para que el
  // user vea visualmente que se guardó. Antes redirigía a /app y Gabriel pensaba
  // "nada cambió, no me dejó".
  return { ok: true, redirectTo: '/app/profile?saved=1' };
}
