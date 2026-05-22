import Link from 'next/link';
import { Calendar, Crown, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QueensLogo } from '@/components/marketing/queens-logo';
import { getSupabaseServerClient } from '@/lib/supabase/server';

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

export default async function QueensTournamentsPage() {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select(
      'id, slug, name, format, status, starts_at, category_kind, category, min_sum, tier, max_teams, price_per_team',
    )
    .in('category_kind', ['queens_estandar', 'queens_suma', 'mixto_estandar', 'mixto_suma'])
    .order('starts_at', { ascending: true });

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
  const tournaments = (data ?? []) as unknown as TournamentRow[];

  return (
    <div className="theme-queens">
      <div className="bg-background min-h-screen">
        <header className="border-border/40 bg-background/60 sticky top-0 z-40 border-b backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/queens" className="flex items-center gap-2">
              <QueensLogo />
              <span className="font-display text-base tracking-tight">
                PADEL<span className="text-queens">QUEENS</span>
              </span>
            </Link>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Ingresar</Link>
              </Button>
              <Button variant="queens" size="sm" asChild>
                <Link href="/signup">Únete</Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-6 py-12">
          <div className="mb-10">
            <Badge variant="queens">Torneos</Badge>
            <h1 className="font-display mt-4 text-5xl tracking-tight md:text-6xl">
              TORNEOS <span className="text-queens">QUEENS</span>
            </h1>
            <p className="text-muted-foreground mt-3 text-sm">
              Femeninos + mixtos. ¿Buscas masculinos?{' '}
              <Link href="/tournaments" className="text-crown underline">
                Ver Kings →
              </Link>
            </p>
          </div>

          {tournaments.length === 0 ? (
            <Card className="p-12 text-center">
              <Trophy className="text-muted-foreground mx-auto size-10" />
              <p className="text-foreground/80 font-display mt-4 text-xl">
                No hay torneos Queens publicados.
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Crea una comunidad Queens y publica el primero.
              </p>
              <Button variant="queens" className="mt-4" asChild>
                <Link href="/signup">Crear cuenta</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => {
                const isMixto =
                  t.category_kind === 'mixto_estandar' || t.category_kind === 'mixto_suma';
                return (
                  <Link key={t.id} href={`/tournaments/${t.slug}`}>
                    <Card className="hover:border-queens/40 h-full transition-[border-color,background-color] hover:border-foreground/20">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <Badge variant={isMixto ? 'data' : 'queens'}>
                            {isMixto ? 'Mixto' : 'Queens'} ·{' '}
                            {FORMAT_LABELS[t.format] ?? t.format}
                          </Badge>
                          <Badge
                            variant={t.status === 'open' ? 'success' : 'muted'}
                            className="text-[10px]"
                          >
                            {t.status}
                          </Badge>
                        </div>
                        <CardTitle className="mt-3 text-base">{t.name}</CardTitle>
                        <CardDescription className="normal-case">
                          <div className="flex items-center gap-2 text-xs">
                            <Crown className="text-queens size-3.5" />
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
                            {t.max_teams} equipos ·{' '}
                            {t.price_per_team > 0
                              ? `$${t.price_per_team.toLocaleString('es-CO')} COP`
                              : 'Gratis'}
                          </div>
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
