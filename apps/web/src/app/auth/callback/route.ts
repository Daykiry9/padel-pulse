import { NextResponse, type NextRequest } from 'next/server';

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
  // Solo permitimos rutas internas (defensa contra open-redirect).
  const next = nextRaw.startsWith('/') ? nextRaw : '/app';

  if (oauthError) {
    return NextResponse.redirect(
      `${url.origin}/login?oauth_error=${encodeURIComponent(oauthError)}`,
    );
  }
  if (!code) {
    return NextResponse.redirect(`${url.origin}/login?oauth_error=missing_code`);
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${url.origin}/login?oauth_error=${encodeURIComponent(error.message)}`,
    );
  }
  return NextResponse.redirect(`${url.origin}${next}`);
}
