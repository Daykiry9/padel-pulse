import Link from 'next/link';
import { Calendar, Crown, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicHeader } from '@/components/public-header';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

const CATEGORY_LABELS: Record<string, string> = {
  libre: 'Libre',
  primera: '1ra',
  segunda: '2da',
  tercera: '3ra',
  cuarta: '4ta',
  quinta: '5ta',
  sexta: '6ta',
  septima: '7ma',
  queens_libre: 'Queens Libre',
  queens_a: 'Queens A',
  queens_b: 'Queens B',
  queens_c: 'Queens C',
  queens_d: 'Queens D',
  queens_e: 'Queens E',
};

const FORMAT_LABELS: Record<string, string> = {
  americano_fijo: 'Americano fijo',
  americano_random: 'Americano random',
  liguilla_casual: 'Liguilla',
  liga: 'Liga',
  express: 'Express',
  eliminacion: 'Eliminación',
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city: cityParam } = await searchParams;
  const supabase = await getSupabaseServerClient();

  // Auto-detectar ciudad del user si no hay filter explícito
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

  // Query: join con clubs para filtrar por ciudad del club
  const { data } = await supabase
    .from('tournaments')
    .select(
      'id, slug, name, format, status, starts_at, category_kind, category, min_sum, tier, max_teams, price_per_team, clubs(city)',
    )
    .in('category_kind', ['estandar', 'suma', 'mixto_estandar', 'mixto_suma', 'casual'])
    .order('starts_at', { ascending: true });

  const tournamentsAll = (data ?? []) as unknown as (TournamentRow & {
    clubs: { city: string } | null;
  })[];

  // Filtro client-side por ciudad (más simple que un sub-query)
  const tournaments = cityFilter
    ? tournamentsAll.filter((t) => t.clubs?.city === cityFilter)
    : tournamentsAll;

  // Lista de ciudades disponibles para el selector
  const availableCities = Array.from(
    new Set(tournamentsAll.map((t) => t.clubs?.city).filter(Boolean) as string[]),
  ).sort();


  return (
    <div className="bg-background min-h-screen">
      <PublicHeader />

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10">
          <Badge variant="crown">Torneos</Badge>
          <h1 className="font-display mt-4 text-5xl tracking-tight md:text-6xl">
            TORNEOS <span className="text-crown">KINGS</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Masculinos + mixtos. ¿Buscas femeninos?{' '}
            <Link href="/queens/tournaments" className="text-queens underline">
              Ver Queens →
            </Link>
          </p>

          {/* Filtro de ciudad */}
          {availableCities.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
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
                  Mostrando tu ciudad ({myCity}) por defecto
                </span>
              )}
            </div>
          )}
        </div>

        {tournaments.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="text-muted-foreground mx-auto size-10" />
            <p className="text-foreground/80 font-display mt-4 text-xl">
              No hay torneos publicados.
            </p>
            <p className="text-muted-foreground mt-2 text-sm">
              Crea una comunidad y publica el primero.
            </p>
            <Button variant="crown" className="mt-4" asChild>
              <Link href="/signup">Crear cuenta</Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tournaments.map((t) => (
              <Link key={t.id} href={`/tournaments/${t.slug}`}>
                <Card className="hover:border-crown/40 h-full transition-[border-color,background-color] hover:border-foreground/20">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <Badge variant={t.tier === 'competitivo' ? 'crown' : 'data'}>
                        {FORMAT_LABELS[t.format] ?? t.format}
                      </Badge>
                      <Badge variant={t.status === 'open' ? 'success' : 'muted'} className="text-[10px]">
                        {t.status}
                      </Badge>
                    </div>
                    <CardTitle className="mt-3 text-base">{t.name}</CardTitle>
                    <CardDescription className="normal-case">
                      <div className="flex items-center gap-2 text-xs">
                        <Crown className="text-crown size-3.5" />
                        {t.category_kind === 'suma' ||
                        t.category_kind === 'mixto_suma' ||
                        t.category_kind === 'queens_suma'
                          ? `Suma ≥ ${t.min_sum}`
                          : t.category
                            ? CATEGORY_LABELS[t.category]
                            : 'Categoría abierta'}
                      </div>
                      <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
                        <Calendar className="size-3.5" />
                        {new Date(t.starts_at).toLocaleDateString('es-CO', {
                          weekday: 'short',
                          day: '2-digit',
                          month: 'short',
                        })}
                      </div>
                      <div className="text-muted-foreground mt-1 text-xs">
                        {t.max_teams} equipos · {t.price_per_team > 0 ? `$${t.price_per_team.toLocaleString('es-CO')} COP` : 'Gratis'}
                      </div>
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

type TournamentRow = {
  id: string;
  slug: string;
  name: string;
  format: string;
  status: string;
  starts_at: string;
  category_kind: string;
  category: string | null;
  min_sum: number | null;
  tier: string;
  max_teams: number;
  price_per_team: number;
};

function CityChip({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs uppercase tracking-widest transition-colors ${
        active
          ? 'border-crown/40 bg-crown/15 text-crown'
          : 'border-border/40 text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}
    </Link>
  );
}
