import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/ui/countdown';
import { KingLogo } from '@/components/marketing/king-logo';
import { LevelFinder, type LevelFinderTournament } from '@/components/marketing/level-finder';
import { getOpenTournaments, OpenTournamentsRail, type OpenTournament } from '@/components/open-tournaments-rail';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function HomePage() {
  const user = await getSession();
  if (user) {
    redirect('/app');
  }

  // Torneos abiertos reales: alimentan el ticker del hero, el carrusel
  // "Juega esta semana" y las recomendaciones del test de nivel.
  const supabase = await getSupabaseServerClient();
  const open = await getOpenTournaments(supabase);
  const tournaments: LevelFinderTournament[] = open
    .filter((t) => t.category_kind === 'casual' || t.category_kind === 'estandar')
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      startsAt: t.starts_at,
      category: t.category_kind === 'casual' ? null : t.category,
    }));

  return (
    <main className="bg-background relative min-h-screen overflow-hidden">
      <SiteHeader />
      <Hero next={open.find((t) => t.taken < t.max_teams) ?? null} />
      {open.length > 0 && <OpenNow tournaments={open} />}
      <LevelFinder tournaments={tournaments} />
      <MinimalFooter />
    </main>
  );
}

function SiteHeader() {
  return (
    <header className="border-border/40 bg-background/60 sticky top-0 z-50 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display text-base tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Ingresar</Link>
          </Button>
          <Button variant="crown" size="sm" asChild>
            <Link href="/signup">
              Únete
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero({ next }: { next: OpenTournament | null }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="court-grid absolute inset-0 opacity-50" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[800px] bg-[radial-gradient(ellipse_at_top,rgba(255,197,61,0.18),transparent_60%)]"
        aria-hidden
      />
      <div className="mx-auto max-w-3xl px-6 pb-16 pt-12 text-center md:pb-20 md:pt-24">
        {/* Ticker del proximo torneo real: prueba de que aca se juega, no un folleto. */}
        {next && (
          <Link
            href={`/tournaments/${next.slug}`}
            className="border-border/60 bg-card/60 hover:border-crown/60 mx-auto mb-8 inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border py-2 pl-3 pr-4 text-xs backdrop-blur transition-colors"
          >
            <span className="bg-live size-2 shrink-0 animate-pulse rounded-full" />
            <span className="text-muted-foreground shrink-0 uppercase tracking-widest">Próximo</span>
            <span className="min-w-0 truncate font-semibold">{next.name}</span>
            <Countdown target={next.starts_at} size="sm" className="text-crown shrink-0" />
            <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
          </Link>
        )}

        <h1 className="font-display text-balance text-5xl leading-[0.95] tracking-tight md:text-7xl">
          PADELKING — LA LIGA DEL{' '}
          <span className="text-crown">PÁDEL</span>{' '}
          COLOMBIANO.
        </h1>

        <p className="text-muted-foreground mx-auto mt-6 max-w-xl text-balance text-lg md:text-xl">
          Comunidades, torneos y ranking para el pádel amateur. Crea tu equipo, juega y sube en la
          tabla.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="crown" size="xl" asChild>
            <Link href="/signup">
              Crear cuenta
              <ArrowRight className="size-5" />
            </Link>
          </Button>
          <Button variant="outline" size="xl" asChild>
            <Link href="#nivel">¿Cuál es mi categoría?</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// Antes: tres tarjetas de icono ("Comunidades / Torneos / Ranking") que no
// vendian nada concreto. Ahora: los torneos reales a los que te puedes
// inscribir hoy, con cupos y precio, en un carrusel que se desliza en movil.
function OpenNow({ tournaments }: { tournaments: OpenTournament[] }) {
  return (
    <section className="pb-8">
      <div className="mx-auto mb-6 flex max-w-6xl items-end justify-between gap-4 px-6">
        <div>
          <p className="text-live flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
            <span className="bg-live size-1.5 animate-pulse rounded-full" />
            Inscripciones abiertas
          </p>
          <h2 className="font-display mt-2 text-3xl tracking-tight md:text-4xl">
            JUEGA <span className="text-crown">ESTA SEMANA.</span>
          </h2>
        </div>
        <Link
          href="/tournaments"
          className="text-muted-foreground hover:text-foreground flex min-h-11 shrink-0 items-center gap-1 text-xs uppercase tracking-widest"
        >
          Ver todos
          <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="mx-auto max-w-6xl">
        <OpenTournamentsRail tournaments={tournaments} />
      </div>
    </section>
  );
}

function MinimalFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-xs md:flex-row">
        <div className="flex items-center gap-2">
          <KingLogo />
          <span className="font-display tracking-tight">
            PADEL<span className="text-crown">KING</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 uppercase tracking-widest">
          <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terms" className="hover:text-foreground">Términos</Link>
          <Link href="mailto:hola@padelking.co" className="hover:text-foreground normal-case tracking-normal">hola@padelking.co</Link>
        </div>
        <div>© {new Date().getFullYear()} PadelKing</div>
      </div>
    </footer>
  );
}
