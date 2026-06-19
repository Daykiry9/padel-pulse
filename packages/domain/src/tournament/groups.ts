import type { UUID } from '../types';
import { generateFixedAmericano } from './americano-pairing';

// ============================================================
// Híbrido grupos + playoff
// ============================================================
// Fase de grupos: reparte las parejas en N grupos y corre un round-robin por
// grupo (reusa el motor de americano fijo). Al terminar, los top-K de cada
// grupo siembran un bracket de eliminación (generateSingleElimination).

export interface GroupMatch {
  groupNumber: number;
  roundNumber: number;
  courtNumber: number;
  registrationOneId: UUID;
  registrationTwoId: UUID;
}

export interface GroupStageInput {
  participantIds: UUID[];
  numGroups: number;
  courts: number;
}

/** Reparte ids en `numGroups` grupos por serpentina (balancea seeds). */
export function splitIntoGroups(participantIds: UUID[], numGroups: number): UUID[][] {
  const groups: UUID[][] = Array.from({ length: numGroups }, () => []);
  // Round-robin simple: participante i → grupo i % numGroups.
  participantIds.forEach((id, i) => {
    groups[i % numGroups]!.push(id);
  });
  return groups;
}

export function generateGroupStage({ participantIds, numGroups, courts }: GroupStageInput): GroupMatch[] {
  if (numGroups < 1) throw new Error('Mínimo 1 grupo');
  if (participantIds.length < numGroups * 2) {
    throw new Error('Cada grupo necesita al menos 2 parejas');
  }
  const groups = splitIntoGroups(participantIds, numGroups);
  const out: GroupMatch[] = [];
  groups.forEach((groupIds, gIdx) => {
    if (groupIds.length < 2) return;
    const rounds = generateFixedAmericano({ participantIds: groupIds, courts });
    for (const round of rounds) {
      for (const m of round.matches) {
        out.push({
          groupNumber: gIdx + 1,
          roundNumber: round.roundNumber,
          courtNumber: m.courtNumber,
          registrationOneId: m.pairOne.playerOneId,
          registrationTwoId: m.pairTwo.playerOneId,
        });
      }
    }
  });
  return out;
}

export interface GroupResultMatch {
  groupNumber: number | null;
  registrationOneId: UUID | null;
  registrationTwoId: UUID | null;
  scoreOne: number | null;
  scoreTwo: number | null;
  status: string;
}

export interface GroupStanding {
  registrationId: UUID;
  played: number;
  wins: number;
  diff: number;
  scoreFor: number;
}

/**
 * Tabla de un grupo: solo matches completados. Orden: wins → diff → scoreFor.
 * scoreOne/scoreTwo son el agregado del marcador (sets ganados o puntos),
 * coherente con el resto del sistema.
 */
export function computeGroupStandings(matches: GroupResultMatch[], groupNumber: number): GroupStanding[] {
  const table = new Map<UUID, GroupStanding>();
  const ensure = (id: UUID) => {
    let s = table.get(id);
    if (!s) {
      s = { registrationId: id, played: 0, wins: 0, diff: 0, scoreFor: 0 };
      table.set(id, s);
    }
    return s;
  };
  for (const m of matches) {
    if (m.groupNumber !== groupNumber) continue;
    if (m.status !== 'completed') continue;
    if (!m.registrationOneId || !m.registrationTwoId) continue;
    const a = ensure(m.registrationOneId);
    const b = ensure(m.registrationTwoId);
    const so = m.scoreOne ?? 0;
    const st = m.scoreTwo ?? 0;
    a.played++;
    b.played++;
    a.scoreFor += so;
    b.scoreFor += st;
    a.diff += so - st;
    b.diff += st - so;
    if (so > st) a.wins++;
    else if (st > so) b.wins++;
  }
  return [...table.values()].sort(
    (x, y) => y.wins - x.wins || y.diff - x.diff || y.scoreFor - x.scoreFor,
  );
}

/**
 * Ordena los clasificados para sembrar la llave separando a los del mismo grupo:
 * primeros en orden de grupo, luego segundos en orden inverso, etc.
 * Ej 2 grupos × 2: [1A, 1B, 2B, 2A].
 */
export function seedPlayoffFromGroups(qualifiersByGroup: UUID[][], qualifiersPerGroup: number): UUID[] {
  const seeded: UUID[] = [];
  for (let pos = 0; pos < qualifiersPerGroup; pos++) {
    const groupOrder =
      pos % 2 === 0 ? qualifiersByGroup : [...qualifiersByGroup].reverse();
    for (const group of groupOrder) {
      const id = group[pos];
      if (id) seeded.push(id);
    }
  }
  return seeded;
}
