import type { TeamRankingOfficialEntry, CommunityRankingEntry, UUID } from '../types';

type TeamRankingEntry = TeamRankingOfficialEntry;

export interface AggregateCommunityInput {
  teamEntries: TeamRankingEntry[];
  topN?: number;
}

/**
 * Ranking de comunidad = suma de los top-N equipos por absolutePoints.
 * Por defecto top-5 (alineado con la view SQL community_ranking_live).
 *
 * Esta función existe principalmente para tests, cálculos offline y
 * previews. En runtime el ranking real se lee de la view en Postgres.
 */
export function aggregateCommunityRanking({
  teamEntries,
  topN = 5,
}: AggregateCommunityInput): CommunityRankingEntry[] {
  const byCommunity = new Map<UUID, TeamRankingEntry[]>();
  for (const entry of teamEntries) {
    const list = byCommunity.get(entry.communityId);
    if (list) list.push(entry);
    else byCommunity.set(entry.communityId, [entry]);
  }

  const result: Omit<CommunityRankingEntry, 'rank'>[] = [];
  for (const [communityId, entries] of byCommunity) {
    const top = [...entries].sort((a, b) => b.absolutePoints - a.absolutePoints).slice(0, topN);
    const totalPoints = top.reduce((acc, t) => acc + t.absolutePoints, 0);
    const avgElo =
      top.length === 0 ? 0 : Math.round(top.reduce((acc, t) => acc + t.eloRating, 0) / top.length);
    const first = top[0];
    result.push({
      communityId,
      communityName: first?.communityName ?? '',
      cityName: first?.cityName ?? null,
      communityPoints: totalPoints,
      avgEloTop5: avgElo,
      activeTeams: entries.length,
    });
  }

  return result
    .sort((a, b) => b.communityPoints - a.communityPoints)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

/**
 * Ranking interno de una comunidad — sus equipos ordenados por puntos.
 * Útil para "tu equipo está #3 dentro de tu comunidad".
 */
export function internalCommunityRanking(
  teamEntries: TeamRankingEntry[],
  communityId: UUID,
): TeamRankingEntry[] {
  return teamEntries
    .filter((t) => t.communityId === communityId)
    .sort((a, b) => b.absolutePoints - a.absolutePoints)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}
