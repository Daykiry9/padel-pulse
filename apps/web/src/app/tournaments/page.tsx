import Link from 'next/link';
import { Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-footer';
import { TournamentListView, type TournamentRow } from '@/components/marketing/tournament-list-view';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const supabase = await getSupabaseServerClient();

  const user = await getSession();
  let myCity: string | null = null;
  if (user && cityParam !== 'all') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('city')
      .eq('id', user.id)
      .maybeSingle();
    myCity = (profile as { city: string | null } | null)?.city ?? null;
  }
  const cityFilter = cityParam && cityParam !== 'all' ? cityParam : myCity;

  const { data } = await supabase
    .from('tournaments')
    .select(
      'id, slug, name, format, status, starts_at, category_kind, category, min_sum, tier, max_teams, price_per_team, clubs(name, city)',
    )
    .in('category_kind', ['estandar', 'suma', 'mixto_estandar', 'mixto_suma', 'casual'])
    .eq('status', 'open')
    .order('starts_at', { ascending: true });

  const tournamentsAll = (data ?? []) as unknown as TournamentRow[];

  const tournaments = cityFilter
    ? tournamentsAll.filter((t) => t.clubs?.city === cityFilter)
    : tournamentsAll;

  // Fetch registrations count per tournament (1 query total)
  let tournamentsWithCount: TournamentRow[] = tournaments;
  if (tournaments.length > 0) {
    const ids = tournaments.map((t) => t.id);
    const { data: regs } = await supabase
      .from('tournament_registrations')
      .select('tournament_id')
      .in('tournament_id', ids)
      .eq('status', 'confirmed');
    const countMap = new Map<string, number>();
    for (const r of (regs ?? []) as { tournament_id: string }[]) {
      countMap.set(r.tournament_id, (countMap.get(r.tournament_id) ?? 0) + 1);
    }
    tournamentsWithCount = tournaments.map((t) => ({
      ...t,
      registrations_count: countMap.get(t.id) ?? 0,
    }));
  }

  const availableCities = Array.from(
    new Set(tournamentsAll.map((t) => t.clubs?.city).filter(Boolean) as string[]),
  ).sort();

  return (
    <div className="bg-background min-h-screen">
      <PublicHeader />

      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="mb-10">
          <Badge variant="crown">Torneos</Badge>
          <h1 className="font-display mt-4 text-5xl tracking-tight md:text-6xl">
            TORNEOS <span className="text-gold-400">KINGS</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl text-sm md:text-base">
            Masculinos + mixtos. ¿Buscas femeninos?{' '}
            <Link href="/queens/tournaments" className="text-magenta-500 underline-offset-2 hover:underline">
              Ver Queens →
            </Link>
          </p>

          {/* Hero stats — credibilidad de un vistazo */}
          <dl className="border-border/40 bg-card/40 mt-6 grid max-w-2xl grid-cols-3 divide-x divide-border/40 overflow-hidden rounded-xl border">
            <div className="px-4 py-3">
              <dt className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Abiertos
              </dt>
              <dd className="font-display mt-1 text-2xl tabular-nums">
                {tournamentsWithCount.filter((t) => t.status === 'open').length}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Ciudades
              </dt>
              <dd className="font-display mt-1 text-2xl tabular-nums">
                {new Set(tournamentsWithCount.map((t) => t.clubs?.city).filter(Boolean)).size}
              </dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-muted-foreground text-[10px] uppercase tracking-widest">
                Inscritos
              </dt>
              <dd className="font-display mt-1 text-2xl tabular-nums">
                {tournamentsWithCount.reduce((s, t) => s + (t.registrations_count ?? 0), 0)}
              </dd>
            </div>
          </dl>

          {availableCities.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-[10px] uppercase tracking-[0.15em]">
                Ciudad:
              </span>
              <CityChip href="/tournaments?city=all" active={cityParam === 'all'} label="Todas" />
              {availableCities.map((c) => (
                <CityChip
                  key={c}
                  href={`/tournaments?city=${encodeURIComponent(c)}`}
                  active={cityFilter === c && cityParam !== 'all'}
                  label={c}
                />
              ))}
              {myCity && !cityParam && (
                <span className="text-muted-foreground text-[10px] italic">
                  Tu ciudad ({myCity}) por defecto
                </span>
              )}
            </div>
          )}
        </div>

        {tournamentsWithCount.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="text-muted-foreground mx-auto size-10" />
            <p className="text-foreground/80 font-display mt-4 text-xl">
              No hay torneos publicados.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              {cityFilter
                ? `No hay torneos abiertos en ${cityFilter} ahora. Cambia el filtro o vuelve pronto.`
                : 'Cuando los organizadores publiquen torneos, los verás aquí.'}
            </p>
            <Button variant="crown" className="mt-4" asChild>
              <Link href="/signup">Crear cuenta</Link>
            </Button>
          </Card>
        ) : (
          <TournamentListView tournaments={tournamentsWithCount} brand="kings" />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

function CityChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-[0.15em] transition-colors ${
        active
          ? 'border-gold-400/40 bg-gold-400/15 text-gold-300'
          : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
      }`}
    >
      {label}
    </Link>
  );
}
