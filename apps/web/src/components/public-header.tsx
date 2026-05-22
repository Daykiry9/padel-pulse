import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BrandSwitcher } from '@/components/brand-switcher';
import { KingLogo } from '@/components/marketing/king-logo';
import { getBrandFromCookie } from '@/lib/brand';
import { getSession } from '@/lib/supabase/server';

/**
 * Header para páginas públicas. Detecta auth state + brand cookie y
 * muestra el switcher Kings/Queens.
 */
export async function PublicHeader({
  brand,
}: {
  /** Override del brand cookie (ej. queens page force-Queens). */
  brand?: 'kings' | 'queens';
}) {
  const user = await getSession();
  const cookieBrand = await getBrandFromCookie();
  const effectiveBrand = brand ?? cookieBrand;
  const accentColor = effectiveBrand === 'queens' ? 'text-magenta-500' : 'text-gold-400';
  const accentLabel = effectiveBrand === 'queens' ? 'QUEENS' : 'KING';

  return (
    <header className="border-border/40 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <KingLogo />
            <span className="font-display text-base tracking-tight">
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
          <Link href="/rankings" className="hover:text-foreground transition-colors">
            Ranking
          </Link>
        </nav>

        <div className="flex items-center gap-2">
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
