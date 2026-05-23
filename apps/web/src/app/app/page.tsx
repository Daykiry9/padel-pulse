import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  Calendar,
  Crown,
  Globe,
  MapPin,
  Plus,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarGroup } from '@/components/ui/avatar';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Countdown } from '@/components/ui/countdown';
import { EmptyState } from '@/components/ui/empty-state';
import { PriceTag } from '@/components/ui/price-tag';
import { Section } from '@/components/ui/section';
import { StatCard } from '@/components/ui/stat-card';
import { formatDate, formatTime } from '@/lib/format-date';
import { getSession, getSupabaseServerClient } from '@/lib/supabase/server';

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

type Profile = { display_name: string; skill_category: string | null; elo_rating: number; city: string | null };
type Team = { id: string; name: string; category: string | null; rating: number; slug: string };
type CommunityMem = {
  community_id: string;
  communities: { id: string; name: string; slug: string; city: string; rating: number } | null;
};
type Tournament = {
  id: string;
  name: string;
  slug: string;
  format: string;
  status: string;
  starts_at: string;
  category: string | null;
  category_kind: string;
  min_sum: number | null;
  tier: string;
  max_teams: number;
  price_per_team: number;
  clubs: { name: string; city: string } | null;
};
type Ranking = {
  total_points: number;
  tournaments_played: number;
  raw_tier1_points: number;
  raw_tier2_points: number;
};

export default async function DashboardPage() {
  const user = await getSession();
  if (!user) return null;
  const supabase = await getSupabaseServerClient();

  const [profileRes, teamRes, communitiesRes, tournamentsRes, rankingRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('team_members')
      .select('team_id, teams(*)')
      .eq('profile_id', user.id)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('community_members')
      .select('community_id, communities(id, name, slug, city, rating)')
      .eq('profile_id', user.id),
    supabase
      .from('tournaments')
      .select(
        'id, name, slug, format, status, starts_at, category, category_kind, min_sum, tier, max_teams, price_per_team, clubs(name, city)',
      )
      .in('status', ['open', 'in_progress'])
      .order('starts_at', { ascending: true })
      .limit(8),
    supabase
      .from('player_ranking_consolidated')
      .select('total_points, tournaments_played, raw_tier1_points, raw_tier2_points')
      .eq('profile_id', user.id)
      .maybeSingle(),
  ]);

  const profile = profileRes.data as unknown as Profile | null;
  const teamRow = teamRes.data as unknown as { teams: Team | null } | null;
  const team = teamRow?.teams ?? null;
  const communities = (communitiesRes.data ?? []) as unknown as CommunityMem[];
  const tournaments = (tournamentsRes.data ?? []) as unknown as Tournament[];
  const ranking = rankingRes.data as unknown as Ranking | null;

  // Compute "rank position" — simple count of players with more points
  let myRank: number | null = null;
  if (ranking && ranking.total_points > 0) {
    const { count } = await supabase
      .from('player_ranking_consolidated')
      .select('profile_id', { count: 'exact', head: true })
      .gt('total_points', ranking.total_points);
    myRank = (count ?? 0) + 1;
  }

  const nextTournament = tournaments[0] ?? null;
  const otherTournaments = tournaments.slice(1);

  // Inscritos de muestra para avatares (mock — sin query extra de profiles, usamos seeds)
  async function getRegistrationCount(tournamentId: string) {
    const { count } = await supabase
      .from('tournament_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId)
      .eq('status', 'confirmed');
    return count ?? 0;
  }

  const nextTournamentRegCount = nextTournament ? await getRegistrationCount(nextTournament.id) : 0;

  return (
    <div className="space-y-10">
      {/* HERO — nombre gigante con stat-line consolidada */}
      <div>
        <h1 className="font-display text-4xl tracking-tight md:text-5xl">
          {profile?.display_name?.toUpperCase()}
        </h1>
        <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {profile?.skill_category && (
            <span className="text-foreground font-semibold">
              {CATEGORY_LABELS[profile.skill_category]}
            </span>
          )}
          {profile?.city && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3" />
              {profile.city}
            </span>
          )}
          <span aria-hidden>·</span>
          {myRank ? (
            <span>
              <span className="text-foreground font-semibold tabular-nums">#{myRank}</span>{' '}
              nacional
            </span>
          ) : (
            <span>Sin ranking aún</span>
          )}
          <span aria-hidden>·</span>
          <span>
            <span className="tabular-nums">{ranking?.tournaments_played ?? 0}</span> torneos · 12
            meses
          </span>
        </p>
      </div>

      {/* STAT CARDS — KPIs reales con jerarquía visual */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Crown}
          label="Ranking nacional"
          value={ranking?.total_points ?? 0}
          unit="pts"
          hint={
            myRank
              ? `Posición #${myRank} · ${ranking?.tournaments_played ?? 0} torneos`
              : 'Juega tu primer torneo para entrar'
          }
          accent="crown"
        />
        <StatCard
          icon={Sparkles}
          label="ELO individual"
          value={profile?.elo_rating ?? 1000}
          hint={
            (profile?.elo_rating ?? 1000) < 1000
              ? 'Rookie'
              : (profile?.elo_rating ?? 1000) < 1400
                ? 'Intermedio'
                : 'Avanzado'
          }
          accent="data"
        />
        <StatCard
          icon={Trophy}
          label="Tier 1 oficiales"
          value={ranking?.raw_tier1_points ?? 0}
          unit="pts"
          hint="Torneos competitivos · x1.0"
          accent="neutral"
          size="sm"
        />
        <StatCard
          icon={Sparkles}
          label="Tier 2 casuales"
          value={ranking?.raw_tier2_points ?? 0}
          unit="pts"
          hint="Americanos · x0.5"
          accent="neutral"
          size="sm"
        />
      </div>

      {/* HERO TORNEO — el más próximo */}
      {nextTournament ? (
        <Section
          title="Próximo torneo"
          subtitle="Inscríbete o mira quién ya está adentro"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/tournaments">
                Ver todos
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          }
        >
          <Link href={`/tournaments/${nextTournament.slug}`} className="block">
            <Card className="border-gold-400/30 from-gold-400/[0.04] hover:border-gold-400/60 group relative overflow-hidden bg-gradient-to-br to-transparent p-6 transition-all duration-[var(--duration-base)] hover:bg-gold-400/[0.06] md:p-8">
              {/* Decoración esquina */}
              <div className="bg-gold-400/[0.06] absolute -right-12 -top-12 size-48 rounded-full blur-3xl" />

              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <CategoryBadge kind="format" format={nextTournament.format} />
                  {nextTournament.category_kind === 'suma' ||
                  nextTournament.category_kind === 'mixto_suma' ||
                  nextTournament.category_kind === 'queens_suma' ? (
                    <CategoryBadge
                      kind="suma"
                      minSum={nextTournament.min_sum ?? 0}
                      variant={
                        nextTournament.category_kind === 'queens_suma'
                          ? 'queens'
                          : nextTournament.category_kind === 'mixto_suma'
                            ? 'mixto'
                            : 'kings'
                      }
                    />
                  ) : nextTournament.category ? (
                    <CategoryBadge kind="category" category={nextTournament.category} />
                  ) : null}
                  <CategoryBadge
                    kind="tier"
                    tier={nextTournament.tier as 'competitivo' | 'casual'}
                  />
                </div>
                <Countdown target={nextTournament.starts_at} format="words" />
              </div>

              <h3 className="font-display relative mt-4 text-3xl tracking-tight md:text-4xl">
                {nextTournament.name.toUpperCase()}
              </h3>

              <div className="text-muted-foreground relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span className="tabular-nums">
                    {formatDate(nextTournament.starts_at, { weekday: 'short', day: '2-digit', month: 'short' })}
                    {' · '}
                    {formatTime(nextTournament.starts_at)}
                  </span>
                </span>
                {nextTournament.clubs && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {nextTournament.clubs.name} · {nextTournament.clubs.city}
                  </span>
                )}
              </div>

              <div className="border-border/40 relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
                <div className="flex items-center gap-3">
                  <AvatarGroup
                    avatars={Array.from({ length: Math.min(nextTournamentRegCount, 4) }, (_, i) => ({
                      seed: `${nextTournament.id}-${i}`,
                    }))}
                    max={4}
                    size="sm"
                  />
                  <div className="text-sm">
                    <span className="text-foreground font-semibold tabular-nums">
                      {nextTournamentRegCount}
                    </span>
                    <span className="text-muted-foreground">
                      /{nextTournament.max_teams} inscritos
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PriceTag value={nextTournament.price_per_team} size="default" />
                  <Button variant="crown" size="sm">
                    Inscribirme
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            </Card>
          </Link>
        </Section>
      ) : (
        <EmptyState
          icon={Trophy}
          title="No hay torneos abiertos"
          description="Cuando los organizadores publiquen torneos en tu ciudad, los verás aquí."
          primaryAction={
            <Button variant="crown" size="sm" asChild>
              <Link href="/tournaments">Explorar todos</Link>
            </Button>
          }
        />
      )}

      {/* OTROS TORNEOS — grid compacto */}
      {otherTournaments.length > 0 && (
        <Section
          title="Más abiertos · próximos 30 días"
          subtitle={`${otherTournaments.length} torneos disponibles en tu zona`}
        >
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {otherTournaments.slice(0, 6).map((t) => (
              <Link
                key={t.id}
                href={`/tournaments/${t.slug}`}
                className="border-border bg-card hover:border-foreground/20 group relative overflow-hidden rounded-xl border p-4 transition-[border-color,background-color] duration-[var(--duration-base)]"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge kind="tier" tier={t.tier as 'competitivo' | 'casual'} size="sm" />
                  {t.category_kind.includes('suma') ? (
                    <CategoryBadge
                      kind="suma"
                      minSum={t.min_sum ?? 0}
                      variant={t.category_kind === 'queens_suma' ? 'queens' : t.category_kind === 'mixto_suma' ? 'mixto' : 'kings'}
                      size="sm"
                    />
                  ) : t.category ? (
                    <CategoryBadge kind="category" category={t.category} size="sm" />
                  ) : null}
                </div>
                <div className="font-display mt-2 truncate text-sm tracking-tight">
                  {t.name.toUpperCase()}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[10px] uppercase tracking-widest tabular-nums">
                  <Calendar className="size-3" />
                  {formatDate(t.starts_at, { day: '2-digit', month: 'short' })}
                  <span>·</span>
                  <PriceTag value={t.price_per_team} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* COMUNIDADES + EQUIPO */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section
          title="Mis comunidades"
          density="tight"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/communities">
                Ver todas
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          }
        >
          {communities.length === 0 ? (
            <Card className="border-border/60 p-5">
              <p className="text-muted-foreground text-sm">
                No estás en ninguna comunidad aún.
              </p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/app/communities">
                  <Globe className="size-3" />
                  Explorar comunidades
                </Link>
              </Button>
            </Card>
          ) : (
            <div className="space-y-2">
              {communities.slice(0, 3).map((c) =>
                c.communities ? (
                  <Link
                    key={c.community_id}
                    href={`/app/communities/${c.communities.slug}`}
                    className="border-border bg-card hover:border-foreground/30 flex items-center gap-3 rounded-xl border p-3 transition-colors"
                  >
                    <Avatar seed={c.communities.slug} name={c.communities.name} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{c.communities.name}</div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                        {c.communities.city} · Rating {c.communities.rating}
                      </div>
                    </div>
                    <ArrowRight className="text-muted-foreground size-4" />
                  </Link>
                ) : null,
              )}
            </div>
          )}
        </Section>

        <Section
          title={
            <span className="inline-flex items-center gap-2">
              Pareja estable
              <Badge variant="muted" className="text-[9px]">
                Opcional
              </Badge>
            </span>
          }
          density="tight"
          action={
            !team && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/teams/new">
                  <Plus className="size-3" />
                  Registrar
                </Link>
              </Button>
            )
          }
        >
          {team ? (
            <Card className="border-gold-400/30 from-gold-400/[0.04] bg-gradient-to-br to-transparent p-5">
              <div className="flex items-center gap-3">
                <Avatar seed={team.slug} name={team.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="font-display truncate text-base">{team.name}</div>
                  <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                    {team.category ? CATEGORY_LABELS[team.category] : 'Mixto'} · Rating {team.rating}
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="border-border/60 p-5">
              <p className="text-foreground/80 text-sm leading-relaxed">
                ¿Juegas siempre con la misma persona? Registren su pareja para tener ranking de
                equipo además del individual.
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                Si jugás con distintos compañeros, te inscribes ad-hoc cada vez. No necesitas
                equipo formal.
              </p>
            </Card>
          )}
        </Section>
      </div>

      {/* Footer subtle del dashboard */}
      <Crown className="text-crown/[0.03] pointer-events-none fixed bottom-24 right-8 -z-10 hidden size-40 md:block" />
    </div>
  );
}
