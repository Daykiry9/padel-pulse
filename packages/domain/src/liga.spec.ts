import { describe, expect, it } from 'vitest';

import { generateLeague } from './liga';

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`);
}

describe('generateLeague', () => {
  it('6 parejas: 5 rondas round-robin completo (15 enfrentamientos únicos)', () => {
    const rounds = generateLeague({ participantIds: ids(6), courts: 3 });
    expect(rounds).toHaveLength(5);
    const matchupSet = new Set<string>();
    for (const r of rounds) {
      for (const m of r.matches) {
        const key = [m.pairOne.playerOneId, m.pairTwo.playerOneId].sort().join('|');
        matchupSet.add(key);
      }
    }
    expect(matchupSet.size).toBe(15); // C(6,2)
  });
});
