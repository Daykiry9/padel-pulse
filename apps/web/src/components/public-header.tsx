import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BrandSwitcher } from '@/components/brand-switcher';
import { CommandPalette } from '@/components/command-palette';
import { KingLogo } from '@/components/marketing/king-logo';
import { getBrandFromCookie } from '@/lib/brand';
import { isNativeApp } from '@/lib/native';
import { getSession } from '@/lib/supabase/server';

/**
 * Header para páginas públicas. Detecta auth state + brand cookie y
 * muestra el switcher Kings/Queens. Se oculta en la app nativa (que usa
 * su propio shell con bottom nav).
 */
export async function PublicHeader({
  brand,
}: {
  /** Override del brand cookie (ej. queens page force-Queens). */
  brand?: 'kings' | 'queens';
}) {
  if (await isNativeApp()) return null;

  const user = await getSession();
  const cookieBrand = await getBrandFromCookie();
  const effectiveBrand = brand ?? cookieBrand;
  const accentColor = effectiveBrand === 'queens' ? 'text-magenta-500' : 'text-gold-400';
  const accentLabel = effectiveBrand === 'queens' ? 'QUEENS' : 'KING';

  return (
    <header className="border-border/40 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
      {/* Medido en un iPhone de 375px: esta fila pedia 480px (136 el grupo del
          logo + 280 el del switcher y "Unete" + 48 de padding + 16 de gap), asi
          que la pagina entera scrolleaba de lado 81px y el boton "Unete"
          quedaba en left:385 — fuera de la pantalla. Al deslizar, el contenido
          se iba horizontalmente y los botones desaparecian.
          Por eso el wordmark se oculta bajo sm (el logo ya identifica la marca)
          y el grupo izquierdo lleva min-w-0 + truncate: aunque el contenido
          crezca, cede el texto en vez de desbordar la pagina. */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2">
            <KingLogo />
            <span className="font-display hidden truncate text-base tracking-tight sm:inline">
              PADEL<span className={accentColor}>{accentLabel}</span>
            </span>
          </Link>
          <div className="hidden md:block">
            <BrandSwitcher current={effectiveBrand} />
          </div>
        </div>

        <nav
          aria-label="Navegación principal"
          className="text-muted-foreground hidden items-center gap-6 text-xs uppercase tracking-[0.15em] md:flex"
        >
          <Link href="/tournaments" className="hover:text-foreground transition-colors">
            Torneos
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden md:block">
            <CommandPalette />
          </div>
          <div className="md:hidden">
            <BrandSwitcher current={effectiveBrand} />
          </div>
          {user ? (
            <Button variant="crown" size="sm" asChild>
              <Link href="/app">
                <LayoutDashboard className="size-3" />
                Mi panel
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button variant="crown" size="sm" asChild>
                <Link href="/signup">Únete</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
