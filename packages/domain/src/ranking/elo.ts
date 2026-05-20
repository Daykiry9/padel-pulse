export interface EloMatchInput {
  ratingWinner: number;
  ratingLoser: number;
  marginOfVictory?: number;
  k?: number;
}

export interface EloMatchOutput {
  ratingWinner: number;
  ratingLoser: number;
  delta: number;
}

const DEFAULT_K = 32;

/**
 * Calcula el nuevo rating ELO tras un partido.
 * Soporta margen de victoria opcional para amplificar el delta cuando una pareja
 * gana por mucho (formato americano usa puntos totales por game).
 */
export function applyElo({
  ratingWinner,
  ratingLoser,
  marginOfVictory = 1,
  k = DEFAULT_K,
}: EloMatchInput): EloMatchOutput {
  const expectedWinner = 1 / (1 + Math.pow(10, (ratingLoser - ratingWinner) / 400));
  const movBoost = Math.log(Math.max(marginOfVictory, 1) + 1);
  const delta = Math.round(k * movBoost * (1 - expectedWinner));
  return {
    ratingWinner: ratingWinner + delta,
    ratingLoser: ratingLoser - delta,
    delta,
  };
}

/**
 * Bonus por ganar un torneo (top 1, 2, 3) para inyectar al rating de la comunidad.
 */
export function tournamentBonus(position: number): number {
  if (position === 1) return 60;
  if (position === 2) return 35;
  if (position === 3) return 20;
  return 5;
}
