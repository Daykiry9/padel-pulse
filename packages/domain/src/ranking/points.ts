import type { TournamentFormat } from '../types';

/**
 * Tabla de puntos absolutos por posición final de un torneo.
 * Inspirado en ATP/WTA: el ganador se lleva 1000, runner-up 600, etc.
 * El total de teams del torneo multiplica para premiar torneos grandes.
 */
const POSITION_POINTS: Record<number, number> = {
  1: 1000,
  2: 600,
  3: 400,
  4: 250,
  5: 150,
  6: 150,
  7: 100,
  8: 100,
};

/**
 * Multiplicador por formato — torneos más largos pesan más.
 * Calibrar con datos reales más adelante.
 */
const FORMAT_MULTIPLIER: Record<TournamentFormat, number> = {
  americano_fijo: 1.0,
  americano_random: 0.6,
  liguilla_casual: 0.8,
  liga: 1.5,
  express: 0.6,
  eliminacion: 1.2,
  grupos_eliminacion: 1.5,
};

export interface PointsForPositionInput {
  position: number;
  totalTeams: number;
  format: TournamentFormat;
}

/**
 * Calcula los puntos absolutos otorgados a un team que terminó en `position`
 * de un torneo de `totalTeams` equipos con formato `format`.
 *
 * Reglas:
 *  - Top 8 obtiene puntos según tabla. Posiciones 9+ obtienen 25 puntos planos.
 *  - Si el torneo tuvo menos de 8 teams, se escala proporcionalmente.
 *  - El formato del torneo multiplica el resultado final.
 */
export function pointsForPosition({
  position,
  totalTeams,
  format,
}: PointsForPositionInput): number {
  if (position < 1) throw new Error(`position invalida: ${position}`);
  if (totalTeams < 1) throw new Error(`totalTeams invalido: ${totalTeams}`);

  const base = POSITION_POINTS[position] ?? 25;
  // Escala por tamaño: torneo de 4 vale ~50% de uno de 16
  const sizeFactor = Math.min(1, totalTeams / 16);
  const formatFactor = FORMAT_MULTIPLIER[format];
  return Math.round(base * sizeFactor * formatFactor);
}

/**
 * Genera la asignación completa de puntos para todos los equipos de un torneo
 * dado el ranking final (array ordenado de team IDs en orden de podio).
 */
export interface AwardPointsInput {
  finalStandings: string[];
  format: TournamentFormat;
}

export interface AwardedPoints {
  teamId: string;
  position: number;
  points: number;
}

export function awardTournamentPoints({
  finalStandings,
  format,
}: AwardPointsInput): AwardedPoints[] {
  const total = finalStandings.length;
  return finalStandings.map((teamId, idx) => ({
    teamId,
    position: idx + 1,
    points: pointsForPosition({ position: idx + 1, totalTeams: total, format }),
  }));
}

/**
 * Aplica decaimiento temporal lineal a puntos antiguos.
 * Después de 12 meses los puntos pesan 0. Más reciente = más peso.
 *
 * `awardedAt` y `referenceDate` deben ser dates comparables.
 */
export function decayedPoints(
  rawPoints: number,
  awardedAt: Date,
  referenceDate: Date = new Date(),
  windowMonths: number = 12,
): number {
  const windowMs = windowMonths * 30 * 24 * 60 * 60 * 1000;
  const elapsedMs = referenceDate.getTime() - awardedAt.getTime();
  if (elapsedMs >= windowMs) return 0;
  if (elapsedMs <= 0) return rawPoints;
  const factor = 1 - elapsedMs / windowMs;
  return Math.round(rawPoints * factor);
}
