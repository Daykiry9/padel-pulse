import { describe, expect, it } from 'vitest';

import { checkEligibility, computeTeamCategory, sumOfPair } from './eligibility';

/**
 * IMPORTANTE: en pádel "categoría más alta" = mejor jugador = MENOR numeric_value.
 * Libre=1, 1ra=2, 2da=3, 3ra=4, 4ta=5, 5ta=6, 6ta=7, 7ma=8.
 * Regla v3: solo permitimos bajar 1 banda (jugar 1 categoría más débil que la real).
 */

describe('sumOfPair', () => {
  it('1ra + 2da = Suma 5', () => {
    expect(sumOfPair('primera', 'segunda')).toBe(5);
  });
  it('3ra + 4ta = Suma 9', () => {
    expect(sumOfPair('tercera', 'cuarta')).toBe(9);
  });
  it('5ta + 5ta = Suma 12', () => {
    expect(sumOfPair('quinta', 'quinta')).toBe(12);
  });
  it('Queens A + Queens B = Suma 5', () => {
    expect(sumOfPair('queens_a', 'queens_b')).toBe(5);
  });
});

describe('computeTeamCategory', () => {
  it('3ra (val 4) + 4ta (val 5): equipo es 3ra (el más fuerte)', () => {
    const cat = computeTeamCategory(
      { skillCategory: 'tercera', gender: 'male' },
      { skillCategory: 'cuarta', gender: 'male' },
    );
    expect(cat).toBe('tercera');
  });

  it('equipo mixto (1H + 1M) retorna null', () => {
    const cat = computeTeamCategory(
      { skillCategory: 'tercera', gender: 'male' },
      { skillCategory: 'queens_b', gender: 'female' },
    );
    expect(cat).toBeNull();
  });

  it('Queens A (val 2) + Queens C (val 4): equipo es Queens A', () => {
    const cat = computeTeamCategory(
      { skillCategory: 'queens_a', gender: 'female' },
      { skillCategory: 'queens_c', gender: 'female' },
    );
    expect(cat).toBe('queens_a');
  });
});

describe('checkEligibility — estándar', () => {
  it('equipo de 3ra en torneo de 3ra: OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'estandar', category: 'tercera' },
      playerOne: { skillCategory: 'tercera' },
      playerTwo: { skillCategory: 'tercera' },
    });
    expect(r.ok).toBe(true);
  });

  it('equipo de 3ra (val 4) en torneo de 4ta (val 5): 1 banda abajo permitida, OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'estandar', category: 'cuarta' },
      playerOne: { skillCategory: 'tercera' },
      playerTwo: { skillCategory: 'cuarta' },
    });
    expect(r.ok).toBe(true);
  });

  it('equipo de 2da (val 3) en torneo de 4ta (val 5): 2 bandas abajo, ERROR muy fuerte', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'estandar', category: 'cuarta' },
      playerOne: { skillCategory: 'segunda' },
      playerTwo: { skillCategory: 'cuarta' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/muy fuerte/i);
  });

  it('equipo de 5ta (val 6) en torneo de 3ra (val 4): equipo más débil que el torneo, ERROR muy débil', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'estandar', category: 'tercera' },
      playerOne: { skillCategory: 'quinta' },
      playerTwo: { skillCategory: 'quinta' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/muy débil/i);
  });

  it('Queens en torneo estándar masculino: ERROR (universos separados)', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'estandar', category: 'tercera' },
      playerOne: { skillCategory: 'queens_b' },
      playerTwo: { skillCategory: 'tercera' },
    });
    expect(r.ok).toBe(false);
  });
});

describe('checkEligibility — Suma', () => {
  it('1ra + 2da (Suma 5) en torneo Suma 7: ERROR suma menor a mínimo', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'suma', minSum: 7 },
      playerOne: { skillCategory: 'primera' }, // val 2
      playerTwo: { skillCategory: 'segunda' }, // val 3 → Suma 5
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Suma|mínimo/i);
  });

  it('3ra + 4ta (Suma 9) en torneo Suma 7: OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'suma', minSum: 7 },
      playerOne: { skillCategory: 'tercera' }, // val 4
      playerTwo: { skillCategory: 'cuarta' }, // val 5 → Suma 9
    });
    expect(r.ok).toBe(true);
  });

  it('tope individual de valor 3 con un Pro (valor 1) inscrito: ERROR', () => {
    // El tope dice "ningún jugador puede ser categoría < valor 3"
    // Pro (val 1) viola el tope.
    const r = checkEligibility({
      tournament: { categoryKind: 'suma', minSum: 8, maxPlayerCategoryValue: 3 },
      playerOne: { skillCategory: 'libre' }, // valor 1 — supera tope
      playerTwo: { skillCategory: 'septima' }, // valor 8 — Suma 9
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/tope individual/i);
  });

  it('Suma sin tope: Pro + 6ta cumple mínimo, OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'suma', minSum: 7 },
      playerOne: { skillCategory: 'libre' }, // 1
      playerTwo: { skillCategory: 'sexta' }, // 7 → Suma 8 ≥ 7
    });
    expect(r.ok).toBe(true);
  });
});

describe('checkEligibility — mixto', () => {
  it('mixto_suma con 1H + 1M, Suma cumple: OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'mixto_suma', minSum: 7 },
      playerOne: { skillCategory: 'tercera', gender: 'male' }, // val 4
      playerTwo: { skillCategory: 'queens_c', gender: 'female' }, // val 4 → Suma 8
    });
    expect(r.ok).toBe(true);
  });

  it('mixto_suma con 2 hombres: ERROR', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'mixto_suma', minSum: 7 },
      playerOne: { skillCategory: 'tercera', gender: 'male' },
      playerTwo: { skillCategory: 'cuarta', gender: 'male' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/hombre y 1 mujer/i);
  });
});

describe('checkEligibility — Queens Suma', () => {
  it('queens_suma con 2 Queens, suma cumple: OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'queens_suma', minSum: 6 },
      playerOne: { skillCategory: 'queens_b' }, // 3
      playerTwo: { skillCategory: 'queens_c' }, // 4 → Suma 7
    });
    expect(r.ok).toBe(true);
  });

  it('queens_suma con 1 Queens + 1 estándar: ERROR', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'queens_suma', minSum: 6 },
      playerOne: { skillCategory: 'queens_b' },
      playerTwo: { skillCategory: 'tercera' },
    });
    expect(r.ok).toBe(false);
  });
});

describe('checkEligibility — individual (Tier 2)', () => {
  it('jugador 3ra (val 4) en Americano Random de 4ta (val 5): 1 banda abajo, OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'estandar', category: 'cuarta' },
      playerOne: { skillCategory: 'tercera' },
    });
    expect(r.ok).toBe(true);
  });

  it('jugador 3ra (val 4) en Americano Random de 5ta (val 6): 2 bandas abajo, ERROR muy fuerte', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'estandar', category: 'quinta' },
      playerOne: { skillCategory: 'tercera' },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/muy fuerte|bajar 1 banda/i);
  });

  it('jugador 5ta en Americano casual (sin restricción): OK', () => {
    const r = checkEligibility({
      tournament: { categoryKind: 'casual' },
      playerOne: { skillCategory: 'quinta' },
    });
    expect(r.ok).toBe(true);
  });
});
