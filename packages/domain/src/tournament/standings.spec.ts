import { describe, expect, it } from 'vitest';

import { computeAmericanoStandings } from './standings';

describe('computeAmericanoStandings', () => {
  it('suma los puntos de la pareja de cada jugador en cada partido', () => {
    const standings = computeAmericanoStandings([
      {
        pairOnePlayerOneId: 'a',
        pairOnePlayerTwoId: 'b',
        pairTwoPlayerOneId: 'c',
        pairTwoPlayerTwoId: 'd',
        scoreOne: 8,
        scoreTwo: 4,
      },
      {
        pairOnePlayerOneId: 'a',
        pairOnePlayerTwoId: 'c',
        pairTwoPlayerOneId: 'b',
        pairTwoPlayerTwoId: 'd',
        scoreOne: 7,
        scoreTwo: 5,
      },
    ]);
    const byId = new Map(standings.map((s) => [s.playerId, s]));
    expect(byId.get('a')!.points).toBe(15); // 8 + 7
    expect(byId.get('b')!.points).toBe(13); // 8 + 5
    expect(byId.get('c')!.points).toBe(11); // 4 + 7
    expect(byId.get('d')!.points).toBe(9); // 4 + 5
    // Gana quien más suma → 'a' primero, rank 1.
    expect(standings[0]!.playerId).toBe('a');
    expect(standings[0]!.rank).toBe(1);
  });

  it('cuenta partidos jugados, ganados y la diferencia', () => {
    const s = computeAmericanoStandings([
      {
        pairOnePlayerOneId: 'a',
        pairOnePlayerTwoId: 'b',
        pairTwoPlayerOneId: 'c',
        pairTwoPlayerTwoId: 'd',
        scoreOne: 8,
        scoreTwo: 4,
      },
    ]);
    const a = s.find((x) => x.playerId === 'a')!;
    expect(a.played).toBe(1);
    expect(a.wins).toBe(1);
    expect(a.diff).toBe(4);
    const c = s.find((x) => x.playerId === 'c')!;
    expect(c.wins).toBe(0);
    expect(c.diff).toBe(-4);
  });

  it('incluye jugadores sin partidos cuando se pasan en allPlayerIds', () => {
    const s = computeAmericanoStandings([], ['x', 'y']);
    expect(s).toHaveLength(2);
    expect(s[0]!.points).toBe(0);
    expect(s[0]!.played).toBe(0);
  });
});
