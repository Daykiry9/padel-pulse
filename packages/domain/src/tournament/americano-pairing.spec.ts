import { describe, expect, it } from 'vitest';

import {
  generateFixedAmericano,
  generateRandomAmericano,
} from './americano-pairing';

/**
 * Casos del super-prompt v2 sección 4.2:
 *   6 jugadores 1 cancha (rotación con descanso)
 *   8 jugadores 2 canchas (todos juegan cada ronda)
 *   9 jugadores 2 canchas (1 descansa por ronda)
 *   12 jugadores 3 canchas (todos juegan cada ronda)
 *   14 jugadores 2 canchas (cola larga de descansos)
 */

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`);
}

describe('generateRandomAmericano', () => {
  it('6 jugadores 1 cancha: cada ronda 4 juegan, 2 descansan, distribución pareja', () => {
    const rounds = generateRandomAmericano({ participantIds: ids(6), courts: 1, rounds: 6 });
    expect(rounds).toHaveLength(6);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(1);
      expect(r.resting).toHaveLength(2);
    }
    // Cada jugador debe descansar aproximadamente igual (6 rondas × 2 resting / 6 jugadores = 2 descansos c/u)
    const restCount = new Map<string, number>();
    for (const r of rounds) for (const id of r.resting) restCount.set(id, (restCount.get(id) ?? 0) + 1);
    const counts = [...restCount.values()];
    const max = Math.max(...counts);
    const min = Math.min(...counts);
    expect(max - min).toBeLessThanOrEqual(1);
  });

  it('8 jugadores 2 canchas: todos juegan cada ronda, nadie descansa', () => {
    const rounds = generateRandomAmericano({ participantIds: ids(8), courts: 2, rounds: 7 });
    expect(rounds).toHaveLength(7);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.resting).toHaveLength(0);
    }
  });

  it('9 jugadores 2 canchas: 1 descansa por ronda, rota equitativamente', () => {
    const rounds = generateRandomAmericano({ participantIds: ids(9), courts: 2, rounds: 9 });
    expect(rounds).toHaveLength(9);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.resting).toHaveLength(1);
    }
    const restCount = new Map<string, number>();
    for (const r of rounds) for (const id of r.resting) restCount.set(id, (restCount.get(id) ?? 0) + 1);
    const counts = [...restCount.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('12 jugadores 3 canchas: todos juegan, sin descansos', () => {
    const rounds = generateRandomAmericano({ participantIds: ids(12), courts: 3, rounds: 7 });
    expect(rounds).toHaveLength(7);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(3);
      expect(r.resting).toHaveLength(0);
    }
  });

  it('14 jugadores 2 canchas: 8 juegan, 6 descansan, cola larga rotativa', () => {
    const rounds = generateRandomAmericano({ participantIds: ids(14), courts: 2, rounds: 14 });
    expect(rounds).toHaveLength(14);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
      expect(r.resting).toHaveLength(6);
    }
    const restCount = new Map<string, number>();
    for (const r of rounds) for (const id of r.resting) restCount.set(id, (restCount.get(id) ?? 0) + 1);
    const counts = [...restCount.values()];
    expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
  });

  it('cada ronda no repite jugadores en distintas canchas', () => {
    const rounds = generateRandomAmericano({ participantIds: ids(12), courts: 3, rounds: 5 });
    for (const r of rounds) {
      const seen = new Set<string>();
      for (const m of r.matches) {
        for (const id of [
          m.pairOne.playerOneId,
          m.pairOne.playerTwoId,
          m.pairTwo.playerOneId,
          m.pairTwo.playerTwoId,
        ]) {
          expect(seen.has(id)).toBe(false);
          seen.add(id);
        }
      }
    }
  });
});

describe('generateFixedAmericano', () => {
  it('round-robin de 8 parejas: 7 rondas, todos enfrentan a todos', () => {
    const rounds = generateFixedAmericano({ participantIds: ids(8), courts: 4 });
    expect(rounds).toHaveLength(7);
    // Contar enfrentamientos
    const matchupCount = new Map<string, number>();
    for (const r of rounds) {
      for (const m of r.matches) {
        const key = [m.pairOne.playerOneId, m.pairTwo.playerOneId].sort().join('|');
        matchupCount.set(key, (matchupCount.get(key) ?? 0) + 1);
      }
    }
    // C(8,2) = 28 enfrentamientos únicos, cada uno una vez
    expect(matchupCount.size).toBe(28);
    for (const count of matchupCount.values()) {
      expect(count).toBe(1);
    }
  });

  it('parejas impares: aplica BYE y todos descansan eventualmente', () => {
    const rounds = generateFixedAmericano({ participantIds: ids(5), courts: 2 });
    const restCount = new Map<string, number>();
    for (const r of rounds) for (const id of r.resting) restCount.set(id, (restCount.get(id) ?? 0) + 1);
    // Con 5 parejas y BYE, cada una descansa 1 vez
    for (const count of restCount.values()) {
      expect(count).toBe(1);
    }
    expect(restCount.size).toBe(5);
  });

  // Round-robin COMPLETO con cualquier nº de canchas: cada pareja enfrenta a
  // cada otra exactamente una vez, sin repetir y sin dejar partidos sin jugar.
  it.each([
    [4, 1],
    [4, 2],
    [6, 1],
    [6, 2],
    [6, 3],
    [8, 2],
    [8, 4],
    [5, 1],
    [5, 2],
    [7, 3],
  ])('round-robin completo sin repetir: %i parejas, %i canchas', (n, courts) => {
    const rounds = generateFixedAmericano({ participantIds: ids(n), courts });
    const count = new Map<string, number>();
    for (const r of rounds) {
      // ningún equipo juega dos veces en la misma ronda física
      const seen = new Set<string>();
      for (const m of r.matches) {
        for (const id of [m.pairOne.playerOneId, m.pairTwo.playerOneId]) {
          expect(seen.has(id)).toBe(false);
          seen.add(id);
        }
        const key = [m.pairOne.playerOneId, m.pairTwo.playerOneId].sort().join('|');
        count.set(key, (count.get(key) ?? 0) + 1);
      }
      // como máximo `courts` partidos por ronda
      expect(r.matches.length).toBeLessThanOrEqual(courts);
    }
    const expectedMatchups = (n * (n - 1)) / 2;
    expect(count.size).toBe(expectedMatchups); // todos los enfrentamientos presentes
    for (const c of count.values()) expect(c).toBe(1); // ninguno repetido
  });
});
