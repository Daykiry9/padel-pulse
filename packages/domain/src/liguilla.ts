import type { UUID } from './types';
import { generateLeague, type LeagueRound } from './liga';

/**
 * Liguilla casual — mini-liga round-robin de hasta 8 parejas. Para más
 * participantes habría que dividir en grupos (no soportado todavía).
 *
 * Por simplicidad delega en `generateLeague` con un cap explícito.
 */

const LIGUILLA_MAX = 8;

export interface LiguillaInput {
  participantIds: UUID[];
  courts: number;
}

export function generateLiguillaCasual({
  participantIds,
  courts,
}: LiguillaInput): LeagueRound[] {
  if (participantIds.length < 2) throw new Error('Mínimo 2 parejas para liguilla');
  if (participantIds.length > LIGUILLA_MAX) {
    throw new Error(
      `Liguilla casual soporta máximo ${LIGUILLA_MAX} parejas (recibido: ${participantIds.length}). Usá Liga para más participantes.`,
    );
  }
  return generateLeague({ participantIds, courts });
}
