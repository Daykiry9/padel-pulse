import type { MatchStatus, UUID } from './types';

/**
 * Single elimination bracket.
 *
 * Los participantes son parejas registradas (registration ids). Para N
 * inscritos, redondeamos al siguiente potencia de 2 y completamos con
 * BYEs distribuidos en los slots superiores del seed. El semillado es
 * por orden de entrada — si querés sembrar por ranking, ordená los
 * participantIds antes de llamar.
 *
 * La salida es la estructura completa del bracket: cada match contiene
 * `registrationOne`/`registrationTwo` con `registrationId` (si ya se
 * conoce) o `winnerOf` (matchId de un match previo). Los matches con
 * BYE en uno de los lados se marcan como `completed` con el lado real
 * como ganador (avance automático).
 */
const SCHEDULED: MatchStatus = 'scheduled';
const COMPLETED: MatchStatus = 'completed';

export type EliminationSlot =
  | { registrationId: UUID; winnerOf: null }
  | { registrationId: null; winnerOf: string };

export interface EliminationMatch {
  matchId: string; // id sintético para referenciar desde matches posteriores
  roundNumber: number;
  courtNumber: number;
  registrationOne: EliminationSlot;
  registrationTwo: EliminationSlot;
  status: MatchStatus;
  winnerRegistrationId?: UUID; // auto-set si hay BYE
}

export interface EliminationRound {
  roundNumber: number;
  matches: EliminationMatch[];
}

export interface EliminationInput {
  participantIds: UUID[];
  courts: number;
}

export function generateSingleElimination({
  participantIds,
  courts,
}: EliminationInput): EliminationRound[] {
  const n = participantIds.length;
  if (n < 2) throw new Error('Mínimo 2 parejas para eliminación directa');
  if (courts < 1) throw new Error('Mínimo 1 cancha');

  // Siguiente potencia de 2 ≥ n
  const bracketSize = nextPowerOfTwo(n);
  const totalRounds = Math.log2(bracketSize);

  // Construir slots con BYEs intercalados al estilo single-elim estándar
  // (los seeds altos enfrentan BYEs en primera ronda).
  const seeded = seedBracket(participantIds, bracketSize);

  const rounds: EliminationRound[] = [];
  let courtIdx = 0;

  // Ronda 1 — emparejamientos directos (puede haber BYEs)
  const round1Matches: EliminationMatch[] = [];
  for (let i = 0; i < bracketSize; i += 2) {
    const a = seeded[i];
    const b = seeded[i + 1];
    const matchId = `r1-m${i / 2 + 1}`;

    let regOne: EliminationSlot;
    let regTwo: EliminationSlot;
    let status: MatchStatus = SCHEDULED;
    let winner: UUID | undefined;

    if (a && b) {
      regOne = { registrationId: a, winnerOf: null };
      regTwo = { registrationId: b, winnerOf: null };
    } else if (a && !b) {
      // a recibe BYE — avance automático
      regOne = { registrationId: a, winnerOf: null };
      regTwo = { registrationId: null, winnerOf: '__BYE__' };
      status = COMPLETED;
      winner = a;
    } else if (!a && b) {
      regOne = { registrationId: null, winnerOf: '__BYE__' };
      regTwo = { registrationId: b, winnerOf: null };
      status = COMPLETED;
      winner = b;
    } else {
      // BYE vs BYE (no debería pasar con nextPowerOfTwo, pero por safety)
      continue;
    }

    round1Matches.push({
      matchId,
      roundNumber: 1,
      courtNumber: (courtIdx % courts) + 1,
      registrationOne: regOne,
      registrationTwo: regTwo,
      status,
      ...(winner ? { winnerRegistrationId: winner } : {}),
    });
    courtIdx++;
  }
  rounds.push({ roundNumber: 1, matches: round1Matches });

  // Rondas 2..totalRounds — emparejamientos por winnerOf
  let prevRoundMatches = round1Matches;
  for (let r = 2; r <= totalRounds; r++) {
    const matches: EliminationMatch[] = [];
    for (let i = 0; i < prevRoundMatches.length; i += 2) {
      const prevA = prevRoundMatches[i];
      const prevB = prevRoundMatches[i + 1];
      if (!prevA || !prevB) continue;
      const matchId = `r${r}-m${i / 2 + 1}`;

      // Si el match previo ya tiene ganador por BYE, lo propagamos
      const slotOne: EliminationSlot = prevA.winnerRegistrationId
        ? { registrationId: prevA.winnerRegistrationId, winnerOf: null }
        : { registrationId: null, winnerOf: prevA.matchId };
      const slotTwo: EliminationSlot = prevB.winnerRegistrationId
        ? { registrationId: prevB.winnerRegistrationId, winnerOf: null }
        : { registrationId: null, winnerOf: prevB.matchId };

      matches.push({
        matchId,
        roundNumber: r,
        courtNumber: (courtIdx % courts) + 1,
        registrationOne: slotOne,
        registrationTwo: slotTwo,
        status: SCHEDULED,
      });
      courtIdx++;
    }
    rounds.push({ roundNumber: r, matches });
    prevRoundMatches = matches;
  }

  return rounds;
}

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Distribuye N participantes en `size` slots al estilo torneo single-elim:
 * los BYEs (slots vacíos) caen en posiciones de seeds bajos para que los
 * seeds altos pasen ronda 1. Para sembrado simple por orden de entrada
 * sin ranking, devolvemos los participantes en slots 0..n-1 y el resto
 * como `undefined` (BYE).
 *
 * Para producir el "criss-cross" estándar (1 vs 16, 8 vs 9, ...), habría
 * que reordenar; por simplicidad usamos orden de entrada — el caller
 * puede pre-ordenar por ranking si lo necesita.
 */
function seedBracket(ids: UUID[], size: number): (UUID | undefined)[] {
  const slots: (UUID | undefined)[] = new Array(size).fill(undefined);
  // Patrón estándar: emparejar seed[0] vs seed[size-1], seed[1] vs seed[size-2]...
  // Pero para que los BYEs queden distribuidos en pares (no que dos BYEs
  // se enfrenten), llenamos en orden los slots pares y luego los impares.
  const n = ids.length;
  for (let i = 0; i < n; i++) {
    // Posiciones 0, 2, 4, ... primero (top de cada par); luego 1, 3, 5...
    const evens = Math.ceil(size / 2);
    const slot = i < evens ? i * 2 : (i - evens) * 2 + 1;
    slots[slot] = ids[i];
  }
  return slots;
}
