'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CircleUser, Home, LogIn, Trophy, Users } from 'lucide-react';

const BASE_ITEMS = [
  { href: '/app', icon: Home, label: 'Inicio' },
  { href: '/app/communities', icon: Users, label: 'Comunidades' },
  { href: '/app/tournaments', icon: Trophy, label: 'Torneos' },
  { href: '/app/profile', icon: CircleUser, label: 'Perfil' },
];

// En la app nativa no hay header (lo oculta PublicHeader), asi que sin sesion
// este nav es la UNICA navegacion. Antes solo existia con sesion: quien
// instalaba la app de cero caia en /tournaments sin header, sin barra abajo
// y sin forma de llegar al login. Asi lo vio un tester nuevo de iPhone.
const GUEST_ITEMS = [
  { href: '/tournaments', icon: Trophy, label: 'Torneos' },
  { href: '/login', icon: LogIn, label: 'Ingresar' },
];

const HIDE_ON = ['/login', '/signup'];

/**
 * Bottom nav de la experiencia app.
 *
 * App nativa (Capacitor): siempre visible. Con sesion muestra las cuatro
 * secciones (salvo en login/signup); sin sesion, Torneos + Ingresar.
 * Web: solo con sesion, dentro de /app y en mobile (desktop tiene header).
 */
export function MobileNav({
  isNative = false,
  isAuthed = false,
}: {
  isNative?: boolean;
  isAuthed?: boolean;
}) {
  const pathname = usePathname();

  const hiddenRoute = HIDE_ON.some((p) => pathname.startsWith(p));
  const show = isNative
    ? isAuthed
      ? !hiddenRoute
      : true
    : isAuthed && !hiddenRoute && pathname.startsWith('/app');

  // Reserva espacio al final del body para que el nav fixed no tape contenido
  // (incluye el safe-area inferior de la barra de gestos en nativo).
  useEffect(() => {
    if (!show) return;
    document.body.style.paddingBottom = 'calc(4rem + env(safe-area-inset-bottom))';
    return () => {
      document.body.style.paddingBottom = '';
    };
  }, [show]);

  if (!show) return null;

  const ITEMS = isAuthed ? BASE_ITEMS : GUEST_ITEMS;

  return (
    <nav
      className={`border-border/40 bg-background/90 fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl ${isNative ? '' : 'md:hidden'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navegación principal"
    >
      <div
        className="mx-auto grid max-w-md"
        style={{ gridTemplateColumns: `repeat(${ITEMS.length}, minmax(0, 1fr))` }}
      >
        {ITEMS.map((item) => {
          const isActive =
            item.href === '/app'
              ? pathname === '/app'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`focus-card relative flex min-h-[3.25rem] flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-crown' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab-indicator"
                  className="bg-crown absolute left-0 right-0 top-0 h-0.5"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <item.icon className="size-5" />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
