import type { AmericanoRound, UUID } from '../types';
import { generateFixedAmericano } from './americano-pairing';

export interface AmericanoInput {
  playerIds: UUID[];
  courts: number;
}

/**
 * Compat: API original de v1 — genera un americano fijo dados N jugadores
 * que forman parejas según orden de entrada. Útil para los previews
 * existentes mientras migramos a la API rica de `americano-pairing`.
 *
 * Para uso real (Tier 1 Americano Fijo o Random) usar
 * `generateAmericanoPairing` desde `americano-pairing.ts`.
 */
export function generateAmericano({ playerIds, courts }: AmericanoInput): AmericanoRound[] {
  const n = playerIds.length;
  if (n < 4 || n % 4 !== 0) {
    throw new Error(`Americano requiere múltiplo de 4 jugadores (recibido: ${n})`);
  }
  // Tratar a cada par consecutivo como una pareja fija
  const pairs: UUID[] = [];
  for (let i = 0; i < n; i += 2) {
    pairs.push(`${playerIds[i]}+${playerIds[i + 1]}`);
  }
  return generateFixedAmericano({ participantIds: pairs, courts });
}

export {
  generateFixedAmericano,
  generateRandomAmericano,
  generateAmericanoPairing,
} from './americano-pairing';
export type { AmericanoPairingInput } from './americano-pairing';
