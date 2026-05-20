/**
 * Suite manual del generador americano.
 * Cuando agreguemos vitest, mover a `.spec.ts` con `expect`.
 *
 * Llamar manualmente desde un script: `node --import=tsx -e "import('./americano.test.ts').then(m => m.run())"`
 */
import { generateAmericano } from './americano';

function assertEq(actual: number, expected: number, label: string) {
  if (actual !== expected) throw new Error(`${label}: esperaba ${expected}, obtuvo ${actual}`);
}

export function run() {
  const players = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
  const rounds = generateAmericano({ playerIds: players, courts: 2 });

  assertEq(rounds.length, 7, 'cantidad de rondas');

  for (const r of rounds) {
    const ids = new Set<string>();
    for (const m of r.matches) {
      ids.add(m.pairOne.playerOneId);
      ids.add(m.pairOne.playerTwoId);
      ids.add(m.pairTwo.playerOneId);
      ids.add(m.pairTwo.playerTwoId);
    }
    assertEq(ids.size, 8, `ronda ${r.roundNumber} con todos los jugadores`);
  }

  return rounds;
}
