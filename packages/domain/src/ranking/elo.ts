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

// ============================================================
// ELO doubles (padel) — calcula nuevo rating para los 4 jugadores
// ============================================================
export interface PaddleEloInput {
  pairOne: { p1: number; p2: number };
  pairTwo: { p1: number; p2: number };
  scoreOne: number;
  scoreTwo: number;
  /** Default 24 (casual). Usar 32 para torneos Tier 1 competitivos. */
  k?: number;
}

export interface PaddleEloOutput {
  pairOne: { p1: number; p2: number; delta: number };
  pairTwo: { p1: number; p2: number; delta: number };
}

export interface PaddleEloDeltasOutput {
  deltaOne: number;
  deltaTwo: number;
}

/**
 * Como `applyPaddleElo` pero solo retorna los deltas — útil para aplicarlos
 * atómicamente vía RPC SQL (`apply_elo_delta`) sin race condition en el
 * read-then-write. Misma fórmula que `applyPaddleElo`.
 */
export function computePaddleEloDeltas({
  pairOne,
  pairTwo,
  scoreOne,
  scoreTwo,
  k = 24,
}: PaddleEloInput): PaddleEloDeltasOutput {
  const ratingOne = (pairOne.p1 + pairOne.p2) / 2;
  const ratingTwo = (pairTwo.p1 + pairTwo.p2) / 2;

  const expectedOne = 1 / (1 + Math.pow(10, (ratingTwo - ratingOne) / 400));
  const expectedTwo = 1 - expectedOne;

  let scoreActualOne: number;
  let scoreActualTwo: number;
  if (scoreOne > scoreTwo) {
    scoreActualOne = 1;
    scoreActualTwo = 0;
  } else if (scoreTwo > scoreOne) {
    scoreActualOne = 0;
    scoreActualTwo = 1;
  } else {
    scoreActualOne = 0.5;
    scoreActualTwo = 0.5;
  }

  const margin = Math.abs(scoreOne - scoreTwo);
  const movBoost = margin > 0 ? Math.log(margin + 1) : 1;

  return {
    deltaOne: Math.round(k * movBoost * (scoreActualOne - expectedOne)),
    deltaTwo: Math.round(k * movBoost * (scoreActualTwo - expectedTwo)),
  };
}

/**
 * Computa el nuevo ELO de los 4 jugadores de un match de padel doubles.
 * Cada pareja se trata como un equipo con rating = promedio de sus 2 jugadores.
 * El delta calculado se aplica IGUAL a ambos jugadores de cada pareja
 * (simplificación estilo Playtomic).
 *
 * Empate (mismo score) → cada pareja gana/pierde delta=0 con expected score 0.5.
 */
export function applyPaddleElo({
  pairOne,
  pairTwo,
  scoreOne,
  scoreTwo,
  k = 24,
}: PaddleEloInput): PaddleEloOutput {
  const ratingOne = (pairOne.p1 + pairOne.p2) / 2;
  const ratingTwo = (pairTwo.p1 + pairTwo.p2) / 2;

  const expectedOne = 1 / (1 + Math.pow(10, (ratingTwo - ratingOne) / 400));
  const expectedTwo = 1 - expectedOne;

  // Resultado: 1 = ganó, 0 = perdió, 0.5 = empate
  let scoreActualOne: number;
  let scoreActualTwo: number;
  if (scoreOne > scoreTwo) {
    scoreActualOne = 1;
    scoreActualTwo = 0;
  } else if (scoreTwo > scoreOne) {
    scoreActualOne = 0;
    scoreActualTwo = 1;
  } else {
    scoreActualOne = 0.5;
    scoreActualTwo = 0.5;
  }

  // Margin of victory boost suave: log(1 + |diff|)
  const margin = Math.abs(scoreOne - scoreTwo);
  const movBoost = margin > 0 ? Math.log(margin + 1) : 1;

  const deltaOne = Math.round(k * movBoost * (scoreActualOne - expectedOne));
  const deltaTwo = Math.round(k * movBoost * (scoreActualTwo - expectedTwo));

  return {
    pairOne: {
      p1: pairOne.p1 + deltaOne,
      p2: pairOne.p2 + deltaOne,
      delta: deltaOne,
    },
    pairTwo: {
      p1: pairTwo.p1 + deltaTwo,
      p2: pairTwo.p2 + deltaTwo,
      delta: deltaTwo,
    },
  };
}
