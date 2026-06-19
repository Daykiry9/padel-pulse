import { describe, expect, it } from 'vitest';

import { roundRobinOrder, bracketOrder, computeFinalStandings, type PlacementMatch } from './placements';

const rr = (one: string, two: string, so: number, st: number): PlacementMatch => ({
  registrationOneId: one,
  registrationTwoId: two,
  scoreOne: so,
  scoreTwo: st,
  status: 'completed',
  roundNumber: 1,
  stage: null,
  groupNumber: null,
});

describe('roundRobinOrder', () => {
  it('ordena por victorias', () => {
    // a gana 2, b gana 1, c gana 0
    const matches = [rr('a', 'b', 6, 2), rr('a', 'c', 6, 1), rr('b', 'c', 6, 3)];
    expect(roundRobinOrder(matches)).toEqual(['a', 'b', 'c']);
  });
});

describe('bracketOrder', () => {
  it('campeón primero, finalista segundo', () => {
    const sf1: PlacementMatch = { registrationOneId: 'a', registrationTwoId: 'b', scoreOne: 6, scoreTwo: 3, status: 'completed', roundNumber: 1, stage: null, groupNumber: null };
    const sf2: PlacementMatch = { registrationOneId: 'c', registrationTwoId: 'd', scoreOne: 2, scoreTwo: 6, status: 'completed', roundNumber: 1, stage: null, groupNumber: null };
    const final: PlacementMatch = { registrationOneId: 'a', registrationTwoId: 'd', scoreOne: 6, scoreTwo: 4, status: 'completed', roundNumber: 2, stage: null, groupNumber: null };
    const order = bracketOrder([sf1, sf2, final]);
    expect(order[0]).toBe('a'); // campeón
    expect(order[1]).toBe('d'); // finalista (perdió la final)
    // b y c (perdedores de semis) van después
    expect(order.slice(2).sort()).toEqual(['b', 'c']);
  });
});

describe('computeFinalStandings', () => {
  it('eliminacion usa bracketOrder', () => {
    const sf1: PlacementMatch = { registrationOneId: 'a', registrationTwoId: 'b', scoreOne: 6, scoreTwo: 3, status: 'completed', roundNumber: 1, stage: null, groupNumber: null };
    const final: PlacementMatch = { registrationOneId: 'a', registrationTwoId: 'b', scoreOne: 6, scoreTwo: 4, status: 'completed', roundNumber: 2, stage: null, groupNumber: null };
    expect(computeFinalStandings('eliminacion', [sf1, final])[0]).toBe('a');
  });

  it('round-robin para liga', () => {
    const matches = [rr('x', 'y', 6, 1), rr('x', 'z', 6, 2), rr('y', 'z', 6, 4)];
    expect(computeFinalStandings('liga', matches)).toEqual(['x', 'y', 'z']);
  });
});
