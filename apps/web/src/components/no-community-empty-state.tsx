import Link from 'next/link';
import { ArrowRight, KeyRound, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { JoinWithCodeModal } from '@/components/join-with-code-modal';
import { OpenTournamentsRail, type OpenTournament } from '@/components/open-tournaments-rail';

/**
 * Home de quien no pertenece a ninguna comunidad — o sea, casi todo el que
 * acaba de registrarse.
 *
 * La comunidad no es un requisito para competir: los torneos abiertos aceptan
 * a cualquiera. Antes esta pantalla abria con "Aún no estás en ninguna
 * comunidad" y un boton que te sacaba de la app hacia /tournaments. Ahora el
 * primer torneo ES la pantalla: los abiertos reales, con cupos, a un toque de
 * inscribirse. Armar grupo (codigo / crear comunidad) queda como segundo paso.
 */
export function NoCommunityEmptyState({
  name,
  tournaments,
}: {
  name: string | null;
  tournaments: OpenTournament[];
}) {
  const firstName = name?.trim().split(/\s+/)[0];
  const withSpots = tournaments.filter((t) => t.taken < t.max_teams);

  return (
    <div className="-mx-6 space-y-10">
      <div className="px-6">
        <p className="text-crown font-mono text-xs uppercase tracking-widest">
          {firstName ? `Hola, ${firstName}` : 'Bienvenido'}
        </p>
        <h1 className="font-display mt-2 text-balance text-4xl leading-[0.95] tracking-tight md:text-5xl">
          TU PRIMER TORNEO <span className="text-crown">TE ESPERA.</span>
        </h1>
        <p className="text-muted-foreground mt-3 max-w-lg text-sm">
          No necesitas equipo ni comunidad: elige uno, inscríbete con tu pareja y empieza a sumar
          puntos al ranking.
        </p>
      </div>

      {withSpots.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between px-6">
            <h2 className="text-muted-foreground flex items-center gap-2 text-xs uppercase tracking-widest">
              <span className="bg-live size-1.5 animate-pulse rounded-full" />
              Abiertos ahora
            </h2>
            <Link
              href="/app/tournaments"
              className="text-muted-foreground hover:text-foreground flex min-h-11 items-center gap-1 text-xs uppercase tracking-widest"
            >
              Ver todos
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <OpenTournamentsRail tournaments={withSpots} />
        </section>
      ) : (
        <div className="px-6">
          <Card className="p-6 text-sm">
            <p className="font-display text-lg tracking-tight">NO HAY TORNEOS ABIERTOS HOY</p>
            <p className="text-muted-foreground mt-1">
              Arma tu grupo y organiza uno: con una comunidad creas torneos en un minuto.
            </p>
          </Card>
        </div>
      )}

      <section className="px-6">
        <Card className="p-5">
          <h2 className="font-display text-lg tracking-tight">¿JUEGAS SIEMPRE CON LOS MISMOS?</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Únete a la comunidad de tu club o crea la tuya: ranking propio y torneos internos.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
            className="text-muted-foreground hover:text-foreground mt-3 inline-flex min-h-11 items-center text-xs uppercase tracking-widest underline-offset-4 hover:underline"
          >
            Explorar comunidades
          </Link>
        </Card>
      </section>
    </div>
  );
}
