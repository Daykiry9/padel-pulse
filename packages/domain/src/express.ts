import type { AmericanoRound, UUID } from './types';
import { generateRandomAmericano } from './tournament/americano-pairing';

/**
 * Express — formato corto y social. Reusa el algoritmo del Americano
 * Random pero con menos rondas para que entre en 1.5-2h (típico: 6
 * rondas a 12 puntos).
 *
 * `durationMinutes` no afecta el algoritmo directamente (solo se usa
 * desde el server action para calcular `total_rounds` por defecto si el
 * organizador no lo especifica); se acepta como hint informativo.
 */

export type ExpressRound = AmericanoRound;

export interface ExpressInput {
  participantIds: UUID[];
  courts: number;
  durationMinutes?: number;
  rounds?: number;
}

export function generateExpress({
  participantIds,
  courts,
  rounds,
}: ExpressInput): ExpressRound[] {
  if (participantIds.length < 4) throw new Error('Mínimo 4 jugadores para Express');
  return generateRandomAmericano({
    participantIds,
    courts,
    rounds: rounds ?? 6,
  });
}
