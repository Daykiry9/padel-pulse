import { NextResponse, type NextRequest } from 'next/server';

import { getServiceRoleClient } from '@/lib/supabase/admin';
import { getSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Callback OAuth (Apple / Google). Recibe `?code=...&next=...`, intercambia el
 * code por una sesión Supabase y redirige al destino interno.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const oauthError =
    url.searchParams.get('error') ?? url.searchParams.get('error_description');
  const nextRaw = url.searchParams.get('next') ?? '/app';
  // Solo rutas internas (defensa contra open-redirect: rechaza externas,
  // protocol-relative `//evil.com` y vuelta a páginas de auth).
  const next =
    nextRaw.startsWith('/') &&
    !nextRaw.startsWith('//') &&
    !nextRaw.startsWith('/login') &&
    !nextRaw.startsWith('/signup')
      ? nextRaw
      : '/app';

  if (oauthError) {
    return NextResponse.redirect(
      `${url.origin}/login?oauth_error=${encodeURIComponent(oauthError)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?oauth_error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${url.origin}/login?oauth_error=${encodeURIComponent(error.message)}`,
    );
  }

  // Aseguramos que exista la fila en profiles. Sin ella el user de Google/Apple
  // que va directo a un torneo no puede inscribirse (y la UI lo deja sin botón).
  // Usamos upsert + chequeo de error: si falla, /app/profile.tsx hace self-heal
  // creando la fila en el primer render, así nunca queda cuenta huérfana.
  const sessUser = sessionData.user;
  if (sessUser) {
    const admin = getServiceRoleClient();
    const meta = sessUser.user_metadata as Record<string, unknown> | undefined;
    const displayName =
      (meta?.full_name as string | undefined) ??
      (meta?.name as string | undefined) ??
      (meta?.display_name as string | undefined) ??
      sessUser.email?.split('@')[0] ??
      'Jugador';
    const { error: upsertErr } = await admin
      .from('profiles')
      .upsert(
        { id: sessUser.id, display_name: displayName } as never,
        { onConflict: 'id', ignoreDuplicates: true },
      );
    if (upsertErr) {
      console.error('[auth/callback] profile upsert failed:', upsertErr);
    }
  }

  return NextResponse.redirect(`${url.origin}${next}`);
}
