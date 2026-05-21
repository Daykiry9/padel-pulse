import type { AmericanoRound, MatchStatus, UUID } from '../types';

/**
 * Algoritmo de pareo del Americano.
 *
 * Modalidad FIXED — los participantes son parejas (cada `participantId`
 * representa una pareja registrada). Round-robin de parejas: cada pareja
 * enfrenta a cada otra una vez (n-1 rondas para n parejas).
 *
 * Modalidad RANDOM — los participantes son jugadores individuales. En
 * cada ronda se forman 4 jugadores por cancha (2 vs 2) maximizando
 * variedad de compañeros y rivales.
 *
 * Reglas comunes:
 *  - Si #participantes > slots disponibles, hay descanso rotativo
 *    distribuido equitativamente.
 *  - El algoritmo prioriza no repetir rival/compañero hasta inevitable.
 */
const SCHEDULED: MatchStatus = 'scheduled';

export type PairingMode = 'fixed' | 'random';

export interface AmericanoPairingInput {
  participantIds: UUID[]; // en FIXED, son IDs de pareja; en RANDOM, IDs de jugador
  courts: number;
  rounds?: number; // si se omite, se calcula automáticamente
  mode: PairingMode;
}

// ============================================================
// FIXED — round-robin clásico de parejas
// ============================================================
export function generateFixedAmericano({
  participantIds,
  courts,
}: Omit<AmericanoPairingInput, 'mode' | 'rounds'>): AmericanoRound[] {
  const n = participantIds.length;
  if (n < 2) throw new Error('Mínimo 2 parejas');

  const slotsPerRound = courts * 1; // cada cancha enfrenta 2 parejas
  if (slotsPerRound < 1) throw new Error('Mínimo 1 cancha');

  // Round-robin de Berger: el equipo 0 queda fijo, los demás rotan.
  // Si n es impar, agregamos un "bye" (slot vacío → descanso).
  const teams = n % 2 === 0 ? [...participantIds] : [...participantIds, '__BYE__'];
  const total = teams.length;
  const totalRounds = total - 1;

  const rounds: AmericanoRound[] = [];

  for (let r = 0; r < totalRounds; r++) {
    const matches = [];
    const resting: UUID[] = [];
    const pairs: [UUID | '__BYE__', UUID | '__BYE__'][] = [];

    for (let i = 0; i < total / 2; i++) {
      const home = teams[i]!;
      const away = teams[total - 1 - i]!;
      if (home === '__BYE__') {
        resting.push(away);
        continue;
      }
      if (away === '__BYE__') {
        resting.push(home);
        continue;
      }
      pairs.push([home, away]);
    }

    // Distribuir parejas en canchas (round-robin de partidos)
    let courtIdx = 0;
    for (const [a, b] of pairs) {
      if (courtIdx >= courts) break;
      matches.push({
        roundNumber: r + 1,
        courtNumber: courtIdx + 1,
        pairOne: { playerOneId: a as UUID, playerTwoId: '' as UUID },
        pairTwo: { playerOneId: b as UUID, playerTwoId: '' as UUID },
        status: SCHEDULED,
      });
      courtIdx++;
    }

    // Si hay más enfrentamientos que canchas en esta ronda, los que no juegan descansan
    if (pairs.length > courts) {
      for (let i = courts; i < pairs.length; i++) {
        const [a, b] = pairs[i]!;
        if (a !== '__BYE__') resting.push(a);
        if (b !== '__BYE__') resting.push(b);
      }
    }

    rounds.push({ roundNumber: r + 1, matches, resting });

    // Rotar (Berger): el 0 fijo, los demás giran
    const fixed = teams[0]!;
    const rotating = teams.slice(1);
    const last = rotating.pop()!;
    rotating.unshift(last);
    teams.splice(0, total, fixed, ...rotating);
  }

  return rounds;
}

// ============================================================
// RANDOM — pareo dinámico minimizando repeticiones de compañero/rival
// ============================================================
export function generateRandomAmericano({
  participantIds,
  courts,
  rounds: requestedRounds,
}: Omit<AmericanoPairingInput, 'mode'>): AmericanoRound[] {
  const n = participantIds.length;
  if (n < 4) throw new Error('Mínimo 4 jugadores para Americano Random');

  const slotsPerRound = Math.min(courts * 4, n - (n % 4)); // múltiplo de 4
  if (slotsPerRound < 4) throw new Error('No hay suficientes jugadores y canchas para 1 partido');

  const totalRounds = requestedRounds ?? Math.max(7, n - 1);

  // Track histórico de compañeros y rivales para penalizar repeticiones
  const partnerCount = new Map<string, number>();
  const opponentCount = new Map<string, number>();
  const restCount = new Map<UUID, number>();
  participantIds.forEach((id) => restCount.set(id, 0));

  const keyPair = (a: UUID, b: UUID) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const incr = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

  const rounds: AmericanoRound[] = [];

  for (let r = 0; r < totalRounds; r++) {
    // Seleccionar quién juega esta ronda (los que menos han descansado siguen activos)
    const sorted = [...participantIds].sort((a, b) => {
      const ra = restCount.get(a) ?? 0;
      const rb = restCount.get(b) ?? 0;
      if (ra !== rb) return ra - rb;
      return a < b ? -1 : 1;
    });
    const active = sorted.slice(0, slotsPerRound);
    const resting = sorted.slice(slotsPerRound);
    resting.forEach((id) => restCount.set(id, (restCount.get(id) ?? 0) + 1));

    // Para cada cancha: elegir 4 jugadores y armar 2 parejas minimizando repetidos
    const remaining = [...active];
    shuffleStable(remaining, r); // pseudo-shuffle por seed para determinismo
    const matches = [];

    for (let c = 0; c < courts && remaining.length >= 4; c++) {
      // Tomar los primeros 4 disponibles
      const four = remaining.splice(0, 4);

      // De los 3 emparejamientos posibles, elegir el que menos repite
      const candidates: { pairs: [[UUID, UUID], [UUID, UUID]]; score: number }[] = [
        {
          pairs: [
            [four[0]!, four[1]!],
            [four[2]!, four[3]!],
          ],
          score: 0,
        },
        {
          pairs: [
            [four[0]!, four[2]!],
            [four[1]!, four[3]!],
          ],
          score: 0,
        },
        {
          pairs: [
            [four[0]!, four[3]!],
            [four[1]!, four[2]!],
          ],
          score: 0,
        },
      ];

      for (const cand of candidates) {
        const [p1, p2] = cand.pairs;
        const partA = partnerCount.get(keyPair(p1[0], p1[1])) ?? 0;
        const partB = partnerCount.get(keyPair(p2[0], p2[1])) ?? 0;
        const oppPairs = [
          [p1[0], p2[0]],
          [p1[0], p2[1]],
          [p1[1], p2[0]],
          [p1[1], p2[1]],
        ] as const;
        const oppSum = oppPairs.reduce(
          (acc, [x, y]) => acc + (opponentCount.get(keyPair(x, y)) ?? 0),
          0,
        );
        cand.score = (partA + partB) * 3 + oppSum;
      }

      candidates.sort((a, b) => a.score - b.score);
      const best = candidates[0]!;
      const [p1, p2] = best.pairs;

      incr(partnerCount, keyPair(p1[0], p1[1]));
      incr(partnerCount, keyPair(p2[0], p2[1]));
      incr(opponentCount, keyPair(p1[0], p2[0]));
      incr(opponentCount, keyPair(p1[0], p2[1]));
      incr(opponentCount, keyPair(p1[1], p2[0]));
      incr(opponentCount, keyPair(p1[1], p2[1]));

      matches.push({
        roundNumber: r + 1,
        courtNumber: c + 1,
        pairOne: { playerOneId: p1[0], playerTwoId: p1[1] },
        pairTwo: { playerOneId: p2[0], playerTwoId: p2[1] },
        status: SCHEDULED,
      });
    }

    rounds.push({ roundNumber: r + 1, matches, resting });
  }

  return rounds;
}

// ============================================================
// API unificada
// ============================================================
export function generateAmericanoPairing(input: AmericanoPairingInput): AmericanoRound[] {
  if (input.mode === 'fixed') {
    return generateFixedAmericano({
      participantIds: input.participantIds,
      courts: input.courts,
    });
  }
  return generateRandomAmericano({
    participantIds: input.participantIds,
    courts: input.courts,
    rounds: input.rounds,
  });
}

// Pseudo-shuffle determinístico para tener tests reproducibles
function shuffleStable<T>(arr: T[], seed: number): void {
  let s = seed * 2654435761;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s ^ (s >>> 16)) >>> 0;
    s = (s * 2246822507) >>> 0;
    const j = s % (i + 1);
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}
