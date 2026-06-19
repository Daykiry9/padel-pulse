import type { TournamentFormat } from '../types';
import { computeGroupStandings, type GroupResultMatch } from './groups';

// ============================================================
// Posiciones finales de un torneo (registration ids en orden de podio)
// ============================================================
// Produce el ranking final para repartir puntos (awardTournamentPoints).
// Trabaja sobre matches team-based (registration_one_id / registration_two_id).

export interface PlacementMatch {
  registrationOneId: string | null;
  registrationTwoId: string | null;
  scoreOne: number | null;
  scoreTwo: number | null;
  status: string;
  roundNumber: number;
  stage: string | null;
  groupNumber: number | null;
}

/** Round-robin: orden por victorias → diferencia → puntos a favor. */
export function roundRobinOrder(matches: PlacementMatch[]): string[] {
  const asGroup: GroupResultMatch[] = matches.map((m) => ({
    groupNumber: null,
    registrationOneId: m.registrationOneId,
    registrationTwoId: m.registrationTwoId,
    scoreOne: m.scoreOne,
    scoreTwo: m.scoreTwo,
    status: m.status,
  }));
  return computeGroupStandings(asGroup, null as unknown as number).map((s) => s.registrationId);
}

/**
 * Eliminación: campeón primero, luego por ronda de eliminación (más lejos
 * llegó = mejor). Perdedores de la misma ronda comparten bloque de posición.
 */
export function bracketOrder(matches: PlacementMatch[]): string[] {
  const completed = matches.filter((m) => m.status === 'completed' && m.registrationOneId && m.registrationTwoId);
  if (completed.length === 0) return [];
  const maxRound = Math.max(...matches.map((m) => m.roundNumber));

  // Ronda en la que cada pareja fue eliminada (perdió). El que nunca perdió
  // y jugó la final es el campeón.
  const eliminatedRound = new Map<string, number>();
  const participants = new Set<string>();
  let champion: string | null = null;

  for (const m of completed) {
    const a = m.registrationOneId!;
    const b = m.registrationTwoId!;
    participants.add(a);
    participants.add(b);
    const loser = (m.scoreOne ?? 0) > (m.scoreTwo ?? 0) ? b : a;
    eliminatedRound.set(loser, m.roundNumber);
    if (m.roundNumber === maxRound) {
      champion = (m.scoreOne ?? 0) > (m.scoreTwo ?? 0) ? a : b;
    }
  }

  // Ordenar: campeón (sin ronda de eliminación) primero; luego por ronda desc.
  const order = [...participants].sort((x, y) => {
    const rx = eliminatedRound.get(x) ?? Infinity;
    const ry = eliminatedRound.get(y) ?? Infinity;
    return ry - rx;
  });
  // Asegurar el campeón al frente (defensa por si el sort de Infinity empata).
  if (champion) {
    return [champion, ...order.filter((id) => id !== champion)];
  }
  return order;
}

/**
 * Híbrido: posiciones del playoff primero (campeón → ...), luego los que no
 * clasificaron, ordenados por su standing de grupo.
 */
export function groupsPlayoffOrder(matches: PlacementMatch[]): string[] {
  const playoff = matches.filter((m) => m.stage === 'playoff');
  const groups = matches.filter((m) => m.stage === 'group');
  const playoffOrder = bracketOrder(playoff);
  const inPlayoff = new Set(playoffOrder);

  // No clasificados: por standing dentro de su grupo, grupos en orden.
  const groupNums = [...new Set(groups.map((m) => m.groupNumber ?? 0))].sort((a, b) => a - b);
  const rest: string[] = [];
  for (const g of groupNums) {
    const asGroup: GroupResultMatch[] = groups.map((m) => ({
      groupNumber: m.groupNumber,
      registrationOneId: m.registrationOneId,
      registrationTwoId: m.registrationTwoId,
      scoreOne: m.scoreOne,
      scoreTwo: m.scoreTwo,
      status: m.status,
    }));
    for (const s of computeGroupStandings(asGroup, g)) {
      if (!inPlayoff.has(s.registrationId)) rest.push(s.registrationId);
    }
  }
  return [...playoffOrder, ...rest];
}

/** Devuelve los registration ids en orden de podio según el formato. */
export function computeFinalStandings(format: TournamentFormat, matches: PlacementMatch[]): string[] {
  if (format === 'eliminacion') return bracketOrder(matches);
  if (format === 'grupos_eliminacion') return groupsPlayoffOrder(matches);
  // americano_fijo, liga, liguilla_casual → round-robin
  return roundRobinOrder(matches);
}
