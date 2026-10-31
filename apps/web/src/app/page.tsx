import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Countdown } from '@/components/ui/countdown';
import { PriceTag } from '@/components/ui/price-tag';
import { KingLogo } from '@/components/marketing/king-logo';
import {
  GiantWordmark,
  HeroTicket,
  MagneticLink,
  Marquee,
  Reveal,
  RevealHeadline,
  SmoothScroll,
} from '@/components/marketing/landing-motion';
import { LevelFinder, type LevelFinderTournament } from '@/components/marketing/level-finder';
import { getOpenTournaments, OpenTournamentsRail, type OpenTournament } from '@/components/open-tournaments-rail';
import { formatShort } from '@/lib/format-date';
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
      <SmoothScroll />
      <SiteHeader />
      <Hero next={open.find((t) => t.taken < t.max_teams) ?? null} />
      <Marquee items={['Inscríbete', 'Juega', 'Sube en el ranking', 'PadelKing', 'PadelQueens']} />
      {open.length > 0 && (
        <Reveal className="pt-16">
          <OpenNow tournaments={open} />
        </Reveal>
      )}
      <Reveal>
        <LevelFinder tournaments={tournaments} />
      </Reveal>
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

// Hero cinematografico: titular que se revela por palabras y, al lado, la
// boleta 3D del proximo torneo real (antes era una pastilla de texto chiquita).
function Hero({ next }: { next: OpenTournament | null }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="court-grid absolute inset-0 opacity-50" aria-hidden />
      <div
        className="absolute inset-x-0 top-0 -z-10 h-[800px] bg-[radial-gradient(ellipse_at_top,rgba(255,197,61,0.18),transparent_60%)]"
        aria-hidden
      />
      <div
        className={`mx-auto grid items-center gap-12 px-6 pb-16 pt-12 md:pb-24 md:pt-20 ${
          next ? 'max-w-6xl lg:grid-cols-[1.15fr_0.85fr]' : 'max-w-3xl'
        }`}
      >
        <div className={`min-w-0 text-center ${next ? 'lg:text-left' : ''}`}>
          <RevealHeadline
            className="font-display text-balance text-[2.5rem] leading-[0.95] tracking-tight sm:text-5xl md:text-7xl"
            words={[
              { text: 'PADELKING' },
              { text: '—' },
              { text: 'LA' },
              { text: 'LIGA' },
              { text: 'DEL' },
              { text: 'PÁDEL', accent: true },
              { text: 'COLOMBIANO.' },
            ]}
          />

          <div className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both delay-500 duration-700">
            <p
              className={`text-muted-foreground mx-auto mt-6 max-w-xl text-pretty text-lg md:text-xl ${
                next ? 'lg:mx-0' : ''
              }`}
            >
              Comunidades, torneos y ranking para el pádel amateur. Crea tu equipo, juega y sube en la
              tabla.
            </p>

            <div className={`mt-8 flex flex-wrap justify-center gap-3 ${next ? 'lg:justify-start' : ''}`}>
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
        </div>

        {next && (
          <div className="mx-auto w-full max-w-md">
            <HeroTicket
              t={{
                slug: next.slug,
                name: next.name,
                starts_at: next.starts_at,
                max_teams: next.max_teams,
                price_per_team: next.price_per_team,
                taken: next.taken,
              }}
              countdown={<Countdown target={next.starts_at} size="sm" className="text-crown" />}
              meta={`${next.clubs?.city ?? 'Colombia'} · ${formatShort(next.starts_at)}`}
              price={<PriceTag value={next.price_per_team} />}
            />
          </div>
        )}
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

// Cierre tipo "footer.design": CTA final magnetico + wordmark gigante que sube
// con el scroll. Antes el landing terminaba en una linea de links.
function MinimalFooter() {
  return (
    <footer className="border-border/40 relative isolate overflow-hidden border-t">
      <div
        className="absolute inset-x-0 bottom-0 -z-10 h-[500px] bg-[radial-gradient(ellipse_at_bottom,rgba(255,197,61,0.14),transparent_65%)]"
        aria-hidden
      />
      <Reveal className="mx-auto max-w-3xl px-6 pt-20 text-center">
        <p className="text-muted-foreground text-xs uppercase tracking-widest">Tu primer torneo está a un clic</p>
        <h2 className="font-display mt-3 text-balance text-4xl tracking-tight md:text-6xl">
          ¿TE LE <span className="text-crown">MIDES?</span>
        </h2>
        <div className="mt-8">
          <MagneticLink
            href="/signup"
            className="bg-crown text-primary-foreground shadow-glow-crown press inline-flex min-h-14 items-center gap-2 rounded-full px-8 text-lg font-bold"
          >
            Unirme gratis
            <ArrowRight className="size-5" />
          </MagneticLink>
        </div>
      </Reveal>

      <div className="text-muted-foreground mx-auto mt-16 flex max-w-6xl flex-col items-center justify-between gap-3 px-6 text-xs md:flex-row">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 uppercase tracking-widest">
          <Link href="/tournaments" className="hover:text-foreground">Torneos</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacidad</Link>
          <Link href="/terms" className="hover:text-foreground">Términos</Link>
          <Link href="mailto:hola@padelking.co" className="hover:text-foreground normal-case tracking-normal">hola@padelking.co</Link>
        </div>
        <div>© {new Date().getFullYear()} PadelKing</div>
      </div>

      <div className="mt-6">
        <GiantWordmark />
      </div>
    </footer>
  );
}
