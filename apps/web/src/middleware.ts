import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

import type { Database } from '@padelking/supabase';

const PROTECTED_PREFIXES = ['/app'];
const AUTH_PAGES = ['/login', '/signup'];
// En la app nativa el login es obligatorio: sin sesion solo se puede entrar a
// estas rutas (auth, callback de OAuth, legales y el borrado de cuenta).
const NATIVE_PUBLIC = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/api',
  '/privacy',
  '/terms',
  '/eliminar-cuenta',
];

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

  // App nativa: login obligatorio. Antes se podia navegar sin sesion, pero la
  // app nativa no tiene header y la barra inferior es la de la cuenta, asi que
  // un usuario sin sesion quedaba en /tournaments sin navegacion ni forma de
  // ingresar. Con sesion, '/' entra directo al panel.
  if (isNative) {
    if (path === '/') {
      const url = request.nextUrl.clone();
      url.pathname = user ? '/app' : '/login';
      return NextResponse.redirect(url);
    }
    if (!user && !NATIVE_PUBLIC.some((p) => path.startsWith(p))) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', path);
      return NextResponse.redirect(url);
    }
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
