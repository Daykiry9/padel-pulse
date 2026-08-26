import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

import type { Database } from '@padelking/supabase';

const PROTECTED_PREFIXES = ['/app'];
const AUTH_PAGES = ['/login', '/signup'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: CookieOptions }[]) => {
          for (const { name, value } of toSet) {
            request.cookies.set({ name, value });
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) {
            response.cookies.set({ name, value, ...(options ?? {}) });
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PAGES.some((p) => path.startsWith(p));
  const isNative = (request.headers.get('user-agent') ?? '').includes('PadelKingApp');

  // App nativa: no mostramos la landing marketing, pero tampoco el muro de
  // login. Entrar a /tournaments, que es publico: quien abre la app por primera
  // vez ve torneos y brackets reales antes de que se le pida una cuenta.
  // Antes esto apuntaba a /app, y como /app esta protegido la primera pantalla
  // de la app era siempre /login, sin contexto ni forma de mirar nada.
  if (isNative && path === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/tournaments';
    return NextResponse.redirect(url);
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', path);
    return NextResponse.redirect(url);
  }

  if (isAuthPage && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/app';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
