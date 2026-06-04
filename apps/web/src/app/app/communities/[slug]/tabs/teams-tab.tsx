import Link from 'next/link';
import { Crown, Plus, Users } from 'lucide-react';

import { AvatarGroup } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CategoryBadge } from '@/components/ui/category-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

import { RankingTab } from './ranking-tab';

type SubTab = 'players' | 'teams';

interface TeamsTabProps {
  communityId: string;
  communitySlug: string;
  isMember: boolean;
  isOwner: boolean;
  currentUserId: string;
  sub?: string;
}

type TeamRow = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  rating: number;
};

type TeamMemberRow = {
  team_id: string;
  profile_id: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

type TeamRankRow = {
  team_id: string | null;
  team_name: string | null;
  category: string | null;
  absolute_points: number | null;
  elo_rating: number | null;
  tournaments_played_12mo: number | null;
};

export async function TeamsTab({
  communityId,
  communitySlug,
  isMember,
  isOwner,
  currentUserId,
  sub,
}: TeamsTabProps) {
  const active: SubTab = sub === 'teams' ? 'teams' : 'players';

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl tracking-tight">EQUIPOS</h2>
          <p className="text-muted-foreground mt-1 text-xs uppercase tracking-widest">
            Parejas oficiales registradas en esta comunidad
          </p>
        </div>
        {isMember && (
          <Button variant="outline" size="sm" asChild>
            <Link href={`/app/teams/new?community=${communityId}`}>
              <Plus className="size-3" />
              Crear equipo
            </Link>
          </Button>
        )}
      </div>

      <SubSegment slug={communitySlug} active={active} />

      {active === 'players' ? (
        <RankingTab
          communityId={communityId}
          communitySlug={communitySlug}
          isMember={isMember}
          currentUserId={currentUserId}
        />
      ) : (
        <TeamRankingSection
          communityId={communityId}
          isMember={isMember}
          isOwner={isOwner}
        />
      )}
    </section>
  );
}

function SubSegment({ slug, active }: { slug: string; active: SubTab }) {
  const items: { key: SubTab; label: string }[] = [
    { key: 'players', label: 'Jugadores' },
    { key: 'teams', label: 'Equipos' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Sub-secciones de equipos"
      className="border-border/40 bg-card/40 inline-flex items-center gap-1 rounded-lg border p-1"
    >
      {items.map((it) => {
        const isActive = active === it.key;
        return (
          <Link
            key={it.key}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            href={`/app/communities/${slug}?tab=teams&sub=${it.key}`}
            className={cn(
              'font-display rounded-md px-3 py-1 text-[10px] uppercase tracking-widest transition-colors',
              isActive
                ? 'bg-crown/10 text-crown'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

async function TeamRankingSection({
  communityId,
  isMember,
  isOwner,
}: {
  communityId: string;
  isMember: boolean;
  isOwner: boolean;
}) {
  const supabase = await getSupabaseServerClient();

  const [teamsRes, rankRes] = await Promise.all([
    supabase
      .from('teams')
      .select('id, name, slug, category, rating')
      .eq('primary_community_id', communityId)
      .eq('is_active', true),
    supabase
      .from('team_ranking_official')
      .select(
        'team_id, team_name, category, absolute_points, elo_rating, tournaments_played_12mo',
      )
      .eq('community_id', communityId)
      .order('absolute_points', { ascending: false }),
  ]);

  const teams = (teamsRes.data ?? []) as TeamRow[];
  const ranking = (rankRes.data ?? []) as TeamRankRow[];

  // Miembros por team (para mostrar avatares + nombres). Embedded JOIN a
  // profiles puede venir null por RLS; en ese caso solo mostramos avatar
  // procedural por seed = profile_id (Avatar usa seed siempre).
  const teamIds = teams.map((t) => t.id);
  let teamMembers: TeamMemberRow[] = [];
  if (teamIds.length > 0) {
    const { data: tmData } = await supabase
      .from('team_members')
      .select('team_id, profile_id, profiles:profile_id(display_name, avatar_url)')
      .in('team_id', teamIds)
      .eq('is_active', true);
    teamMembers = (tmData ?? []) as unknown as TeamMemberRow[];
  }
  const membersByTeam = new Map<string, TeamMemberRow[]>();
  for (const m of teamMembers) {
    const arr = membersByTeam.get(m.team_id) ?? [];
    arr.push(m);
    membersByTeam.set(m.team_id, arr);
  }

  // Map team_id -> rank index (1-based)
  const rankByTeam = new Map<string, number>();
  ranking.forEach((r, idx) => {
    if (r.team_id) rankByTeam.set(r.team_id, idx + 1);
  });

  if (teams.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Aun no hay equipos"
        description={
          isMember
            ? 'Crea tu pareja oficial para acumular ranking de equipo en Tier 1.'
            : 'Esta comunidad aun no tiene equipos registrados.'
        }
        bullets={[
          'Una pareja fija que acumula puntos de torneo.',
          'Aparece en el Team Ranking de la comunidad.',
          'Cada quien sigue teniendo su rating individual.',
        ]}
        primaryAction={
          isMember ? (
            <Button asChild>
              <Link href={`/app/teams/new?community=${communityId}`}>
                <Plus className="size-3" />
                Crear el primer equipo
              </Link>
            </Button>
          ) : undefined
        }
      />
    );
  }

  // Orden: primero los rankeados por absolute_points, luego los sin puntos.
  const sortedTeams = [...teams].sort((a, b) => {
    const ra = rankByTeam.get(a.id) ?? Infinity;
    const rb = rankByTeam.get(b.id) ?? Infinity;
    if (ra !== rb) return ra - rb;
    return b.rating - a.rating;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm uppercase tracking-widest">
          Team Ranking · 12m con decaimiento
        </h3>
        <span className="text-muted-foreground text-[10px] uppercase tracking-widest">
          {teams.length} equipos · {ranking.length} con puntos
        </span>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {sortedTeams.map((t) => {
          const rank = rankByTeam.get(t.id);
          const rankEntry = ranking.find((r) => r.team_id === t.id);
          const members = membersByTeam.get(t.id) ?? [];
          return (
            <Card key={t.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {rank && (
                      <span
                        className={cn(
                          'font-display tabular-nums text-base',
                          rank === 1 ? 'text-crown' : 'text-muted-foreground',
                        )}
                      >
                        #{rank}
                      </span>
                    )}
                    <span className="font-display truncate text-sm">{t.name}</span>
                    {rank === 1 && <Crown className="text-crown size-3 shrink-0" />}
                  </div>
                  <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-widest">
                    {t.category ? (
                      <CategoryBadge kind="category" category={t.category} size="sm" />
                    ) : (
                      <span>Mixto</span>
                    )}
                    <span>ELO {rankEntry?.elo_rating ?? t.rating}</span>
                    {rankEntry?.absolute_points != null && rankEntry.absolute_points > 0 && (
                      <span className="text-crown font-display">
                        {rankEntry.absolute_points} pts
                      </span>
                    )}
                    {rankEntry?.tournaments_played_12mo != null && (
                      <span>T {rankEntry.tournaments_played_12mo}</span>
                    )}
                  </div>
                  {members.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <AvatarGroup
                        avatars={members.map((m) => ({
                          seed: m.profile_id,
                          name: m.profiles?.display_name,
                          src: m.profiles?.avatar_url ?? undefined,
                        }))}
                        size="sm"
                        max={2}
                      />
                      <span className="text-muted-foreground truncate text-[10px] uppercase tracking-widest">
                        {members
                          .map((m) => m.profiles?.display_name ?? '?')
                          .join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {ranking.length === 0 && isOwner && (
        <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
          El team ranking se calcula desde puntos otorgados al cierre de torneos.
        </p>
      )}
    </div>
  );
}

