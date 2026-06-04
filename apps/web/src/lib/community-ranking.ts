import { unstable_cache } from 'next/cache';

import { computePaddleEloDeltas } from '@padelking/domain';

import { getServiceRoleClient } from './supabase/admin';
import type { ServerSupabase } from './supabase/server';

export interface CommunityRankingEntry {
  playerId: string;
  name: string;
  elo: number;
  tournaments: number;
  matches: number;
  wins: number;
}

export interface CommunityTeamRankingEntry {
  teamId: string;
  name: string;
  logoUrl: string | null;
  totalPoints: number;
  tournaments: number;
  bestPosition: number | null;
}

type MatchRow = {
  tournament_id: string;
  ended_at: string | null;
  created_at: string;
  score_one: number | null;
  score_two: number | null;
  registration_one_id: string | null;
  registration_two_id: string | null;
  pair_one_player_one_id: string | null;
  pair_one_player_two_id: string | null;
  pair_two_player_one_id: string | null;
  pair_two_player_two_id: string | null;
};
type RegRow = {
  id: string;
  team_id: string | null;
  player_one_id: string | null;
  player_two_id: string | null;
  player_id: string | null;
};

const START_ELO = 1000;
const K = 24; // casual/comunidad: movimiento moderado por partido

// Tag builders — exportados para que server actions invaliden con el mismo formato.
export const playerRankingTag = (communityId: string) =>
  `community-ranking-${communityId}`;
export const teamRankingTag = (communityId: string) =>
  `community-team-ranking-${communityId}`;

/**
 * Implementación interna del ranking por ELO. Recibe supabase (server o admin)
 * y NO cachea — el caller decide la estrategia. Útil cuando ya hay un
 * supabase client a mano (tests, server actions) sin pagar otra creación.
 */
export async function computeCommunityPlayerRanking(
  supabase: ServerSupabase,
  communityId: string,
): Promise<CommunityRankingEntry[]> {
  const { data: tData } = await supabase
    .from('tournaments')
    .select('id')
    .eq('community_id', communityId);
  const tIds = ((tData ?? []) as { id: string }[]).map((t) => t.id);
  if (!tIds.length) return [];

  const { data: mData } = await supabase
    .from('matches')
    .select(
      'tournament_id, ended_at, created_at, score_one, score_two, registration_one_id, registration_two_id, pair_one_player_one_id, pair_one_player_two_id, pair_two_player_one_id, pair_two_player_two_id',
    )
    .in('tournament_id', tIds)
    .eq('status', 'completed');
  const matches = (mData ?? []) as MatchRow[];
  if (!matches.length) return [];

  // Orden cronológico (por cuándo se cerró el partido) para un ELO coherente.
  matches.sort(
    (a, b) =>
      new Date(a.ended_at ?? a.created_at).getTime() -
      new Date(b.ended_at ?? b.created_at).getTime(),
  );

  // Resolver inscripción → jugadores (partidos de formato fijo).
  const regIds = [
    ...new Set(
      matches.flatMap((m) => [m.registration_one_id, m.registration_two_id]).filter(Boolean) as string[],
    ),
  ];
  const regPlayers = new Map<string, string[]>();
  if (regIds.length) {
    const { data: regData } = await supabase
      .from('tournament_registrations')
      .select('id, team_id, player_one_id, player_two_id, player_id')
      .in('id', regIds);
    const regs = (regData ?? []) as RegRow[];
    const teamIds = [...new Set(regs.map((r) => r.team_id).filter(Boolean) as string[])];
    const teamPlayers = new Map<string, string[]>();
    if (teamIds.length) {
      const { data: tmData } = await supabase
        .from('team_members')
        .select('team_id, profile_id')
        .in('team_id', teamIds)
        .eq('is_active', true);
      for (const row of (tmData ?? []) as { team_id: string; profile_id: string }[]) {
        const arr = teamPlayers.get(row.team_id) ?? [];
        arr.push(row.profile_id);
        teamPlayers.set(row.team_id, arr);
      }
    }
    for (const r of regs) {
      let ps: string[] = [];
      if (r.team_id && teamPlayers.has(r.team_id)) ps = teamPlayers.get(r.team_id)!;
      else ps = [r.player_one_id, r.player_two_id, r.player_id].filter(Boolean) as string[];
      regPlayers.set(r.id, ps);
    }
  }

  const sidePlayers = (m: MatchRow, side: 'one' | 'two'): string[] => {
    if (side === 'one') {
      if (m.pair_one_player_one_id) {
        return [m.pair_one_player_one_id, m.pair_one_player_two_id].filter(Boolean) as string[];
      }
      return m.registration_one_id ? (regPlayers.get(m.registration_one_id) ?? []) : [];
    }
    if (m.pair_two_player_one_id) {
      return [m.pair_two_player_one_id, m.pair_two_player_two_id].filter(Boolean) as string[];
    }
    return m.registration_two_id ? (regPlayers.get(m.registration_two_id) ?? []) : [];
  };

  const elo = new Map<string, number>();
  const getElo = (id: string) => elo.get(id) ?? START_ELO;
  const stats = new Map<string, { tournaments: Set<string>; matches: number; wins: number }>();
  const ensureStats = (id: string) => {
    let s = stats.get(id);
    if (!s) {
      s = { tournaments: new Set<string>(), matches: 0, wins: 0 };
      stats.set(id, s);
    }
    return s;
  };

  for (const m of matches) {
    const one = sidePlayers(m, 'one');
    const two = sidePlayers(m, 'two');
    if (!one.length || !two.length) continue;
    const s1 = m.score_one ?? 0;
    const s2 = m.score_two ?? 0;

    const { deltaOne, deltaTwo } = computePaddleEloDeltas({
      pairOne: { p1: getElo(one[0]!), p2: getElo(one[1] ?? one[0]!) },
      pairTwo: { p1: getElo(two[0]!), p2: getElo(two[1] ?? two[0]!) },
      scoreOne: s1,
      scoreTwo: s2,
      k: K,
    });

    for (const p of one) {
      elo.set(p, getElo(p) + deltaOne);
      const st = ensureStats(p);
      st.tournaments.add(m.tournament_id);
      st.matches += 1;
      if (s1 > s2) st.wins += 1;
    }
    for (const p of two) {
      elo.set(p, getElo(p) + deltaTwo);
      const st = ensureStats(p);
      st.tournaments.add(m.tournament_id);
      st.matches += 1;
      if (s2 > s1) st.wins += 1;
    }
  }

  const ids = [...stats.keys()];
  if (!ids.length) return [];
  const { data: profData } = await supabase
    .from('profiles')
    .select('id, display_name')
    .in('id', ids);
  const nameMap = new Map(
    ((profData ?? []) as { id: string; display_name: string }[]).map((p) => [p.id, p.display_name]),
  );

  return ids
    .map((id) => ({
      playerId: id,
      name: nameMap.get(id) ?? '?',
      elo: Math.round(getElo(id)),
      tournaments: stats.get(id)!.tournaments.size,
      matches: stats.get(id)!.matches,
      wins: stats.get(id)!.wins,
    }))
    .sort((a, b) => b.elo - a.elo || b.wins - a.wins)
    .slice(0, 20);
}

/**
 * Ranking interno de la comunidad por ELO. Cacheado cross-request con
 * `unstable_cache` (tag `community-ranking-<id>`, revalidate 5 min). Los datos
 * son públicos a nivel comunidad, así que usamos service-role internamente —
 * `unstable_cache` corre fuera del contexto de request y no puede leer cookies.
 *
 * Invalidar tras cerrar matches: `revalidateTag(playerRankingTag(communityId))`.
 *
 * Firma compatible — el primer arg (supabase) es opcional y se ignora; queda
 * por backwards-compat con call sites que ya lo pasaban.
 */
export async function getCommunityPlayerRanking(
  _supabaseOrCommunityId: ServerSupabase | string,
  maybeCommunityId?: string,
): Promise<CommunityRankingEntry[]> {
  const communityId =
    typeof _supabaseOrCommunityId === 'string'
      ? _supabaseOrCommunityId
      : (maybeCommunityId as string);
  return getCachedPlayerRanking(communityId);
}

const getCachedPlayerRanking = (communityId: string) =>
  unstable_cache(
    async (id: string) => {
      const admin = getServiceRoleClient() as unknown as ServerSupabase;
      return computeCommunityPlayerRanking(admin, id);
    },
    ['community-player-ranking', communityId],
    {
      tags: [playerRankingTag(communityId)],
      revalidate: 300,
    },
  )(communityId);

/**
 * Ranking oficial de equipos de la comunidad (últimos 12 meses).
 * Lee `team_points` (snapshots cerrados por torneo) y agrega por team_id.
 * Cacheado con tag `community-team-ranking-<id>`, revalidate 5 min.
 */
export async function getCommunityTeamRanking(
  communityId: string,
): Promise<CommunityTeamRankingEntry[]> {
  return getCachedTeamRanking(communityId);
}

const getCachedTeamRanking = (communityId: string) =>
  unstable_cache(
    async (id: string) => computeCommunityTeamRanking(id),
    ['community-team-ranking', communityId],
    {
      tags: [teamRankingTag(communityId)],
      revalidate: 300,
    },
  )(communityId);

async function computeCommunityTeamRanking(
  communityId: string,
): Promise<CommunityTeamRankingEntry[]> {
  const admin = getServiceRoleClient();
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 12);
  const cutoff = cutoffDate.toISOString();

  const { data: pointsData } = await admin
    .from('team_points')
    .select('team_id, points, position, tournament_id, awarded_at')
    .eq('community_id', communityId)
    .gte('awarded_at', cutoff);

  const points = (pointsData ?? []) as {
    team_id: string;
    points: number;
    position: number;
    tournament_id: string;
    awarded_at: string;
  }[];
  if (!points.length) return [];

  // Agregar por team_id: suma de puntos, set de torneos, mejor posición.
  const byTeam = new Map<
    string,
    { totalPoints: number; tournaments: Set<string>; bestPosition: number }
  >();
  for (const p of points) {
    const cur = byTeam.get(p.team_id);
    if (!cur) {
      byTeam.set(p.team_id, {
        totalPoints: p.points,
        tournaments: new Set([p.tournament_id]),
        bestPosition: p.position,
      });
    } else {
      cur.totalPoints += p.points;
      cur.tournaments.add(p.tournament_id);
      if (p.position < cur.bestPosition) cur.bestPosition = p.position;
    }
  }

  const teamIds = [...byTeam.keys()];
  if (!teamIds.length) return [];

  const { data: teamsData } = await admin
    .from('teams')
    .select('id, name, logo_url')
    .in('id', teamIds);
  const teamMap = new Map(
    ((teamsData ?? []) as { id: string; name: string; logo_url: string | null }[]).map((t) => [
      t.id,
      t,
    ]),
  );

  return teamIds
    .map((id) => {
      const agg = byTeam.get(id)!;
      const team = teamMap.get(id);
      return {
        teamId: id,
        name: team?.name ?? '?',
        logoUrl: team?.logo_url ?? null,
        totalPoints: agg.totalPoints,
        tournaments: agg.tournaments.size,
        bestPosition: agg.bestPosition,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || (a.bestPosition ?? 99) - (b.bestPosition ?? 99));
}
