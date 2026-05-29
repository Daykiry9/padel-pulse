import Link from 'next/link';
import { ArrowLeft, Crown, Medal, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-footer';
import { CATEGORY_LABELS } from '@padelking/domain';

import { getSupabaseServerClient } from '@/lib/supabase/server';

// Mock visual del top 5 — se muestra cuando rows está vacío para enseñar
// cómo se verá el ranking real, no dejar al user en el aire.
const PREVIEW_PLAYERS = [
  { rank: 1, name: 'Sebastián Castaño', cat: '1ra', city: 'Bogotá', pts: 2840 },
  { rank: 2, name: 'María González', cat: '1ra', city: 'Medellín', pts: 2615 },
  { rank: 3, name: 'Juan Pablo Ortiz', cat: '2da', city: 'Bogotá', pts: 2280 },
  { rank: 4, name: 'Laura Restrepo', cat: '1ra', city: 'Cali', pts: 2105 },
  { rank: 5, name: 'Andrés Mejía', cat: '2da', city: 'Bogotá', pts: 1990 },
];

function RankingPreviewMock() {
  return (
    <div className="border-border/40 bg-card/40 rounded-lg border p-3">
      <div className="text-muted-foreground mb-2 text-[10px] uppercase tracking-widest">
        Top 5 · 1ra masculina · ejemplo
      </div>
      <ul className="divide-border/30 divide-y">
        {PREVIEW_PLAYERS.map((p) => (
          <li key={p.rank} className="grid grid-cols-[1.5rem_auto_1fr_auto] items-center gap-2 py-2 text-xs">
            <span
              className={`font-display tabular-nums ${
                p.rank === 1 ? 'text-crown' : p.rank <= 3 ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {p.rank}
            </span>
            <Avatar seed={p.name} name={p.name} size="xs" />
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="text-muted-foreground text-[9px] uppercase tracking-widest">
                {p.cat} · {p.city}
              </div>
            </div>
            <span className="text-muted-foreground tabular-nums">{p.pts.toLocaleString('es-CO')}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const KING_CATS = ['libre', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta'];
const QUEENS_CATS = ['queens_libre', 'queens_a', 'queens_b', 'queens_c', 'queens_d'];

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

      <main className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div>
          <Badge variant="crown">Ranking</Badge>
          <h1 className="font-display mt-3 text-5xl tracking-tight md:text-6xl">
            RANKING <span className="text-crown">NACIONAL</span>
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            <strong className="text-foreground">General</strong>: todos los torneos.{' '}
            <strong className="text-foreground">Americanos</strong>: solo torneos americanos
            casuales. Los puntos decaen a 12 meses para premiar consistencia.
          </p>
        </div>

        {/* Filtros */}
        <div className="border-border/40 mt-8 flex flex-wrap gap-2 border-b pb-6">
          <FilterChip href="/rankings" active={!tier} label="General" />
          <FilterChip href="/rankings?tier=2" active={tier === '2'} label="Americanos" />
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
                <span className="text-gold-400">●</span> Kings · masculino
              </div>
              <div className="flex flex-wrap gap-1.5">
                <FilterChip
                  href="/rankings"
                  active={!category}
                  label="Todas"
                  small
                />
                {KING_CATS.map((c) => (
                  <FilterChip
                    key={c}
                    href={`/rankings?category=${c}`}
                    active={category === c}
                    label={CATEGORY_LABELS[c]!}
                    small
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
                <span className="text-magenta-500">●</span> Queens · femenino
              </div>
              <div className="flex flex-wrap gap-1.5">
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
            <EmptyState
              icon={Trophy}
              title="El ranking se llena con tus primeros torneos"
              description="Cuando los organizadores cierran torneos y asignan puntos, los jugadores van escalando posiciones. Estos son ejemplos de cómo se verá."
              bullets={[
                'Tier 1 (oficiales) pesa x1.0 — mayor velocidad de subida',
                'Tier 2 (americanos casuales) pesa x0.5 — más volumen, suma constante',
                'Los puntos decaen linealmente en 12 meses para premiar consistencia',
              ]}
              primaryAction={
                <Button variant="crown" asChild>
                  <Link href="/tournaments">Ver torneos abiertos</Link>
                </Button>
              }
              preview={<RankingPreviewMock />}
            />
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
