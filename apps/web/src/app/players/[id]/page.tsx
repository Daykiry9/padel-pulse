import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calendar, Crown, Hand, Instagram, MapPin } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { PublicHeader } from '@/components/public-header';
import { SiteFooter } from '@/components/site-footer';
import { CATEGORY_LABELS } from '@padelking/domain';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { getCommunityPlayerRanking } from '@/lib/community-ranking';

const HAND_LABELS: Record<string, string> = {
  right: 'Derecha',
  left: 'Zurda',
};

const POSITION_LABELS: Record<string, string> = {
  drive: 'Drive',
  reves: 'Revés',
  ambos: 'Ambos',
};

// Solo exponemos datos públicos. NO mostramos: phone, birthdate exacta,
// email, marketing_opt_in. Mostramos: nombre, ciudad, categoría, ELO,
// instagram, mano, posición, año empezó.
type PublicProfile = {
  id: string;
  display_name: string;
  city: string | null;
  skill_category: string | null;
  gender: string | null;
  instagram_handle: string | null;
  dominant_hand: string | null;
  favorite_position: string | null;
  playing_since_year: number | null;
  elo_rating: number;
};

type CommunityRankingItem = {
  communityId: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  position: number;
  elo: number;
  totalPlayers: number;
};

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  // profiles_public vista nueva — cast hasta regenerar types tras migración.
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const sb = supabase as any;

  const { data: profileData } = await sb
    .from('profiles_public')
    .select(
      'id, display_name, city, skill_category, gender, instagram_handle, dominant_hand, favorite_position, playing_since_year, elo_rating',
    )
    .eq('id', id)
    .maybeSingle();
  const player = profileData as unknown as PublicProfile | null;
  if (!player) notFound();

  // Comunidades públicas en las que participa el jugador.
  const { data: memberRows } = await sb
    .from('community_members')
    .select('community_id, communities!inner(id, name, slug, logo_url, is_public)')
    .eq('profile_id', id)
    .eq('communities.is_public', true);

  type MemberRow = {
    community_id: string;
    communities: {
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
      is_public: boolean;
    };
  };
  const memberCommunities = ((memberRows ?? []) as MemberRow[]).map((r) => r.communities);

  // Para cada comunidad pública, sacar el ranking interno y la entry del jugador.
  const communityRankings: CommunityRankingItem[] = (
    await Promise.all(
      memberCommunities.map(async (c) => {
        const ranking = await getCommunityPlayerRanking(c.id);
        const idx = ranking.findIndex((e) => e.playerId === id);
        if (idx === -1) return null;
        const entry = ranking[idx]!;
        return {
          communityId: c.id,
          name: c.name,
          slug: c.slug,
          logoUrl: c.logo_url,
          position: idx + 1,
          elo: entry.elo,
          totalPlayers: ranking.length,
        };
      }),
    )
  ).filter((x): x is CommunityRankingItem => x !== null)
    .sort((a, b) => a.position - b.position);

  // Totales de torneos jugados para reliability (cuenta tournament_ids únicos
  // de las registrations del jugador). Reemplaza tournaments_played de la
  // vista consolidada (que removimos).
  const isQueens = player.gender === 'female' && player.skill_category?.startsWith('queens_');
  const yearsPlaying = player.playing_since_year
    ? new Date().getFullYear() - player.playing_since_year
    : null;

  // Players in common: comparten torneos
  type RegRow = {
    tournament_id: string;
    player_one_id: string | null;
    player_two_id: string | null;
    player_id: string | null;
  };
  const { data: myRegsData } = await supabase
    .from('tournament_registrations')
    .select('tournament_id, player_one_id, player_two_id, player_id')
    .or(`player_one_id.eq.${id},player_two_id.eq.${id},player_id.eq.${id}`);
  const myRegs = (myRegsData ?? []) as unknown as RegRow[];
  const myTournamentIds = Array.from(new Set(myRegs.map((r) => r.tournament_id)));

  let playersInCommon: { id: string; name: string; sharedCount: number }[] = [];
  if (myTournamentIds.length > 0) {
    const { data: otherRegsData } = await supabase
      .from('tournament_registrations')
      .select('tournament_id, player_one_id, player_two_id, player_id')
      .in('tournament_id', myTournamentIds);
    const otherRegs = (otherRegsData ?? []) as unknown as RegRow[];

    const counts = new Map<string, Set<string>>();
    for (const r of otherRegs) {
      const ids = [r.player_one_id, r.player_two_id, r.player_id].filter(Boolean) as string[];
      for (const otherId of ids) {
        if (otherId !== id) {
          if (!counts.has(otherId)) counts.set(otherId, new Set());
          counts.get(otherId)!.add(r.tournament_id);
        }
      }
    }
    const topIds = [...counts.entries()]
      .map(([profileId, ts]) => ({ profileId, count: ts.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    if (topIds.length > 0) {
      const { data: names } = await sb
        .from('profiles_public')
        .select('id, display_name')
        .in(
          'id',
          topIds.map((t) => t.profileId),
        );
      const nameMap = new Map(
        ((names ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
      );
      playersInCommon = topIds.map((t) => ({
        id: t.profileId,
        name: nameMap.get(t.profileId) ?? '?',
        sharedCount: t.count,
      }));
    }
  }

  // Reliability del ELO según torneos jugados (derivado de registrations).
  const tournamentsPlayed = myTournamentIds.length;
  const reliability =
    tournamentsPlayed === 0
      ? { level: 'none', label: 'Sin data', pct: 5 }
      : tournamentsPlayed < 3
        ? { level: 'low', label: 'Baja', pct: 25 }
        : tournamentsPlayed < 10
          ? { level: 'medium', label: 'Media', pct: 60 }
          : { level: 'high', label: 'Alta', pct: 95 };

  // Nivel sub-decimal estimado desde ELO (sólo display)
  // 800 → 1.0, 1000 → 2.0, 1200 → 3.0, 1400 → 4.0, etc.
  const elo = player.elo_rating ?? 1000;
  const estimatedLevel = Math.max(1.0, Math.min(7.0, 1.0 + (elo - 800) / 200));

  return (
    <div className={`bg-background min-h-screen ${isQueens ? 'theme-queens' : ''}`}>
      <PublicHeader brand={isQueens ? 'queens' : 'kings'} />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="space-y-2">
          {player.skill_category && (
            <Badge variant={isQueens ? 'queens' : 'crown'}>
              {CATEGORY_LABELS[player.skill_category] ?? player.skill_category}
            </Badge>
          )}
          <h1 className="font-display text-3xl tracking-tight md:text-4xl">
            {player.display_name}
          </h1>
          {player.city && (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <MapPin className="size-3.5" />
              {player.city}
            </p>
          )}
        </div>

        {/* Stats principales */}
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          <Card className={`p-5 ${isQueens ? 'border-queens/30 bg-queens/[0.04]' : 'border-crown/30 bg-crown/[0.04]'}`}>
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              ELO individual
            </div>
            <div className={`font-display mt-1 text-4xl tabular-nums tracking-tight ${isQueens ? 'text-queens' : 'text-crown'}`}>
              {player.elo_rating ?? 1000}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              Nivel estimado{' '}
              <span className="text-foreground font-semibold tabular-nums">
                {estimatedLevel.toFixed(1)}
              </span>{' '}
              ·{' '}
              {(player.elo_rating ?? 1000) < 1000
                ? 'Rookie'
                : (player.elo_rating ?? 1000) < 1400
                  ? 'Intermedio'
                  : 'Avanzado'}
            </div>
            {/* Reliability bar */}
            <div className="border-border/40 mt-3 border-t pt-3">
              <div className="text-muted-foreground flex items-center justify-between text-[10px] uppercase tracking-widest">
                <span>Confianza</span>
                <span
                  className={
                    reliability.level === 'high'
                      ? 'text-success'
                      : reliability.level === 'medium'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }
                >
                  {reliability.label}
                </span>
              </div>
              <div className="bg-muted/40 mt-1.5 h-1 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full ${
                    reliability.level === 'high'
                      ? 'bg-success'
                      : reliability.level === 'medium'
                        ? isQueens
                          ? 'bg-queens'
                          : 'bg-crown'
                        : 'bg-muted-foreground'
                  }`}
                  style={{ width: `${reliability.pct}%` }}
                />
              </div>
              <div className="text-muted-foreground mt-1 text-[10px]">
                {tournamentsPlayed === 0
                  ? 'Sin torneos aún'
                  : `Basado en ${tournamentsPlayed} torneo${tournamentsPlayed === 1 ? '' : 's'}`}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
              Torneos
            </div>
            <div className="font-display mt-1 text-4xl tabular-nums tracking-tight">
              {tournamentsPlayed}
            </div>
            <div className="text-muted-foreground mt-1 text-xs">
              jugados en total
            </div>
          </Card>
        </div>

        {/* Detalles del jugador */}
        <Card className="mt-6 p-6">
          <h2 className="font-display mb-4 text-lg tracking-tight">PERFIL DE JUEGO</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {player.dominant_hand && (
              <DetailRow icon={Hand} label="Mano dominante" value={HAND_LABELS[player.dominant_hand] ?? player.dominant_hand} />
            )}
            {player.favorite_position && (
              <DetailRow icon={Crown} label="Posición preferida" value={POSITION_LABELS[player.favorite_position] ?? player.favorite_position} />
            )}
            {yearsPlaying !== null && (
              <DetailRow icon={Calendar} label="Años jugando" value={`${yearsPlaying} años (desde ${player.playing_since_year})`} />
            )}
            {player.instagram_handle && (
              <DetailRow
                icon={Instagram}
                label="Instagram"
                value={
                  <Link
                    href={`https://instagram.com/${player.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-crown hover:underline"
                  >
                    @{player.instagram_handle}
                  </Link>
                }
              />
            )}
          </dl>
        </Card>

        {/* Ranking en sus comunidades */}
        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg tracking-tight">RANKING EN SUS COMUNIDADES</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Posición y ELO interno en cada comunidad pública.
          </p>
          {communityRankings.length === 0 ? (
            <div className="text-muted-foreground mt-4 rounded-lg border border-dashed border-border/40 px-4 py-6 text-center text-xs">
              Aún no participa en comunidades públicas
            </div>
          ) : (
            <ul className="divide-border/30 mt-4 divide-y">
              {communityRankings.map((c) => (
                <li key={c.communityId}>
                  <Link
                    href={`/app/communities/${c.slug}`}
                    className="focus-card hover:bg-muted/30 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                  >
                    <Avatar
                      seed={c.communityId}
                      name={c.name}
                      src={c.logoUrl ?? undefined}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{c.name}</div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                        #{c.position} de {c.totalPlayers}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-display text-lg tabular-nums ${isQueens ? 'text-queens' : 'text-crown'}`}>
                        {c.elo}
                      </div>
                      <div className="text-muted-foreground text-[10px] uppercase tracking-widest">
                        ELO
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Players in common: compartió torneo con */}
        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg tracking-tight">JUGADORES EN COMÚN</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Los que más torneos ha compartido con este perfil.
          </p>
          {playersInCommon.length === 0 ? (
            <div className="text-muted-foreground mt-4 rounded-lg border border-dashed border-border/40 px-4 py-6 text-center text-xs">
              Aún sin torneos compartidos
            </div>
          ) : (
            <ul className="divide-border/30 mt-4 divide-y">
              {playersInCommon.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/players/${p.id}`}
                    className="focus-card hover:bg-muted/30 -mx-2 flex items-center gap-3 rounded-md px-2 py-2.5 transition-colors"
                  >
                    <Avatar seed={p.id} name={p.name} size="sm" />
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    <span className="text-muted-foreground text-xs uppercase tracking-widest tabular-nums">
                      {p.sharedCount} {p.sharedCount === 1 ? 'torneo' : 'torneos'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="text-muted-foreground mt-8 text-center text-xs">
          Perfil público de PadelKing.{' '}
          <Link href="/app" className="text-crown hover:underline">
            Ver mi ranking
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-muted-foreground flex items-center gap-1.5 text-[10px] uppercase tracking-widest">
        <Icon className="size-3" />
        {label}
      </dt>
      <dd className="mt-1 text-sm">{value}</dd>
    </div>
  );
}
