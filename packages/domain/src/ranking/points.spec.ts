import { describe, expect, it } from 'vitest';

import { awardTournamentPoints, decayedPoints, pointsForPosition } from './points';

describe('pointsForPosition', () => {
  it('top 8 sigue la tabla ATP/WTA con torneo full de 16', () => {
    const base = (p: number) =>
      pointsForPosition({ position: p, totalTeams: 16, format: 'americano_fijo' });
    expect(base(1)).toBe(1000);
    expect(base(2)).toBe(600);
    expect(base(3)).toBe(400);
    expect(base(4)).toBe(250);
    expect(base(5)).toBe(150);
    expect(base(6)).toBe(150);
    expect(base(7)).toBe(100);
    expect(base(8)).toBe(100);
  });

  it('position > 8 da 25 plano (escalado por size + format)', () => {
    const p9 = pointsForPosition({ position: 9, totalTeams: 16, format: 'americano_fijo' });
    const p20 = pointsForPosition({ position: 20, totalTeams: 16, format: 'americano_fijo' });
    expect(p9).toBe(25); // 25 * 1.0 (sizeFactor) * 1.0 (formatFactor)
    expect(p20).toBe(25);
  });

  it('torneo de 4 equipos: escala a ~25% (sizeFactor = 4/16)', () => {
    const p1Full = pointsForPosition({ position: 1, totalTeams: 16, format: 'americano_fijo' });
    const p1Small = pointsForPosition({ position: 1, totalTeams: 4, format: 'americano_fijo' });
    expect(p1Small).toBe(Math.round(p1Full * (4 / 16)));
    expect(p1Small).toBe(250);
  });

  it('formato afecta el multiplier', () => {
    const liga = pointsForPosition({ position: 1, totalTeams: 16, format: 'liga' });
    const americano = pointsForPosition({ position: 1, totalTeams: 16, format: 'americano_fijo' });
    const random = pointsForPosition({ position: 1, totalTeams: 16, format: 'americano_random' });

    expect(liga).toBe(1500); // 1000 * 1.5
    expect(americano).toBe(1000); // 1000 * 1.0
    expect(random).toBe(600); // 1000 * 0.6
  });

  it('totalTeams > 16: cap sizeFactor = 1.0 (no infla)', () => {
    const huge = pointsForPosition({ position: 1, totalTeams: 32, format: 'americano_fijo' });
    expect(huge).toBe(1000); // mismo que 16, no más
  });

  it('position inválida lanza', () => {
    expect(() =>
      pointsForPosition({ position: 0, totalTeams: 16, format: 'americano_fijo' }),
    ).toThrow();
    expect(() =>
      pointsForPosition({ position: -1, totalTeams: 16, format: 'americano_fijo' }),
    ).toThrow();
  });

  it('totalTeams inválido lanza', () => {
    expect(() =>
      pointsForPosition({ position: 1, totalTeams: 0, format: 'americano_fijo' }),
    ).toThrow();
  });
});

describe('awardTournamentPoints', () => {
  it('genera un row por team con position correcto', () => {
    const result = awardTournamentPoints({
      finalStandings: ['t1', 't2', 't3', 't4'],
      format: 'americano_fijo',
    });
    expect(result).toHaveLength(4);
    expect(result[0]!.teamId).toBe('t1');
    expect(result[0]!.position).toBe(1);
    expect(result[3]!.teamId).toBe('t4');
    expect(result[3]!.position).toBe(4);
  });

  it('puntos asignados consistentes con pointsForPosition', () => {
    const result = awardTournamentPoints({
      finalStandings: ['t1', 't2', 't3', 't4', 't5'],
      format: 'liga',
    });
    for (const r of result) {
      expect(r.points).toBe(
        pointsForPosition({ position: r.position, totalTeams: 5, format: 'liga' }),
      );
    }
  });

  it('torneo vacío: array vacío sin errores', () => {
    const result = awardTournamentPoints({ finalStandings: [], format: 'americano_fijo' });
    expect(result).toHaveLength(0);
  });
});

describe('decayedPoints', () => {
  const ref = new Date('2026-05-24T00:00:00Z');

  it('puntos recientes (hoy mismo): sin decay', () => {
    expect(decayedPoints(1000, ref, ref)).toBe(1000);
  });

  it('puntos 6 meses atrás: ~50% decay (lineal)', () => {
    const sixMonthsAgo = new Date(ref.getTime() - 6 * 30 * 24 * 3600 * 1000);
    const result = decayedPoints(1000, sixMonthsAgo, ref);
    expect(result).toBeGreaterThan(450);
    expect(result).toBeLessThan(550);
  });

  it('puntos exactamente al límite de 12 meses: 0', () => {
    const yearAgo = new Date(ref.getTime() - 12 * 30 * 24 * 3600 * 1000);
    expect(decayedPoints(1000, yearAgo, ref)).toBe(0);
  });

  it('puntos más de 12 meses atrás: 0', () => {
    const old = new Date(ref.getTime() - 18 * 30 * 24 * 3600 * 1000);
    expect(decayedPoints(1000, old, ref)).toBe(0);
  });

  it('awardedAt en el futuro (raro pero posible): retorna rawPoints completo', () => {
    const future = new Date(ref.getTime() + 24 * 3600 * 1000);
    expect(decayedPoints(1000, future, ref)).toBe(1000);
  });

  it('ventana custom (3 meses): decae más rápido', () => {
    const oneMonthAgo = new Date(ref.getTime() - 30 * 24 * 3600 * 1000);
    const result = decayedPoints(1000, oneMonthAgo, ref, 3);
    // ~33% de la ventana → ~67% del valor
    expect(result).toBeGreaterThan(600);
    expect(result).toBeLessThan(700);
  });
});
