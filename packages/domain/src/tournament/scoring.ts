// ============================================================
// Scoring configurable: points | games | sets
// ============================================================
// Una sola fuente de verdad para validar y resolver el marcador de un partido,
// sea cual sea el modo del torneo. El resultado expone scoreOne/scoreTwo (el
// AGREGADO que decide el ganador y que persisten las columnas matches.score_*)
// y marginGames (diferencia de games totales, para el margin-of-victory del ELO).

export type ScoringMode = 'points' | 'games' | 'sets';

export interface ScoringConfig {
  mode: ScoringMode;
  /** Objetivo de puntos (points) o games del set único (games). Default 12. */
  pointsPerMatch: number;
  /** Modo sets: cantidad máxima de sets (impar: 1, 3, 5...). */
  numSets?: number | null;
  /** Modo sets: games para ganar un set (ej 6). */
  gamesPerSet?: number | null;
}

export interface SetScore {
  one: number;
  two: number;
}

export interface ResolvedScore {
  /** Agregado que decide el ganador: sets ganados (sets) o el número (points/games). */
  scoreOne: number;
  scoreTwo: number;
  /** Diferencia absoluta de games totales — alimenta el margin-of-victory del ELO. */
  marginGames: number;
  /** Detalle por set (solo modo sets), o null. */
  setScores: SetScore[] | null;
  /** Ganador del partido, o null si quedó empate. */
  winner: 'one' | 'two' | null;
}

export const SCORING_MODE_LABELS: Record<ScoringMode, string> = {
  points: 'A puntos',
  games: 'A games',
  sets: 'Por sets',
};

/** Cuántos sets hay que ganar para llevarse el partido (mejor de numSets). */
export function setsToWin(numSets: number): number {
  return Math.floor(numSets / 2) + 1;
}

export type ScorePayload =
  | { mode: 'points' | 'games'; scoreOne: number; scoreTwo: number }
  | { mode: 'sets'; setScores: SetScore[] };

export type ScoreResult = { ok: true; resolved: ResolvedScore } | { ok: false; error: string };

/**
 * Valida el marcador según el modo del torneo y lo resuelve a su forma
 * persistible. No decide reglas de torneo (ej. empates prohibidos en llave):
 * eso lo valida el caller según el formato.
 */
export function resolveMatchScore(config: ScoringConfig, payload: ScorePayload): ScoreResult {
  if (config.mode !== payload.mode) {
    return { ok: false, error: 'El marcador no coincide con el modo del torneo' };
  }

  if (payload.mode !== 'sets') {
    const { scoreOne, scoreTwo } = payload;
    if (!Number.isInteger(scoreOne) || !Number.isInteger(scoreTwo)) {
      return { ok: false, error: 'El marcador debe ser un número entero' };
    }
    if (scoreOne < 0 || scoreTwo < 0 || scoreOne > 99 || scoreTwo > 99) {
      return { ok: false, error: 'Marcador fuera de rango (0-99)' };
    }
    return {
      ok: true,
      resolved: {
        scoreOne,
        scoreTwo,
        marginGames: Math.abs(scoreOne - scoreTwo),
        setScores: null,
        winner: scoreOne > scoreTwo ? 'one' : scoreTwo > scoreOne ? 'two' : null,
      },
    };
  }

  // mode === 'sets'
  const numSets = config.numSets ?? 3;
  const gamesPerSet = config.gamesPerSet ?? 6;
  const sets = payload.setScores;
  if (!Array.isArray(sets) || sets.length === 0) {
    return { ok: false, error: 'Carga al menos un set' };
  }
  if (sets.length > numSets) {
    return { ok: false, error: `Máximo ${numSets} sets en este torneo` };
  }

  const target = setsToWin(numSets);
  let wonOne = 0;
  let wonTwo = 0;
  let gamesOne = 0;
  let gamesTwo = 0;

  for (let i = 0; i < sets.length; i++) {
    const s = sets[i]!;
    if (!Number.isInteger(s.one) || !Number.isInteger(s.two)) {
      return { ok: false, error: `Set ${i + 1}: los games deben ser enteros` };
    }
    if (s.one < 0 || s.two < 0 || s.one > 99 || s.two > 99) {
      return { ok: false, error: `Set ${i + 1}: games fuera de rango` };
    }
    if (s.one === s.two) {
      return { ok: false, error: `Set ${i + 1}: un set no puede quedar empatado` };
    }
    gamesOne += s.one;
    gamesTwo += s.two;
    if (s.one > s.two) wonOne++;
    else wonTwo++;
  }

  // Una vez que un lado alcanza `target`, no debieron jugarse más sets.
  if (wonOne > target || wonTwo > target) {
    return { ok: false, error: `El partido termina al ganar ${target} sets` };
  }
  const decided = wonOne === target || wonTwo === target;
  // Sets de más tras decidir el partido (ej. 2-0 y un tercer set cargado).
  if (!decided && sets.length === numSets) {
    // Se jugaron todos los sets posibles sin alcanzar el target: imposible con N impar
    // salvo empate de sets, que no debería ocurrir porque cada set tiene ganador.
    return { ok: false, error: 'Marcador de sets inconsistente' };
  }

  return {
    ok: true,
    resolved: {
      scoreOne: wonOne,
      scoreTwo: wonTwo,
      marginGames: Math.abs(gamesOne - gamesTwo),
      setScores: sets,
      winner: wonOne > wonTwo ? 'one' : wonTwo > wonOne ? 'two' : null,
    },
  };
}

/** Resume un marcador resuelto para mostrar: "6-4 6-3" (sets) o "24-18" (points/games). */
export function formatScoreSummary(resolved: ResolvedScore): string {
  if (resolved.setScores && resolved.setScores.length > 0) {
    return resolved.setScores.map((s) => `${s.one}-${s.two}`).join(' ');
  }
  return `${resolved.scoreOne}-${resolved.scoreTwo}`;
}
