import Link from 'next/link';
import { LayoutDashboard } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { KingLogo } from '@/components/marketing/king-logo';
import { getSession } from '@/lib/supabase/server';

/**
 * Header para páginas públicas marketing (/, /tournaments, /rankings, /queens, etc.).
 * Detecta si el user está autenticado y muestra "Ir a mi panel" en vez de
 * "Ingresar / Únete" — evita que se sienta como un deslogueo al navegar.
 */
export async function PublicHeader({
  brand = 'kings',
}: {
  brand?: 'kings' | 'queens';
}) {
  const user = await getSession();
  const Logo = brand === 'queens' ? KingLogo : KingLogo; // mismo placeholder por ahora

  return (
    <header className="border-border/40 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className={brand === 'queens' ? 'text-queens' : 'text-crown'}>
              {brand === 'queens' ? 'QUEENS' : 'KING'}
            </span>
          </span>
        </Link>
        <div className="flex gap-2">
          {user ? (
            <Button variant="crown" size="sm" asChild>
              <Link href="/app">
                <LayoutDashboard className="size-3" />
                Mi panel
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
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
