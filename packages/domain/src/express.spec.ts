import { describe, expect, it } from 'vitest';

import { generateExpress } from './express';

function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `p${i + 1}`);
}

describe('generateExpress', () => {
  it('8 jugadores 2 canchas: 6 rondas por defecto', () => {
    const rounds = generateExpress({ participantIds: ids(8), courts: 2 });
    expect(rounds).toHaveLength(6);
    for (const r of rounds) {
      expect(r.matches).toHaveLength(2);
    }
  });

  it('respeta rounds custom', () => {
    const rounds = generateExpress({ participantIds: ids(8), courts: 2, rounds: 4 });
    expect(rounds).toHaveLength(4);
  });

  it('rechaza menos de 4 jugadores', () => {
    expect(() => generateExpress({ participantIds: ids(3), courts: 1 })).toThrow();
  });
});
