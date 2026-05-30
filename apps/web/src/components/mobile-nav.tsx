'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { Crown, Globe, Home, Shield, Trophy } from 'lucide-react';

const BASE_ITEMS = [
  { href: '/app', icon: Home, label: 'Inicio' },
  { href: '/tournaments', icon: Trophy, label: 'Torneos' },
  { href: '/app/communities', icon: Globe, label: 'Parches' },
  { href: '/rankings', icon: Crown, label: 'Ranking' },
];

const HIDE_ON = ['/login', '/signup'];

/**
 * Bottom nav de la experiencia app. Visible cuando:
 * - hay sesión, y
 * - no estamos en una pantalla de auth, y
 * - estamos en la app nativa (Capacitor) O en una ruta /app (web mobile).
 *
 * En la app nativa el nav es permanente en toda la navegación. En web
 * solo aparece dentro de /app y solo en mobile (desktop tiene header nav).
 */
export function MobileNav({
  isNative = false,
  isAuthed = false,
  isSuperAdmin = false,
}: {
  isNative?: boolean;
  isAuthed?: boolean;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();

  const hiddenRoute = HIDE_ON.some((p) => pathname.startsWith(p));
  const show = isAuthed && !hiddenRoute && (isNative || pathname.startsWith('/app'));

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

  const ITEMS = isSuperAdmin
    ? [...BASE_ITEMS, { href: '/app/admin', icon: Shield, label: 'Admin' }]
    : BASE_ITEMS;

  return (
    <nav
      className={`border-border/40 bg-background/90 fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl ${isNative ? '' : 'md:hidden'}`}
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
              className={`focus-card flex min-h-[3.25rem] flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                isActive ? 'text-crown' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className="size-5" />
              <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
