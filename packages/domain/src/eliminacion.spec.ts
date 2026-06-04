import { describe, expect, it } from 'vitest';

import { generateSingleElimination } from './eliminacion';

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`);
}

describe('generateSingleElimination', () => {
  it('8 parejas 2 canchas: 3 rondas, ronda 1 con 4 matches, sin BYEs', () => {
    const rounds = generateSingleElimination({ participantIds: ids(8), courts: 2 });
    expect(rounds).toHaveLength(3); // log2(8) = 3
    expect(rounds[0]!.matches).toHaveLength(4);
    expect(rounds[1]!.matches).toHaveLength(2);
    expect(rounds[2]!.matches).toHaveLength(1);
    // Ronda 1 — todos con registraciones reales (no BYEs)
    for (const m of rounds[0]!.matches) {
      expect(m.registrationOne.registrationId).toBeTruthy();
      expect(m.registrationTwo.registrationId).toBeTruthy();
      expect(m.status).toBe('scheduled');
    }
    // Rondas siguientes — registrationId null, winnerOf apunta al match previo
    for (const m of rounds[1]!.matches) {
      expect(m.registrationOne.registrationId).toBeNull();
      expect(m.registrationOne.winnerOf).toMatch(/^r1-m\d+$/);
    }
  });

  it('5 parejas: redondea a 8, genera BYEs auto-completados', () => {
    const rounds = generateSingleElimination({ participantIds: ids(5), courts: 2 });
    expect(rounds).toHaveLength(3);
    // 3 BYEs distribuidos en ronda 1 → 3 matches auto-completed con winner
    const byeMatches = rounds[0]!.matches.filter((m) => m.status === 'completed');
    expect(byeMatches).toHaveLength(3);
    for (const m of byeMatches) {
      expect(m.winnerRegistrationId).toBeTruthy();
    }
  });

  it('rechaza menos de 2 parejas', () => {
    expect(() => generateSingleElimination({ participantIds: ['p1'], courts: 1 })).toThrow();
  });
});
