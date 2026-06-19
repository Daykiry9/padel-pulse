import { describe, expect, it } from 'vitest';

import { resolveMatchScore, setsToWin, formatScoreSummary } from './scoring';
import type { ScoringConfig } from './scoring';

const POINTS: ScoringConfig = { mode: 'points', pointsPerMatch: 24 };
const GAMES: ScoringConfig = { mode: 'games', pointsPerMatch: 9 };
const BO3: ScoringConfig = { mode: 'sets', pointsPerMatch: 12, numSets: 3, gamesPerSet: 6 };
const BO5: ScoringConfig = { mode: 'sets', pointsPerMatch: 12, numSets: 5, gamesPerSet: 6 };

describe('setsToWin', () => {
  it('mejor de N → ceil(N/2)', () => {
    expect(setsToWin(1)).toBe(1);
    expect(setsToWin(3)).toBe(2);
    expect(setsToWin(5)).toBe(3);
  });
});

describe('resolveMatchScore · points/games', () => {
  it('points: gana quien más puntos, margin = diferencia', () => {
    const r = resolveMatchScore(POINTS, { mode: 'points', scoreOne: 24, scoreTwo: 18 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.scoreOne).toBe(24);
    expect(r.resolved.scoreTwo).toBe(18);
    expect(r.resolved.marginGames).toBe(6);
    expect(r.resolved.winner).toBe('one');
    expect(r.resolved.setScores).toBeNull();
  });

  it('games: empate → winner null', () => {
    const r = resolveMatchScore(GAMES, { mode: 'games', scoreOne: 9, scoreTwo: 9 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.winner).toBeNull();
  });

  it('rechaza fuera de rango y no-enteros', () => {
    expect(resolveMatchScore(POINTS, { mode: 'points', scoreOne: 120, scoreTwo: 1 }).ok).toBe(false);
    expect(resolveMatchScore(POINTS, { mode: 'points', scoreOne: 1.5, scoreTwo: 1 }).ok).toBe(false);
  });

  it('rechaza si el modo no coincide con el del torneo', () => {
    const r = resolveMatchScore(POINTS, { mode: 'sets', setScores: [{ one: 6, two: 4 }] });
    expect(r.ok).toBe(false);
  });
});

describe('resolveMatchScore · sets', () => {
  it('mejor de 3, 2-0: deriva sets ganados + margin de games', () => {
    const r = resolveMatchScore(BO3, {
      mode: 'sets',
      setScores: [
        { one: 6, two: 4 },
        { one: 6, two: 3 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.scoreOne).toBe(2);
    expect(r.resolved.scoreTwo).toBe(0);
    expect(r.resolved.marginGames).toBe(Math.abs(12 - 7)); // 5
    expect(r.resolved.winner).toBe('one');
    expect(formatScoreSummary(r.resolved)).toBe('6-4 6-3');
  });

  it('mejor de 3, 2-1: tercer set decide', () => {
    const r = resolveMatchScore(BO3, {
      mode: 'sets',
      setScores: [
        { one: 4, two: 6 },
        { one: 6, two: 3 },
        { one: 7, two: 5 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.scoreOne).toBe(2);
    expect(r.resolved.scoreTwo).toBe(1);
    expect(r.resolved.winner).toBe('one');
    expect(r.resolved.marginGames).toBe(Math.abs(17 - 14)); // 3
  });

  it('rechaza un set empatado', () => {
    const r = resolveMatchScore(BO3, { mode: 'sets', setScores: [{ one: 6, two: 6 }] });
    expect(r.ok).toBe(false);
  });

  it('rechaza array vacío', () => {
    const r = resolveMatchScore(BO3, { mode: 'sets', setScores: [] });
    expect(r.ok).toBe(false);
  });

  it('rechaza más sets que el máximo del torneo', () => {
    const r = resolveMatchScore(BO3, {
      mode: 'sets',
      setScores: [
        { one: 6, two: 1 },
        { one: 6, two: 1 },
        { one: 6, two: 1 },
        { one: 6, two: 1 },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('mejor de 5, 3-1', () => {
    const r = resolveMatchScore(BO5, {
      mode: 'sets',
      setScores: [
        { one: 6, two: 2 },
        { one: 3, two: 6 },
        { one: 6, two: 4 },
        { one: 6, two: 0 },
      ],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.resolved.scoreOne).toBe(3);
    expect(r.resolved.scoreTwo).toBe(1);
    expect(r.resolved.winner).toBe('one');
  });
});
