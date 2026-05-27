import type { UUID } from '../types';

export interface AmericanoMatchResult {
  pairOnePlayerOneId: UUID;
  pairOnePlayerTwoId: UUID;
  pairTwoPlayerOneId: UUID;
  pairTwoPlayerTwoId: UUID;
  scoreOne: number;
  scoreTwo: number;
}

export interface AmericanoStanding {
  rank: number;
  playerId: UUID;
  points: number; // puntos a favor acumulados
  pointsAgainst: number;
  diff: number; // points - pointsAgainst
  played: number;
  wins: number;
}

/**
 * Tabla de posiciones de un Americano Random (social). Cada jugador acumula
 * los puntos que hizo su pareja en cada partido jugado. Gana quien más suma;
 * desempata por diferencia de puntos y luego por partidos ganados.
 *
 * `allPlayerIds` (opcional) asegura que los jugadores sin partidos todavía
 * aparezcan en la tabla con 0.
 */
export function computeAmericanoStandings(
  matches: AmericanoMatchResult[],
  allPlayerIds: UUID[] = [],
): AmericanoStanding[] {
  const acc = new Map<UUID, { points: number; pointsAgainst: number; played: number; wins: number }>();
  const ensure = (id: UUID) => {
    let e = acc.get(id);
    if (!e) {
      e = { points: 0, pointsAgainst: 0, played: 0, wins: 0 };
      acc.set(id, e);
    }
    return e;
  };

  for (const id of allPlayerIds) ensure(id);

  for (const m of matches) {
    const oneWon = m.scoreOne > m.scoreTwo;
    const twoWon = m.scoreTwo > m.scoreOne;
    for (const id of [m.pairOnePlayerOneId, m.pairOnePlayerTwoId]) {
      const e = ensure(id);
      e.points += m.scoreOne;
      e.pointsAgainst += m.scoreTwo;
      e.played += 1;
      if (oneWon) e.wins += 1;
    }
    for (const id of [m.pairTwoPlayerOneId, m.pairTwoPlayerTwoId]) {
      const e = ensure(id);
      e.points += m.scoreTwo;
      e.pointsAgainst += m.scoreOne;
      e.played += 1;
      if (twoWon) e.wins += 1;
    }
  }

  const rows = [...acc.entries()].map(([playerId, e]) => ({
    playerId,
    points: e.points,
    pointsAgainst: e.pointsAgainst,
    diff: e.points - e.pointsAgainst,
    played: e.played,
    wins: e.wins,
  }));

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.wins !== a.wins) return b.wins - a.wins;
    return a.playerId < b.playerId ? -1 : 1;
  });

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}
