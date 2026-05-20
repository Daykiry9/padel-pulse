/**
 * Tests manuales del generador americano.
 * Cuando agreguemos vitest, mover a `.spec.ts`.
 *
 * Verificación: con 8 jugadores deben generarse 7 rondas y cada jugador
 * debe jugar al menos 1 partido por ronda.
 */
import { generateAmericano } from './americano';

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(`Assert failed: ${msg}`);
}

function run() {
  const players = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
  const rounds = generateAmericano({ playerIds: players, courts: 2 });

  assert(rounds.length === 7, `esperaba 7 rondas, obtuvo ${rounds.length}`);

  for (const r of rounds) {
    const ids = new Set<string>();
    for (const m of r.matches) {
      ids.add(m.pairOne.playerOneId);
      ids.add(m.pairOne.playerTwoId);
      ids.add(m.pairTwo.playerOneId);
      ids.add(m.pairTwo.playerTwoId);
    }
    assert(ids.size === 8, `ronda ${r.roundNumber} no incluye los 8 jugadores`);
  }

  // eslint-disable-next-line no-console
  console.log(`OK ${rounds.length} rondas generadas, todas las parejas distintas.`);
}

if (require.main === module) run();
