'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown, Globe, Home, Shield, Trophy, Users } from 'lucide-react';

const BASE_ITEMS = [
  { href: '/app', icon: Home, label: 'Inicio' },
  { href: '/tournaments', icon: Trophy, label: 'Torneos' },
  { href: '/app/matches', icon: Users, label: 'Partidos' },
  { href: '/app/communities', icon: Globe, label: 'Parches' },
  { href: '/rankings', icon: Crown, label: 'Ranking' },
];

export function MobileNav({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const pathname = usePathname();
  const ITEMS = isSuperAdmin
    ? [...BASE_ITEMS, { href: '/app/admin', icon: Shield, label: 'Admin' }]
    : BASE_ITEMS;

  return (
    <nav
      className="border-border/40 bg-background/90 fixed bottom-0 left-0 right-0 z-30 border-t backdrop-blur-xl md:hidden"
      aria-label="Navegación principal"
    >
      <div className={`mx-auto grid max-w-md ${isSuperAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
        {ITEMS.map((item) => {
          const isActive =
            item.href === '/app'
              ? pathname === '/app'
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
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
