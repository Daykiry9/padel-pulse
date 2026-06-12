import Link from 'next/link';
import {
  ArrowRight,
  Calendar,
  Crown,
  MapPin,
  Plus,
  Trophy,
  Users,
} from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { CategoryBadge } from '@/components/ui/category-badge';
import { Countdown } from '@/components/ui/countdown';
import { Section } from '@/components/ui/section';

import { CommunitySwitcher } from '@/components/community-switcher';
import { ShareInviteButton } from '@/components/share-invite-button';
import { formatDate, formatTime } from '@/lib/format-date';
import { getCommunityPlayerRanking } from '@/lib/community-ranking';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { UserCommunity } from '@/lib/active-community';

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

interface CommunityHubHomeProps {
  user: User;
  activeCommunity: UserCommunity;
  allCommunities: UserCommunity[];
  profile?: { display_name: string | null } | null;
}

/**
 * HUB principal: muestra la comunidad activa del usuario como Home.
 *
 * Sections:
 *  a) Header sticky con avatar + CommunitySwitcher.
 *  b) Próximo torneo de la comunidad (cupos + CTA) o empty state.
 *  c) Mi posición en el ranking interno (ELO + posición).
 *  d) Top 5 preview del ranking de la comunidad.
 *  e) Quick actions: Crear torneo (si owner), Invitar, Ver todos.
 */
export async function CommunityHubHome({
  user,
  activeCommunity,
  allCommunities,
}: CommunityHubHomeProps) {
  const supabase = await getSupabaseServerClient();

  const [nextTournamentRes, ownerCheckRes, ranking] = await Promise.all([
    supabase
      .from('tournaments')
      .select(
        'id, name, slug, format, status, starts_at, category, category_kind, min_sum, tier, max_teams, price_per_team, clubs(name, city)',
      )
      .eq('community_id', activeCommunity.id)
      .in('status', ['open', 'in_progress'])
      .order('starts_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('communities')
      .select('owner_id')
      .eq('id', activeCommunity.id)
      .maybeSingle(),
    getCommunityPlayerRanking(supabase, activeCommunity.id),
  ]);

  const nextTournament = nextTournamentRes.data as unknown as Tournament | null;
  const isOwner =
    (ownerCheckRes.data as { owner_id: string } | null)?.owner_id === user.id;

  // Cupos del próximo torneo (confirmed registrations).
  let confirmedCount = 0;
  if (nextTournament) {
    const { count } = await supabase
      .from('tournament_registrations')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', nextTournament.id)
      .eq('status', 'confirmed');
    confirmedCount = count ?? 0;
  }

  const myRankingEntry = ranking.find((r) => r.playerId === user.id) ?? null;
  const myRankingPosition = myRankingEntry
    ? ranking.findIndex((r) => r.playerId === user.id) + 1
    : null;
  const top5 = ranking.slice(0, 5);

  return (
    <div className="space-y-10">
      {/* HEADER STICKY — avatar comunidad activa + switcher */}
      <header className="bg-background/85 supports-[backdrop-filter]:bg-background/65 border-border/40 sticky top-16 z-30 -mx-6 flex items-center justify-between gap-3 border-b px-6 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          {allCommunities.length >= 2 ? (
            <CommunitySwitcher
              communities={allCommunities.map((c) => ({
                id: c.id,
                name: c.name,
                slug: c.slug,
                logoUrl: c.logoUrl,
              }))}
              activeCommunityId={activeCommunity.id}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Avatar
                seed={activeCommunity.id}
                name={activeCommunity.name}
                src={activeCommunity.logoUrl ?? null}
                size="default"
              />
              <span className="font-display max-w-[180px] truncate text-base tracking-tight">
                {activeCommunity.name}
              </span>
            </div>
          )}
          {isOwner && (
            <Badge variant="crown" className="hidden text-[10px] sm:inline-flex">
              <Crown className="size-3" />
              Owner
            </Badge>
          )}
        </div>

        <Button variant="ghost" size="sm" asChild>
          <Link href={`/app/communities/${activeCommunity.slug}`}>
            Ver todos
            <ArrowRight className="size-3" />
          </Link>
        </Button>
      </header>

      {/* B) PRÓXIMO TORNEO INTERNO */}
      <Section
        title="Próximo torneo"
        subtitle="Lo que se viene en tu comunidad"
        density="tight"
      >
        {nextTournament ? (
          <Link
            href={`/tournaments/${nextTournament.slug}`}
            className="focus-card block rounded-xl transition-transform duration-[120ms] [transition-timing-function:var(--ease-press)] active:scale-[0.99]"
          >
            <Card className="border-crown/30 from-crown/[0.04] hover:border-crown/60 group relative overflow-hidden bg-gradient-to-br to-transparent p-6 md:p-8">
              <div className="bg-crown/[0.06] absolute -right-12 -top-12 size-48 rounded-full blur-3xl" />

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
                {nextTournament.name}
              </h3>

              <div className="text-muted-foreground relative mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  <span className="tabular-nums">
                    {formatDate(nextTournament.starts_at, {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}
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
                <span className="text-muted-foreground text-xs uppercase tracking-widest tabular-nums">
                  {confirmedCount}/{nextTournament.max_teams} inscritos
                </span>
                <span className={buttonVariants({ variant: 'crown', size: 'sm' })}>
                  Ver torneo
                  <ArrowRight className="size-3" />
                </span>
              </div>
            </Card>
          </Link>
        ) : (
          <Card className="border-border/60 p-6">
            <div className="flex items-start gap-3">
              <div className="bg-muted text-muted-foreground rounded-full p-2">
                <Trophy className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base">
                  Aún no hay torneos en esta comunidad
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {isOwner
                    ? 'Arma el primer torneo de tu comunidad: abre inscripciones y juega.'
                    : 'Avisa al organizador para que arme el primero.'}
                </p>
                {isOwner && (
                  <Button variant="crown" size="sm" className="mt-4" asChild>
                    <Link
                      href={`/app/tournaments/new?community=${activeCommunity.id}`}
                    >
                      <Plus className="size-3" />
                      Crear torneo
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </Section>

      {/* C) MI POSICIÓN EN EL RANKING INTERNO */}
      <Section title="Mi posición" density="tight">
        <Card className="border-border/60 p-5">
          {myRankingEntry && myRankingPosition ? (
            <div className="flex items-center gap-4">
              <div className="bg-crown/15 text-crown flex size-12 shrink-0 items-center justify-center rounded-xl">
                <span className="font-display text-xl tabular-nums">
                  #{myRankingPosition}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base tracking-tight">
                  {myRankingEntry.name}
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs uppercase tracking-widest tabular-nums">
                  <span>ELO {myRankingEntry.elo}</span>
                  <span aria-hidden>·</span>
                  <span>{myRankingEntry.matches} PJ</span>
                  <span aria-hidden>·</span>
                  <span>{myRankingEntry.wins} W</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <div className="bg-muted text-muted-foreground rounded-full p-2">
                <Crown className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base">
                  Aún no tienes ranking en esta comunidad
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Juega tu primer torneo para entrar al ranking interno.
                </p>
              </div>
            </div>
          )}
        </Card>
      </Section>

      {/* D) TOP 5 PREVIEW DEL RANKING */}
      {top5.length > 0 && (
        <Section
          title="Top 5 de la comunidad"
          density="tight"
          action={
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/app/communities/${activeCommunity.slug}`}>
                Ver ranking
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          }
        >
          <Card className="divide-border/30 divide-y overflow-hidden p-0">
            {top5.map((r, idx) => {
              const isMe = r.playerId === user.id;
              return (
                <div
                  key={r.playerId}
                  className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm ${
                    idx === 0 ? 'bg-crown/[0.04]' : ''
                  } ${isMe ? 'bg-crown/[0.06]' : ''}`}
                >
                  <span
                    className={`font-display text-base tabular-nums ${
                      idx === 0 ? 'text-crown' : 'text-muted-foreground'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {idx === 0 && (
                      <Crown className="text-crown size-3 shrink-0" />
                    )}
                    <span className="truncate">{r.name}</span>
                    {isMe && (
                      <Badge variant="muted" className="text-[9px]">
                        Tú
                      </Badge>
                    )}
                  </span>
                  <span className="font-display tabular-nums">{r.elo}</span>
                </div>
              );
            })}
          </Card>
        </Section>
      )}

      {/* E) QUICK ACTIONS */}
      <Section title="Acciones rápidas" density="tight">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {isOwner && (
            <Button variant="crown" asChild className="h-12 justify-start">
              <Link href={`/app/tournaments/new?community=${activeCommunity.id}`}>
                <Plus className="size-4" />
                Crear torneo
              </Link>
            </Button>
          )}
          <ShareInviteButton
            kind="community"
            targetId={activeCommunity.id}
            name={activeCommunity.name}
            label="Invitar"
            variant="outline"
            size="default"
          />
          <Button variant="outline" asChild className="h-12 justify-start">
            <Link href={`/app/communities/${activeCommunity.slug}`}>
              <Users className="size-4" />
              Ver todos
            </Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}
