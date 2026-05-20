import type { AmericanoMatch, AmericanoRound, MatchStatus, UUID } from '../types';

export interface AmericanoInput {
  playerIds: UUID[];
  courts: number;
}

const SCHEDULED: MatchStatus = 'scheduled';

/**
 * Genera el calendario de un Americano usando el algoritmo de "round-robin de parejas":
 * cada jugador rota para hacer pareja con cada uno de los demás exactamente una vez.
 * Funciona con 4, 8, 12, 16... jugadores (múltiplos de 4).
 *
 * Estrategia: fijamos al jugador 0 y rotamos al resto, formando parejas (0,k) y
 * los restantes en parejas consecutivas que se enfrentan entre sí en otras canchas.
 */
export function generateAmericano({ playerIds, courts }: AmericanoInput): AmericanoRound[] {
  const n = playerIds.length;
  if (n < 4 || n % 4 !== 0) {
    throw new Error(`Americano requiere múltiplo de 4 jugadores (recibido: ${n})`);
  }
  if (courts < 1) throw new Error('Se requiere al menos 1 cancha');

  const totalRounds = n - 1;
  const rounds: AmericanoRound[] = [];

  const fixed = playerIds[0]!;
  const rotating = playerIds.slice(1);

  for (let r = 0; r < totalRounds; r++) {
    const order = [fixed, ...rotateLeft(rotating, r)];
    const pairs: [UUID, UUID][] = [];
    pairs.push([order[0]!, order[1]!]);
    for (let i = 2; i < n; i += 2) {
      pairs.push([order[i]!, order[i + 1]!]);
    }

    const matches: AmericanoMatch[] = [];
    for (let m = 0; m < pairs.length; m += 2) {
      const pairOne = pairs[m];
      const pairTwo = pairs[m + 1];
      if (!pairOne || !pairTwo) break;
      matches.push({
        roundNumber: r + 1,
        courtNumber: (m / 2) % courts + 1,
        pairOne: { playerOneId: pairOne[0], playerTwoId: pairOne[1] },
        pairTwo: { playerOneId: pairTwo[0], playerTwoId: pairTwo[1] },
        status: SCHEDULED,
      });
    }
    rounds.push({ roundNumber: r + 1, matches });
  }

  return rounds;
}

function rotateLeft<T>(arr: readonly T[], n: number): T[] {
  if (arr.length === 0) return [];
  const k = ((n % arr.length) + arr.length) % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)];
}
