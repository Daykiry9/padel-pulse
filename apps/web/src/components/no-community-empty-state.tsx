import Link from 'next/link';
import { Crown, KeyRound, Plus, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { JoinWithCodeModal } from '@/components/join-with-code-modal';

/**
 * Empty state full-screen del HUB cuando el usuario no pertenece a ninguna
 * comunidad.
 *
 * Las dos acciones originales eran "unirme con código" y "crear mi comunidad",
 * y la copia decía que PadelKing "arranca con tu comunidad". Las dos cosas
 * dejaban sin salida a quien acaba de registrarse: no tiene código, no quiere
 * fundar nada, y las comunidades del listado son cerradas (piden aprobación de
 * un admin). Una tester quedó atrapada justo ahí.
 *
 * La comunidad no es un requisito para competir — los torneos abiertos aceptan
 * a cualquiera. Así que la acción primaria ahora es verlos, que es lo único que
 * funciona sin depender de terceros.
 */
export function NoCommunityEmptyState() {
  return (
    <div className="relative flex min-h-[calc(100dvh-12rem)] items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="bg-crown/[0.05] pointer-events-none absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />

      <div className="relative z-10 flex max-w-md flex-col items-center text-center">
        <div className="border-crown/30 bg-card relative mb-6 flex size-24 items-center justify-center rounded-2xl border shadow-[0_8px_30px_-12px_rgba(255,197,61,0.45)]">
          <Crown className="text-crown size-12" strokeWidth={1.5} />
        </div>

        <h1 className="font-display text-3xl tracking-tight md:text-4xl">
          Aún no estás en ninguna comunidad
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          No necesitas una para jugar: los torneos abiertos de tu ciudad
          aceptan a cualquiera. Las comunidades son para armar tu propio grupo
          y organizarle torneos.
        </p>

        <Button variant="crown" size="lg" asChild className="mt-8 w-full">
          <Link href="/tournaments">
            <Trophy className="size-4" />
            Ver torneos abiertos
          </Link>
        </Button>

        <div className="mt-3 grid w-full gap-3 sm:grid-cols-2">
          <JoinWithCodeModal
            trigger={
              <Button variant="outline" size="lg" className="w-full">
                <KeyRound className="size-4" />
                Unirme con código
              </Button>
            }
          />
          <Button variant="outline" size="lg" asChild className="w-full">
            <Link href="/app/communities/new">
              <Plus className="size-4" />
              Crear mi comunidad
            </Link>
          </Button>
        </div>

        <Link
          href="/app/communities?tab=discover"
          className="text-muted-foreground hover:text-foreground mt-6 text-xs uppercase tracking-widest underline-offset-4 hover:underline"
        >
          Explorar comunidades
        </Link>
      </div>
    </div>
  );
}
