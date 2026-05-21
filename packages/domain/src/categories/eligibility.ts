import type {
  CategoryKind,
  CategoryValue,
  Gender,
  TeamCategory,
} from '../types';
import { categoryValue, isQueensCategory, KING_CATEGORIES, QUEENS_CATEGORIES } from '../types';

/**
 * Categoría de un equipo según las categorías individuales de sus 2 jugadores.
 * Modelo A del super-prompt: equipo es de la categoría del jugador más alto.
 *
 * Para equipos mixtos (1 hombre + 1 mujer) retorna null porque no hay
 * una categoría estándar comparable cross-género (solo aplica Suma).
 */
export function computeTeamCategory(
  playerOne: { skillCategory: TeamCategory; gender?: Gender | null },
  playerTwo: { skillCategory: TeamCategory; gender?: Gender | null },
): TeamCategory | null {
  const isMixto =
    (playerOne.gender === 'male' && playerTwo.gender === 'female') ||
    (playerOne.gender === 'female' && playerTwo.gender === 'male');
  if (isMixto) return null;

  const aQ = isQueensCategory(playerOne.skillCategory);
  const bQ = isQueensCategory(playerTwo.skillCategory);
  if (aQ !== bQ) return null;

  const aVal = categoryValue(playerOne.skillCategory);
  const bVal = categoryValue(playerTwo.skillCategory);
  const list = aQ ? QUEENS_CATEGORIES : KING_CATEGORIES;
  // En pádel, "categoría más alta" = jugador más fuerte = MENOR numeric_value
  const minVal = Math.min(aVal, bVal);
  return list[minVal - 1] ?? null;
}

/**
 * Suma de la pareja (mapeada de los numeric_values).
 * Funciona para parejas same-gender (King-King, Queens-Queens) y mixtas.
 */
export function sumOfPair(a: TeamCategory, b: TeamCategory): number {
  return categoryValue(a) + categoryValue(b);
}

export interface EligibilityInput {
  tournament: {
    categoryKind: CategoryKind;
    category?: TeamCategory | null;
    minSum?: number | null;
    maxPlayerCategoryValue?: number | null;
  };
  playerOne: { skillCategory: TeamCategory; gender?: Gender | null };
  playerTwo?: { skillCategory: TeamCategory; gender?: Gender | null };
}

export type EligibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Valida la elegibilidad de un equipo o jugador individual contra un torneo.
 * Espejo TS de la función SQL `public.validate_registration_eligibility`.
 *
 * Reglas (resumen):
 *  - estandar/queens_estandar: maxValor del equipo debe estar entre
 *    categoría del torneo y +1 banda (1 banda hacia abajo permitida).
 *  - suma/queens_suma/mixto_suma: pair_sum >= min_sum del torneo.
 *  - Opcional: max_player_category_value impone un tope individual.
 *  - mixto_suma: requiere 1M + 1F.
 *  - queens_*: requiere categorías Queens en ambos.
 *  - casual: sin restricción.
 */
export function checkEligibility({
  tournament,
  playerOne,
  playerTwo,
}: EligibilityInput): EligibilityResult {
  const { categoryKind, category, minSum, maxPlayerCategoryValue } = tournament;

  // ---- Inscripción individual (Tier 2 Americano Random) ----
  if (!playerTwo) {
    if (categoryKind === 'casual') return { ok: true };
    if (categoryKind === 'estandar' || categoryKind === 'queens_estandar') {
      if (!category) return { ok: false, reason: 'Torneo sin categoría definida' };
      if (categoryKind === 'queens_estandar' && !isQueensCategory(playerOne.skillCategory)) {
        return { ok: false, reason: 'Queens requiere categoría Queens' };
      }
      if (categoryKind === 'estandar' && isQueensCategory(playerOne.skillCategory)) {
        return { ok: false, reason: 'Estándar masculino requiere categoría masculina' };
      }
      const v = categoryValue(playerOne.skillCategory);
      const targetV = categoryValue(category);
      // En pádel: MENOR valor = MÁS FUERTE. Torneo de 4ta (valor 5) acepta jugadores
      // de su categoría (4ta, valor 5) o 1 banda más fuertes (3ra, valor 4).
      if (v > targetV) {
        return {
          ok: false,
          reason: `Jugador muy débil: tu categoría (${playerOne.skillCategory}) es menor que la del torneo (${category}). No puedes subir 1 banda hacia arriba.`,
        };
      }
      if (v < targetV - 1) {
        return {
          ok: false,
          reason: `Jugador muy fuerte: solo puedes bajar 1 banda. Tu categoría es ${playerOne.skillCategory}, el torneo es ${category}.`,
        };
      }
      return { ok: true };
    }
    return { ok: false, reason: 'Este torneo requiere inscripción por equipo' };
  }

  // ---- Inscripción por equipo (Tier 1 y Liguilla Casual) ----
  if (categoryKind === 'casual') return { ok: true };

  const v1 = categoryValue(playerOne.skillCategory);
  const v2 = categoryValue(playerTwo.skillCategory);
  const pairSum = v1 + v2;
  // En pádel "más alto" = mejor jugador = MENOR numeric_value. El equipo juega al
  // nivel de su mejor jugador.
  const teamStrengthVal = Math.min(v1, v2);

  if (categoryKind === 'estandar' || categoryKind === 'queens_estandar') {
    if (!category) return { ok: false, reason: 'Torneo sin categoría definida' };

    if (categoryKind === 'queens_estandar') {
      if (!isQueensCategory(playerOne.skillCategory) || !isQueensCategory(playerTwo.skillCategory)) {
        return { ok: false, reason: 'Queens requiere ambas jugadoras en categoría Queens' };
      }
    } else {
      if (isQueensCategory(playerOne.skillCategory) || isQueensCategory(playerTwo.skillCategory)) {
        return { ok: false, reason: 'Estándar masculino no acepta categoría Queens' };
      }
    }

    const targetV = categoryValue(category);
    if (teamStrengthVal > targetV) {
      return {
        ok: false,
        reason: `Pareja muy débil: el equipo es de ${categoryAtValue(targetV, isQueensCategory(category))}+ pero ambos jugadores son menores. No se permite subir bandas.`,
      };
    }
    if (teamStrengthVal < targetV - 1) {
      return {
        ok: false,
        reason: `Pareja muy fuerte: solo puedes bajar 1 banda. Tu equipo es de valor ${teamStrengthVal} y el torneo de valor ${targetV}.`,
      };
    }
  }

  if (categoryKind === 'suma' || categoryKind === 'queens_suma' || categoryKind === 'mixto_suma') {
    if (minSum == null) return { ok: false, reason: 'Torneo Suma sin min_sum configurado' };

    if (pairSum < minSum) {
      return {
        ok: false,
        reason: `Suma de pareja (${pairSum}) es menor al mínimo ${minSum} requerido`,
      };
    }

    if (maxPlayerCategoryValue != null) {
      if (v1 < maxPlayerCategoryValue || v2 < maxPlayerCategoryValue) {
        return {
          ok: false,
          reason: `Un jugador supera el tope individual (máx valor permitido: ${maxPlayerCategoryValue})`,
        };
      }
    }

    if (categoryKind === 'mixto_suma') {
      if (!playerOne.gender || !playerTwo.gender) {
        return { ok: false, reason: 'Mixto requiere género asignado en ambos perfiles' };
      }
      const isMixto =
        (playerOne.gender === 'male' && playerTwo.gender === 'female') ||
        (playerOne.gender === 'female' && playerTwo.gender === 'male');
      if (!isMixto) return { ok: false, reason: 'Mixto requiere 1 hombre y 1 mujer' };
    }

    if (categoryKind === 'queens_suma') {
      if (!isQueensCategory(playerOne.skillCategory) || !isQueensCategory(playerTwo.skillCategory)) {
        return { ok: false, reason: 'Queens Suma requiere ambas en categoría Queens' };
      }
    }
  }

  return { ok: true };
}

function categoryAtValue(value: number, queens: boolean): string {
  const list = queens ? QUEENS_CATEGORIES : KING_CATEGORIES;
  return list[value - 1] ?? `valor-${value}`;
}

/**
 * Listado de torneos para los cuales un equipo califica.
 * Útil para el feed personalizado "torneos que tu pareja puede jugar".
 */
export function eligibleTournamentsFor(
  team: { playerOne: { skillCategory: TeamCategory; gender?: Gender | null }; playerTwo: { skillCategory: TeamCategory; gender?: Gender | null } },
  tournaments: EligibilityInput['tournament'][],
): EligibilityInput['tournament'][] {
  return tournaments.filter(
    (t) =>
      checkEligibility({
        tournament: t,
        playerOne: team.playerOne,
        playerTwo: team.playerTwo,
      }).ok,
  );
}
