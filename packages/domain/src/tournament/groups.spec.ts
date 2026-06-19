import { describe, expect, it } from 'vitest';

import {
  splitIntoGroups,
  generateGroupStage,
  computeGroupStandings,
  seedPlayoffFromGroups,
  type GroupResultMatch,
} from './groups';

const ids = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

describe('splitIntoGroups', () => {
  it('reparte por serpentina equilibrado', () => {
    const g = splitIntoGroups(ids(8), 2);
    expect(g).toHaveLength(2);
    expect(g[0]).toHaveLength(4);
    expect(g[1]).toHaveLength(4);
    expect(g[0]).toContain('p1');
    expect(g[1]).toContain('p2');
  });
});

describe('generateGroupStage', () => {
  it('8 parejas en 2 grupos → round-robin por grupo (6 matches c/u)', () => {
    const matches = generateGroupStage({ participantIds: ids(8), numGroups: 2, courts: 2 });
    const g1 = matches.filter((m) => m.groupNumber === 1);
    const g2 = matches.filter((m) => m.groupNumber === 2);
    expect(g1).toHaveLength(6); // C(4,2)
    expect(g2).toHaveLength(6);
    // cada pareja del grupo enfrenta a cada otra una vez
    const seen = new Set(g1.map((m) => [m.registrationOneId, m.registrationTwoId].sort().join('|')));
    expect(seen.size).toBe(6);
  });

  it('rechaza si no alcanza para 2 por grupo', () => {
    expect(() => generateGroupStage({ participantIds: ids(3), numGroups: 2, courts: 1 })).toThrow();
  });
});

describe('computeGroupStandings', () => {
  it('ordena por wins → diff → scoreFor', () => {
    const m: GroupResultMatch[] = [
      { groupNumber: 1, registrationOneId: 'a', registrationTwoId: 'b', scoreOne: 2, scoreTwo: 0, status: 'completed' },
      { groupNumber: 1, registrationOneId: 'a', registrationTwoId: 'c', scoreOne: 2, scoreTwo: 1, status: 'completed' },
      { groupNumber: 1, registrationOneId: 'b', registrationTwoId: 'c', scoreOne: 2, scoreTwo: 1, status: 'completed' },
      { groupNumber: 2, registrationOneId: 'x', registrationTwoId: 'y', scoreOne: 2, scoreTwo: 0, status: 'completed' },
    ];
    const t = computeGroupStandings(m, 1);
    expect(t[0]!.registrationId).toBe('a'); // 2 wins
    expect(t.map((s) => s.registrationId)).toEqual(['a', 'b', 'c']);
    // no mezcla grupos
    expect(t.find((s) => s.registrationId === 'x')).toBeUndefined();
  });

  it('ignora matches sin completar', () => {
    const m: GroupResultMatch[] = [
      { groupNumber: 1, registrationOneId: 'a', registrationTwoId: 'b', scoreOne: null, scoreTwo: null, status: 'scheduled' },
    ];
    expect(computeGroupStandings(m, 1)).toHaveLength(0);
  });
});

describe('seedPlayoffFromGroups', () => {
  it('cross-seed separa a los del mismo grupo', () => {
    // grupo A: [a1, a2], grupo B: [b1, b2]
    const seeded = seedPlayoffFromGroups([['a1', 'a2'], ['b1', 'b2']], 2);
    // primeros en orden, segundos en reversa: [a1, b1, b2, a2]
    expect(seeded).toEqual(['a1', 'b1', 'b2', 'a2']);
  });
});
