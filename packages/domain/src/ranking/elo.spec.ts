import { describe, expect, it } from 'vitest';

import {
  applyElo,
  applyPaddleElo,
  computePaddleEloDeltas,
  tournamentBonus,
} from './elo';

/**
 * Reglas que validamos:
 *  - Ganar inflado ↑ rating del winner, ↓ rating del loser, magnitudes simétricas.
 *  - Gap grande favorece más al underdog.
 *  - Empate: delta 0, ratings sin cambio.
 *  - Margen de victoria amplifica el delta (log boost).
 *  - K configurable (24 default, 32 competitivo, 16 casual).
 *  - Constraint de DB elo_rating between 200 and 3500 NO se aplica en TS — el
 *    clamp lo hace la RPC SQL. Los tests asumen ratings dentro de rango.
 */

describe('applyElo (single match)', () => {
  it('iguales: ganar suma ~16, perder resta ~16 (k=32, mov=1)', () => {
    const out = applyElo({ ratingWinner: 1500, ratingLoser: 1500, k: 32 });
    expect(out.ratingWinner).toBeGreaterThan(1500);
    expect(out.ratingLoser).toBeLessThan(1500);
    expect(out.ratingWinner - 1500).toBe(1500 - out.ratingLoser);
    expect(out.delta).toBeGreaterThan(0);
  });

  it('underdog gana: delta mayor que en match parejo', () => {
    const parejo = applyElo({ ratingWinner: 1500, ratingLoser: 1500 });
    const underdog = applyElo({ ratingWinner: 1200, ratingLoser: 1700 });
    expect(underdog.delta).toBeGreaterThan(parejo.delta);
  });

  it('favorito gana: delta menor que en match parejo', () => {
    const parejo = applyElo({ ratingWinner: 1500, ratingLoser: 1500 });
    const favorito = applyElo({ ratingWinner: 1700, ratingLoser: 1200 });
    expect(favorito.delta).toBeLessThan(parejo.delta);
    expect(favorito.delta).toBeGreaterThan(0);
  });

  it('margin of victory amplifica delta', () => {
    const close = applyElo({ ratingWinner: 1500, ratingLoser: 1500, marginOfVictory: 1 });
    const blowout = applyElo({ ratingWinner: 1500, ratingLoser: 1500, marginOfVictory: 6 });
    expect(blowout.delta).toBeGreaterThan(close.delta);
  });
});

describe('tournamentBonus', () => {
  it('1er lugar = 60', () => expect(tournamentBonus(1)).toBe(60));
  it('2do lugar = 35', () => expect(tournamentBonus(2)).toBe(35));
  it('3er lugar = 20', () => expect(tournamentBonus(3)).toBe(20));
  it('4to+ lugar = 5', () => {
    expect(tournamentBonus(4)).toBe(5);
    expect(tournamentBonus(10)).toBe(5);
  });
});

describe('applyPaddleElo (doubles)', () => {
  it('pair iguales, scoreOne > scoreTwo: pairOne sube, pairTwo baja igual', () => {
    const out = applyPaddleElo({
      pairOne: { p1: 1000, p2: 1000 },
      pairTwo: { p1: 1000, p2: 1000 },
      scoreOne: 6,
      scoreTwo: 3,
    });
    expect(out.pairOne.delta).toBeGreaterThan(0);
    expect(out.pairTwo.delta).toBeLessThan(0);
    expect(out.pairOne.delta).toBe(-out.pairTwo.delta);
    expect(out.pairOne.p1).toBe(out.pairOne.p2);
    expect(out.pairTwo.p1).toBe(out.pairTwo.p2);
  });

  it('empate entre parejas iguales: delta = 0', () => {
    const out = applyPaddleElo({
      pairOne: { p1: 1050, p2: 1050 }, // promedio 1050
      pairTwo: { p1: 1050, p2: 1050 }, // promedio 1050
      scoreOne: 5,
      scoreTwo: 5,
    });
    expect(out.pairOne.delta).toBe(0);
    expect(out.pairTwo.delta).toBe(0);
  });

  it('empate entre parejas desiguales: favorito pierde ELO, underdog gana', () => {
    // ratings desiguales + empate = underdog supera expectativa → sube
    const out = applyPaddleElo({
      pairOne: { p1: 1000, p2: 1000 }, // underdog (prom 1000)
      pairTwo: { p1: 1500, p2: 1500 }, // favorito (prom 1500)
      scoreOne: 5,
      scoreTwo: 5,
    });
    expect(out.pairOne.delta).toBeGreaterThan(0);
    expect(out.pairTwo.delta).toBeLessThan(0);
    expect(out.pairOne.delta).toBe(-out.pairTwo.delta);
  });

  it('gap grande (>500): underdog que gana se lleva delta grande', () => {
    const out = applyPaddleElo({
      pairOne: { p1: 1100, p2: 1100 }, // promedio 1100
      pairTwo: { p1: 1700, p2: 1700 }, // promedio 1700, gap 600
      scoreOne: 6, // gana el underdog
      scoreTwo: 4,
      k: 24,
    });
    expect(out.pairOne.delta).toBeGreaterThan(15);
    expect(out.pairTwo.delta).toBeLessThan(-15);
  });

  it('gap grande: favorito que gana se lleva delta chico', () => {
    const out = applyPaddleElo({
      pairOne: { p1: 1700, p2: 1700 },
      pairTwo: { p1: 1100, p2: 1100 },
      scoreOne: 6,
      scoreTwo: 4,
      k: 24,
    });
    expect(out.pairOne.delta).toBeGreaterThanOrEqual(0);
    expect(out.pairOne.delta).toBeLessThan(5);
  });

  it('primer match (ambos en 1000): delta razonable', () => {
    const out = applyPaddleElo({
      pairOne: { p1: 1000, p2: 1000 },
      pairTwo: { p1: 1000, p2: 1000 },
      scoreOne: 6,
      scoreTwo: 2,
    });
    // k=24, expected=0.5, mov=log(5)≈1.61, delta ≈ 24*1.61*0.5 ≈ 19
    expect(out.pairOne.delta).toBeGreaterThan(10);
    expect(out.pairOne.delta).toBeLessThan(30);
  });

  it('mismo delta a ambos jugadores de la pareja (simplificación Playtomic)', () => {
    const out = applyPaddleElo({
      pairOne: { p1: 800, p2: 1400 }, // pareja desbalanceada
      pairTwo: { p1: 1100, p2: 1100 },
      scoreOne: 6,
      scoreTwo: 0,
    });
    expect(out.pairOne.p1 - 800).toBe(out.pairOne.p2 - 1400);
  });

  it('k custom (32 competitivo): delta mayor que k=24', () => {
    const casual = applyPaddleElo({
      pairOne: { p1: 1000, p2: 1000 },
      pairTwo: { p1: 1000, p2: 1000 },
      scoreOne: 6,
      scoreTwo: 3,
      k: 24,
    });
    const competitivo = applyPaddleElo({
      pairOne: { p1: 1000, p2: 1000 },
      pairTwo: { p1: 1000, p2: 1000 },
      scoreOne: 6,
      scoreTwo: 3,
      k: 32,
    });
    expect(competitivo.pairOne.delta).toBeGreaterThan(casual.pairOne.delta);
  });
});

describe('computePaddleEloDeltas (RPC-friendly)', () => {
  it('retorna mismos deltas que applyPaddleElo', () => {
    const input = {
      pairOne: { p1: 1100, p2: 1200 },
      pairTwo: { p1: 1300, p2: 1400 },
      scoreOne: 6,
      scoreTwo: 4,
    };
    const apply = applyPaddleElo(input);
    const deltas = computePaddleEloDeltas(input);
    expect(deltas.deltaOne).toBe(apply.pairOne.delta);
    expect(deltas.deltaTwo).toBe(apply.pairTwo.delta);
  });

  it('empate entre parejas iguales: deltaOne y deltaTwo en 0', () => {
    const d = computePaddleEloDeltas({
      pairOne: { p1: 1000, p2: 1000 },
      pairTwo: { p1: 1000, p2: 1000 },
      scoreOne: 4,
      scoreTwo: 4,
    });
    expect(d.deltaOne).toBe(0);
    expect(d.deltaTwo).toBe(0);
  });

  it('suma de deltas es cero (sistema de suma cero)', () => {
    const d = computePaddleEloDeltas({
      pairOne: { p1: 1234, p2: 1567 },
      pairTwo: { p1: 1789, p2: 1098 },
      scoreOne: 6,
      scoreTwo: 1,
    });
    expect(d.deltaOne + d.deltaTwo).toBe(0);
  });
});
