import { describe, expect, it } from 'vitest';

import { generateLiguillaCasual } from './liguilla';

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`);
}

describe('generateLiguillaCasual', () => {
  it('4 parejas: round-robin completo (3 rondas, 6 matchups únicos)', () => {
    const rounds = generateLiguillaCasual({ participantIds: ids(4), courts: 2 });
    expect(rounds).toHaveLength(3);
    const matchupSet = new Set<string>();
    for (const r of rounds) {
      for (const m of r.matches) {
        const key = [m.pairOne.playerOneId, m.pairTwo.playerOneId].sort().join('|');
        matchupSet.add(key);
      }
    }
    expect(matchupSet.size).toBe(6);
  });

  it('rechaza más de 8 parejas', () => {
    expect(() => generateLiguillaCasual({ participantIds: ids(9), courts: 2 })).toThrow(/máximo 8/);
  });
});
