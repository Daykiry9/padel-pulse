import Link from 'next/link';
import { ArrowRight, Calendar, Crown, MapPin, Plus, Trophy } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { buttonVariants } from '@/components/ui/button-variants';
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
 *  c) Ranking de la comunidad: top 5, con tu fila añadida abajo solo si
 *     quedaste fuera del top.
 *  d) Acciones: Crear torneo (si owner) e Invitar.
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

      {/* C) RANKING DE LA COMUNIDAD — top 5 y tu posición en la misma tarjeta.
          Antes eran dos secciones separadas, "Mi posición" y "Top 5", que
          mostraban el mismo ranking dos veces: leías tu ELO arriba y volvías a
          buscarte abajo. Ahora el top vive junto a tu fila, que solo se agrega
          cuando quedas fuera del top 5 — si ya estás dentro, resaltada basta. */}
      <Section
        title="Ranking de la comunidad"
        density="tight"
        action={
          top5.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/app/communities/${activeCommunity.slug}`}>
                Ver ranking
                <ArrowRight className="size-3" />
              </Link>
            </Button>
          )
        }
      >
        {top5.length > 0 ? (
          <Card className="divide-border/30 divide-y overflow-hidden p-0">
            {top5.map((r, idx) => (
              <RankRow
                key={r.playerId}
                position={idx + 1}
                name={r.name}
                elo={r.elo}
                isMe={r.playerId === user.id}
                isLeader={idx === 0}
              />
            ))}

            {myRankingEntry && myRankingPosition && myRankingPosition > 5 && (
              <RankRow
                position={myRankingPosition}
                name={myRankingEntry.name}
                elo={myRankingEntry.elo}
                isMe
                detail={`${myRankingEntry.matches} PJ · ${myRankingEntry.wins} W`}
              />
            )}

            {!myRankingEntry && (
              <p className="text-muted-foreground px-4 py-3 text-xs leading-relaxed">
                Todavía no estás en el ranking. Juega tu primer torneo para
                entrar.
              </p>
            )}
          </Card>
        ) : (
          <Card className="border-border/60 p-6">
            <div className="flex items-start gap-3">
              <div className="bg-muted text-muted-foreground rounded-full p-2">
                <Crown className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base">
                  Esta comunidad todavía no tiene ranking
                </div>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  El ranking se construye con cada partido jugado. Cuando se
                  juegue el primer torneo, aparece acá.
                </p>
              </div>
            </div>
          </Card>
        )}
      </Section>

      {/* D) ACCIONES. Se quitó el botón "Ver todos": llevaba a la misma
          comunidad que el enlace del header y que "Ver ranking" del bloque de
          arriba. Tres accesos al mismo destino en una pantalla. */}
      <Section title="Acciones" density="tight">
        <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      </Section>
    </div>
  );
}

/**
 * Una fila del ranking. Se usa para el top 5 y para la fila propia cuando el
 * usuario queda fuera de él, así ambas se ven idénticas y no hay dos maneras
 * de dibujar lo mismo.
 */
function RankRow({
  position,
  name,
  elo,
  isMe = false,
  isLeader = false,
  detail,
}: {
  position: number;
  name: string;
  elo: number;
  isMe?: boolean;
  isLeader?: boolean;
  detail?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[2rem_1fr_auto] items-center gap-3 px-4 py-2.5 text-sm ${
        isMe ? 'bg-crown/[0.06]' : isLeader ? 'bg-crown/[0.04]' : ''
      }`}
    >
      <span
        className={`font-display text-base tabular-nums ${
          isLeader ? 'text-crown' : 'text-muted-foreground'
        }`}
      >
        {position}
      </span>
      <span className="flex min-w-0 items-center gap-2">
        {isLeader && <Crown className="text-crown size-3 shrink-0" />}
        <span className="truncate">{name}</span>
        {isMe && (
          <Badge variant="muted" className="shrink-0 text-[9px]">
            Tú
          </Badge>
        )}
        {detail && (
          <span className="text-muted-foreground shrink-0 text-[10px] uppercase tracking-widest tabular-nums">
            {detail}
          </span>
        )}
      </span>
      <span className="font-display tabular-nums">{elo}</span>
    </div>
  );
}
