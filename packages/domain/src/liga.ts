import type { AmericanoRound, UUID } from './types';
import { generateFixedAmericano } from './tournament/americano-pairing';

/**
 * Liga (round-robin completo de parejas).
 *
 * Mismo algoritmo que el Americano Fijo (Berger) — la diferencia es de
 * presentación/standings: en una liga normalmente hay múltiples partidos
 * por par, standings con W/L/Sets/Pts, y los partidos pueden estar
 * distribuidos en varias fechas. La generación del bracket inicial es
 * idéntica al round-robin clásico.
 */

export type LeagueRound = AmericanoRound;

export interface LeagueInput {
  participantIds: UUID[];
  courts: number;
}

export function generateLeague({ participantIds, courts }: LeagueInput): LeagueRound[] {
  if (participantIds.length < 2) throw new Error('Mínimo 2 parejas para una liga');
  return generateFixedAmericano({ participantIds, courts });
}
