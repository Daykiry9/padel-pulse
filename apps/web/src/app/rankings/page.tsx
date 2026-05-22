import Link from 'next/link';
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-footer';
import { getSupabaseServerClient } from '@/lib/supabase/server';

const CATEGORY_LABELS: Record<string, string> = {
  libre: 'Libre / Pro',
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

const KING_CATS = ['libre', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'septima'];
const QUEENS_CATS = ['queens_libre', 'queens_a', 'queens_b', 'queens_c', 'queens_d', 'queens_e'];

type RankRow = {
  profile_id: string;
  display_name: string;
  skill_category: string | null;
  gender: string | null;
  city: string | null;
  total_points: number;
  tournaments_played: number;
  raw_tier1_points: number;
  raw_tier2_points: number;
};

export default async function RankingsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; city?: string; tier?: string }>;
}) {
  const { category, city, tier } = await searchParams;
  const supabase = await getSupabaseServerClient();

  let query = supabase
    .from('player_ranking_consolidated')
    .select(
      'profile_id, display_name, skill_category, gender, city, total_points, tournaments_played, raw_tier1_points, raw_tier2_points',
    )
    .gt('total_points', 0)
    .order('total_points', { ascending: false })
    .limit(100);

  if (category) query = query.eq('skill_category', category as never);
  if (city) query = query.eq('city', city);

  const { data } = await query;
  const rows = (data ?? []) as unknown as RankRow[];

  // Si tier=1, mostramos solo raw_tier1; si tier=2, raw_tier2. Default consolidado.
  const showField =
    tier === '1' ? 'raw_tier1_points' : tier === '2' ? 'raw_tier2_points' : 'total_points';

  // Recopilar ciudades distintas para el filtro
  const { data: citiesData } = await supabase
    .from('player_ranking_consolidated')
    .select('city')
    .gt('total_points', 0)
    .not('city', 'is', null);
  const cities = Array.from(
    new Set(((citiesData ?? []) as { city: string | null }[]).map((c) => c.city).filter(Boolean) as string[]),
  ).sort();

  return (
    <div className="bg-background min-h-screen">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-6 py-12">
        <div>
          <Badge variant="crown">Ranking</Badge>
          <h1 className="font-display mt-3 text-5xl tracking-tight md:text-6xl">
            RANKING <span className="text-crown">NACIONAL</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Sistema híbrido: Tier 1 (torneos oficiales, x1.0) + Tier 2 (americanos casuales, x0.5).
            Decay lineal a 12 meses. Solo cuentan los últimos 12.
          </p>
        </div>

        {/* Filtros */}
        <div className="border-border/40 mt-8 flex flex-wrap gap-2 border-b pb-6">
          <FilterChip href="/rankings" active={!category && !tier} label="Top general" />
          <FilterChip href="/rankings?tier=1" active={tier === '1'} label="Solo Tier 1" />
          <FilterChip href="/rankings?tier=2" active={tier === '2'} label="Solo Tier 2" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-muted-foreground mb-2 text-[10px] uppercase tracking-widest">
              Categoría
            </div>
            <div className="flex flex-wrap gap-1.5">
              <FilterChip href="/rankings" active={!category} label="Todas" small />
              {KING_CATS.map((c) => (
                <FilterChip
                  key={c}
                  href={`/rankings?category=${c}`}
                  active={category === c}
                  label={CATEGORY_LABELS[c]!}
                  small
                />
              ))}
              {QUEENS_CATS.map((c) => (
                <FilterChip
                  key={c}
                  href={`/rankings?category=${c}`}
                  active={category === c}
                  label={CATEGORY_LABELS[c]!}
                  small
                  queens
                />
              ))}
            </div>
          </div>

          {cities.length > 0 && (
            <div>
              <div className="text-muted-foreground mb-2 text-[10px] uppercase tracking-widest">
                Ciudad
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip href="/rankings" active={!city} label="Todas" small />
                {cities.map((c) => (
                  <FilterChip
                    key={c}
                    href={`/rankings?city=${encodeURIComponent(c)}`}
                    active={city === c}
                    label={c}
                    small
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top 3 podio */}
        {rows.length > 0 && !category && !city && (
          <div className="mt-10 grid gap-3 md:grid-cols-3">
            {rows.slice(0, 3).map((r, i) => (
              <Link
                key={r.profile_id}
                href={`/players/${r.profile_id}`}
                className={
                  i === 0
                    ? 'border-crown/40 bg-gradient-to-br from-crown/[0.08] to-transparent rounded-xl border p-6 transition-colors hover:border-crown/70 block'
                    : i === 1
                      ? 'border-foreground/20 bg-muted/40 rounded-xl border p-6 transition-colors hover:border-foreground/40 block'
                      : 'border-foreground/10 rounded-xl border p-6 transition-colors hover:border-foreground/30 block'
                }
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={`font-display text-5xl tabular-nums tracking-tight ${
                      i === 0 ? 'text-crown' : i === 1 ? 'text-foreground' : 'text-foreground/70'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {i === 0 ? (
                    <Crown className="text-crown size-7" />
                  ) : i === 1 ? (
                    <Medal className="text-foreground/60 size-6" />
                  ) : (
                    <Trophy className="text-foreground/40 size-6" />
                  )}
                </div>
                <div className="font-display mt-3 truncate text-lg tracking-tight">
                  {r.display_name}
                </div>
                <div className="text-muted-foreground mt-1 text-xs uppercase tracking-widest">
                  {r.skill_category ? (CATEGORY_LABELS[r.skill_category] ?? r.skill_category) : '—'}
                  {r.city ? ` · ${r.city}` : ''}
                </div>
                <div className="font-display mt-3 text-2xl tabular-nums tracking-tight">
                  {r[showField as keyof RankRow]?.toLocaleString('es-CO')}{' '}
                  <span className="text-muted-foreground text-xs normal-case">pts</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Tabla full */}
        <div className="mt-10">
          <h2 className="font-display mb-3 text-2xl tracking-tight">TOP 100</h2>
          {rows.length === 0 ? (
            <Card className="p-8 text-center">
              <Trophy className="text-muted-foreground mx-auto size-10" />
              <p className="text-foreground/80 font-display mt-3 text-lg">
                Sin datos todavía para estos filtros
              </p>
              <p className="text-muted-foreground mt-2 text-sm">
                Los rankings se llenan cuando los torneos terminan y los puntos se asignan. Vuelve
                pronto.
              </p>
            </Card>
          ) : (
            <Card className="divide-border/30 divide-y overflow-hidden p-0">
              {rows.map((r, idx) => (
                <Link
                  key={r.profile_id}
                  href={`/players/${r.profile_id}`}
                  className="hover:bg-muted/30 grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-4 py-3 text-sm transition-colors"
                >
                  <span
                    className={`font-display text-base tabular-nums ${
                      idx < 3 ? 'text-crown' : 'text-muted-foreground'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{r.display_name}</div>
                    <div className="text-muted-foreground truncate text-[10px] uppercase tracking-widest">
                      {r.skill_category
                        ? (CATEGORY_LABELS[r.skill_category] ?? r.skill_category)
                        : 'sin categoría'}
                      {r.city ? ` · ${r.city}` : ''} · {r.tournaments_played} torneos
                    </div>
                  </div>
                  <span className="text-muted-foreground tabular-nums text-xs">
                    {r[showField as keyof RankRow]?.toLocaleString('es-CO')}
                  </span>
                  <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
                    pts
                  </span>
                </Link>
              ))}
            </Card>
          )}
        </div>

        <div className="mt-8 flex justify-center">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="size-3" />
              Volver a la home
            </Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
  small = false,
  queens = false,
}: {
  href: string;
  active: boolean;
  label: string;
  small?: boolean;
  queens?: boolean;
}) {
  const baseSize = small ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';
  const colors = active
    ? queens
      ? 'border-queens/40 bg-queens/15 text-queens'
      : 'border-crown/40 bg-crown/15 text-crown'
    : 'border-border/40 text-muted-foreground hover:text-foreground';
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border transition-colors uppercase tracking-widest ${baseSize} ${colors}`}
    >
      {label}
    </Link>
  );
}
