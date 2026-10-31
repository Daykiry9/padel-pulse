import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Countdown } from '@/components/ui/countdown';
import { PriceTag } from '@/components/ui/price-tag';
import { KingLogo } from '@/components/marketing/king-logo';
import { LevelFinder, type LevelFinderTournament } from '@/components/marketing/level-finder';
import { formatShort } from '@/lib/format-date';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

type OpenTournament = {
  id: string;
  slug: string;
  name: string;
  starts_at: string;
  category_kind: string;
  category: string | null;
  max_teams: number;
  price_per_team: number;
  clubs: { city: string } | null;
  taken: number;
};

export default async function HomePage() {
  const user = await getSession();
  if (user) {
    redirect('/app');
  }

  // Torneos abiertos reales: alimentan el ticker del hero, el carrusel
  // "Juega esta semana" y las recomendaciones del test de nivel.
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select('id, slug, name, starts_at, category_kind, category, max_teams, price_per_team, clubs(city)')
    .eq('status', 'open')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(12);
  const rows = (data ?? []) as unknown as Omit<OpenTournament, 'taken'>[];
  const counts = new Map<string, number>();
  if (rows.length) {
    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('tournament_id')
      .in('tournament_id', rows.map((t) => t.id))
      .eq('status', 'confirmed');
    for (const r of (regs ?? []) as { tournament_id: string }[]) {
      counts.set(r.tournament_id, (counts.get(r.tournament_id) ?? 0) + 1);
    }
  }
  const open: OpenTournament[] = rows.map((t) => ({
    ...t,
    taken: Math.min(counts.get(t.id) ?? 0, t.max_teams),
  }));
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

      <div className="mx-auto flex max-w-6xl snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tournaments.map((t) => {
          const left = t.max_teams - t.taken;
          const almostFull = left > 0 && left <= Math.max(2, Math.ceil(t.max_teams * 0.25));
          return (
            <Link key={t.id} href={`/tournaments/${t.slug}`} className="w-[78%] shrink-0 snap-start sm:w-72">
              <Card className="hover:border-crown/50 flex h-full flex-col gap-3 p-5 transition-colors">
                <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-widest">
                  <span className="text-muted-foreground truncate">{t.clubs?.city ?? 'Colombia'}</span>
                  <Countdown target={t.starts_at} size="sm" className="text-crown shrink-0" />
                </div>
                <div className="font-display line-clamp-2 min-h-[3.25rem] text-xl leading-tight tracking-tight">
                  {t.name.toUpperCase()}
                </div>
                <div className="text-muted-foreground text-xs">{formatShort(t.starts_at)}</div>
                <div className="mt-auto space-y-2 pt-2">
                  <div className="flex gap-0.5" aria-hidden>
                    {Array.from({ length: t.max_teams }, (_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 flex-1 rounded-full ${
                          i < t.taken ? (almostFull ? 'bg-live' : 'bg-crown') : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={`text-xs uppercase tracking-widest ${
                        almostFull ? 'text-live font-semibold' : 'text-muted-foreground'
                      }`}
                    >
                      {left === 0 ? 'Cupo completo' : left === 1 ? 'Queda 1 cupo' : `Quedan ${left} cupos`}
                    </span>
                    <PriceTag value={t.price_per_team} />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
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
