import { describe, expect, it } from 'vitest';

import { generateAmericano } from './americano';

/**
 * `generateAmericano` es API legacy compat: agrupa N players en N/2 parejas
 * consecutivas y delega a `generateFixedAmericano`. Útil para previews del
 * marketing. Para la lógica real ver `americano-pairing.spec.ts`.
 */

describe('generateAmericano (legacy compat)', () => {
  it('8 jugadores → 4 parejas → 3 rondas (round-robin de 4)', () => {
    const players = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
    const rounds = generateAmericano({ playerIds: players, courts: 2 });
    expect(rounds).toHaveLength(3);
  });

  it('12 jugadores → 6 parejas → 5 rondas', () => {
    const players = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
    const rounds = generateAmericano({ playerIds: players, courts: 3 });
    expect(rounds).toHaveLength(5);
  });

  it('rechaza cantidad no múltiplo de 4', () => {
    expect(() => generateAmericano({ playerIds: ['a', 'b', 'c'], courts: 1 })).toThrow();
    expect(() => generateAmericano({ playerIds: ['a', 'b', 'c', 'd', 'e'], courts: 1 })).toThrow();
    expect(() =>
      generateAmericano({ playerIds: ['a', 'b', 'c', 'd', 'e', 'f'], courts: 1 }),
    ).toThrow();
  });

  it('rechaza menos de 4 jugadores', () => {
    expect(() => generateAmericano({ playerIds: ['a', 'b'], courts: 1 })).toThrow();
  });
});
