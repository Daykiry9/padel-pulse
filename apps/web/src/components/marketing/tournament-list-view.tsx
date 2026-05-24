import Link from 'next/link';
import { ArrowRight, Calendar, MapPin } from 'lucide-react';

import { AvatarGroup } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Countdown } from '@/components/ui/countdown';
import { PriceTag } from '@/components/ui/price-tag';
import { Section } from '@/components/ui/section';
import { formatDate, formatTime } from '@/lib/format-date';
import { cn } from '@/lib/utils';

export type TournamentRow = {
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
  clubs: { name?: string; city: string } | null;
  registrations_count?: number;
};

type Variant = 'kings' | 'queens';

function sumaVariant(categoryKind: string, brand: Variant): 'kings' | 'queens' | 'mixto' {
  if (categoryKind === 'queens_suma') return 'queens';
  if (categoryKind === 'mixto_suma') return 'mixto';
  return brand;
}

function dayInfo(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((date.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
}

export function TournamentListView({
  tournaments,
  brand = 'kings',
}: {
  tournaments: TournamentRow[];
  brand?: Variant;
}) {
  if (tournaments.length === 0) {
    return null;
  }

  const sorted = [...tournaments].sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );

  // Particionar por buckets temporales para crear hierarchy
  const thisWeek: TournamentRow[] = [];
  const next2Weeks: TournamentRow[] = [];
  const thisMonth: TournamentRow[] = [];
  const later: TournamentRow[] = [];

  for (const t of sorted) {
    const d = dayInfo(new Date(t.starts_at));
    if (d < 0) continue; // ya pasaron
    if (d <= 7) thisWeek.push(t);
    else if (d <= 14) next2Weeks.push(t);
    else if (d <= 30) thisMonth.push(t);
    else later.push(t);
  }

  const hero = thisWeek[0] ?? null;
  const restThisWeek = thisWeek.slice(1);

  return (
    <div className="space-y-10">
      {/* HERO: torneo más próximo de esta semana */}
      {hero && <HeroTournamentCard tournament={hero} brand={brand} />}

      {restThisWeek.length > 0 && (
        <Section title="Esta semana" subtitle={`${restThisWeek.length} torneos más`}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {restThisWeek.map((t) => (
              <MediumTournamentCard key={t.id} tournament={t} brand={brand} />
            ))}
          </div>
        </Section>
      )}

      {next2Weeks.length > 0 && (
        <Section title="Próximas 2 semanas" subtitle={`${next2Weeks.length} torneos`}>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {next2Weeks.map((t) => (
              <MediumTournamentCard key={t.id} tournament={t} brand={brand} />
            ))}
          </div>
        </Section>
      )}

      {thisMonth.length > 0 && (
        <Section title="Este mes" subtitle={`${thisMonth.length} torneos`}>
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
            {thisMonth.map((t) => (
              <CompactTournamentCard key={t.id} tournament={t} brand={brand} />
            ))}
          </div>
        </Section>
      )}

      {later.length > 0 && (
        <Section title="Próximamente" subtitle={`${later.length} torneos más adelante`}>
          <Card className="divide-border/30 divide-y p-0">
            {later.map((t) => (
              <LineTournamentRow key={t.id} tournament={t} brand={brand} />
            ))}
          </Card>
        </Section>
      )}
    </div>
  );
}

// ============================================================
// HERO — full card with all info, biggest visual weight
// ============================================================
function HeroTournamentCard({ tournament, brand }: { tournament: TournamentRow; brand: Variant }) {
  const isQueens = brand === 'queens';
  const cls = isQueens
    ? 'border-magenta-500/30 bg-gradient-to-br from-magenta-500/[0.06] to-transparent hover:border-magenta-500/60 hover:bg-magenta-500/[0.08]'
    : 'border-gold-400/30 bg-gradient-to-br from-gold-400/[0.06] to-transparent hover:border-gold-400/60 hover:bg-gold-400/[0.08]';

  return (
    <Section
      title="Más próximo"
      subtitle="El primer torneo que arranca esta semana"
    >
      <Link href={`/tournaments/${tournament.slug}`} className="focus-card block rounded-xl">
        <Card
          className={cn(
            'relative overflow-hidden p-6 transition-all duration-[var(--duration-base)] md:p-8',
            cls,
          )}
        >
          {/* Decoración */}
          <div
            className={cn(
              'absolute -right-12 -top-12 size-48 rounded-full blur-3xl',
              isQueens ? 'bg-magenta-500/[0.06]' : 'bg-gold-400/[0.06]',
            )}
          />

          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryBadge kind="format" format={tournament.format} />
              {tournament.category_kind.includes('suma') ? (
                <CategoryBadge
                  kind="suma"
                  minSum={tournament.min_sum ?? 0}
                  variant={sumaVariant(tournament.category_kind, brand)}
                />
              ) : tournament.category ? (
                <CategoryBadge kind="category" category={tournament.category} />
              ) : null}
              <CategoryBadge kind="tier" tier={tournament.tier as 'competitivo' | 'casual'} />
            </div>
            <Countdown target={tournament.starts_at} format="words" />
          </div>

          <h2 className="font-display relative mt-5 text-3xl tracking-tight md:text-5xl">
            {tournament.name}
          </h2>

          <div className="text-muted-foreground relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-4" />
              <span className="tabular-nums">
                {formatDate(tournament.starts_at, { weekday: 'long', day: '2-digit', month: 'short' })}
                {' · '}
                {formatTime(tournament.starts_at)}
              </span>
            </span>
            {tournament.clubs && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-4" />
                {tournament.clubs.name ?? 'Sede'} · {tournament.clubs.city}
              </span>
            )}
          </div>

          <div className="border-border/40 relative mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
            <div className="flex items-center gap-3">
              <AvatarGroup
                avatars={Array.from({ length: Math.min(tournament.registrations_count ?? 0, 5) }, (_, i) => ({
                  seed: `${tournament.id}-${i}`,
                }))}
                max={5}
                size="sm"
              />
              <div className="text-sm">
                <span className="text-foreground font-semibold tabular-nums">
                  {tournament.registrations_count ?? 0}
                </span>
                <span className="text-muted-foreground">
                  /{tournament.max_teams} inscritos
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <PriceTag value={tournament.price_per_team} size="lg" />
              <Button variant={isQueens ? 'queens' : 'crown'} size="default">
                Inscribirme
                <ArrowRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </Link>
    </Section>
  );
}

// ============================================================
// MEDIUM — grid card, balanced info
// ============================================================
function MediumTournamentCard({ tournament, brand }: { tournament: TournamentRow; brand: Variant }) {
  const isQueens = brand === 'queens';
  const accentBorderHover = isQueens
    ? 'hover:border-magenta-500/60'
    : 'hover:border-gold-400/60';

  return (
    <Link href={`/tournaments/${tournament.slug}`} className="focus-card block rounded-xl">
      <Card
        className={cn(
          'border-border bg-card group h-full overflow-hidden p-5 transition-[border-color,background-color,transform] duration-[var(--duration-base)]',
          accentBorderHover,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <CategoryBadge kind="format" format={tournament.format} size="sm" />
            <CategoryBadge kind="tier" tier={tournament.tier as 'competitivo' | 'casual'} size="sm" />
          </div>
          <Countdown target={tournament.starts_at} format="words" size="sm" />
        </div>

        <h3 className="font-display mt-3 line-clamp-2 text-base tracking-tight md:text-lg">
          {tournament.name}
        </h3>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {tournament.category_kind.includes('suma') ? (
            <CategoryBadge
              kind="suma"
              minSum={tournament.min_sum ?? 0}
              variant={sumaVariant(tournament.category_kind, brand)}
              size="sm"
            />
          ) : tournament.category ? (
            <CategoryBadge kind="category" category={tournament.category} size="sm" />
          ) : null}
        </div>

        <div className="text-muted-foreground mt-4 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 tabular-nums">
            <Calendar className="size-3" />
            {formatDate(tournament.starts_at, { weekday: 'short', day: '2-digit', month: 'short' })}
            {' · '}
            {formatTime(tournament.starts_at)}
          </div>
          {tournament.clubs && (
            <div className="flex items-center gap-1.5">
              <MapPin className="size-3" />
              <span className="truncate">{tournament.clubs.city}</span>
            </div>
          )}
        </div>

        <div className="border-border/40 mt-4 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <AvatarGroup
              avatars={Array.from(
                { length: Math.min(tournament.registrations_count ?? 0, 3) },
                (_, i) => ({ seed: `${tournament.id}-m-${i}` }),
              )}
              max={3}
              size="xs"
            />
            <span className="text-muted-foreground text-xs tabular-nums">
              {tournament.registrations_count ?? 0}/{tournament.max_teams}
            </span>
          </div>
          <PriceTag value={tournament.price_per_team} size="sm" />
        </div>
      </Card>
    </Link>
  );
}

// ============================================================
// COMPACT — grid 4 cols, mínimum info
// ============================================================
function CompactTournamentCard({ tournament, brand }: { tournament: TournamentRow; brand: Variant }) {
  const isQueens = brand === 'queens';
  const accentBorderHover = isQueens
    ? 'hover:border-magenta-500/40'
    : 'hover:border-gold-400/40';

  return (
    <Link href={`/tournaments/${tournament.slug}`} className="focus-card block rounded-xl">
      <Card
        className={cn(
          'border-border bg-card group h-full overflow-hidden p-4 transition-[border-color] duration-[var(--duration-base)]',
          accentBorderHover,
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {tournament.category_kind.includes('suma') ? (
            <CategoryBadge
              kind="suma"
              minSum={tournament.min_sum ?? 0}
              variant={sumaVariant(tournament.category_kind, brand)}
              size="sm"
            />
          ) : tournament.category ? (
            <CategoryBadge kind="category" category={tournament.category} size="sm" />
          ) : (
            <CategoryBadge kind="tier" tier={tournament.tier as 'competitivo' | 'casual'} size="sm" />
          )}
        </div>
        <h4 className="font-display mt-2 line-clamp-2 text-sm tracking-tight">
          {tournament.name}
        </h4>
        <div className="text-muted-foreground mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-widest tabular-nums">
          <Calendar className="size-3" />
          {formatDate(tournament.starts_at, { day: '2-digit', month: 'short' })}
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-muted-foreground text-[10px] tabular-nums">
            {tournament.registrations_count ?? 0}/{tournament.max_teams}
          </span>
          <PriceTag value={tournament.price_per_team} size="sm" />
        </div>
      </Card>
    </Link>
  );
}

// ============================================================
// LINE — one-line row for "later" torneos
// ============================================================
function LineTournamentRow({ tournament, brand }: { tournament: TournamentRow; brand: Variant }) {
  return (
    <Link
      href={`/tournaments/${tournament.slug}`}
      className="focus-card hover:bg-muted/30 flex items-center gap-3 rounded-md px-4 py-3 transition-colors"
    >
      <div className="text-muted-foreground hidden w-16 text-xs uppercase tracking-widest tabular-nums sm:block">
        {formatDate(tournament.starts_at, { day: '2-digit', month: 'short' })}
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <span className="truncate text-sm font-semibold">{tournament.name}</span>
        <CategoryBadge kind="tier" tier={tournament.tier as 'competitivo' | 'casual'} size="sm" />
        {tournament.category_kind.includes('suma') ? (
          <CategoryBadge
            kind="suma"
            minSum={tournament.min_sum ?? 0}
            variant={sumaVariant(tournament.category_kind, brand)}
            size="sm"
          />
        ) : tournament.category ? (
          <CategoryBadge kind="category" category={tournament.category} size="sm" />
        ) : null}
      </div>
      <PriceTag value={tournament.price_per_team} size="sm" />
      <ArrowRight className="text-muted-foreground size-3.5" />
    </Link>
  );
}
