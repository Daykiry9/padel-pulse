export type UUID = string;
export type ISODate = string;

// ============================================================
// Categorías (v3 — expandidas + Queens estructural)
// ============================================================

export type TeamCategory =
  // Masculino (estructura nueva, 1-6)
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  // Mixto (estructura nueva, A-D)
  | 'mixto_a'
  | 'mixto_b'
  | 'mixto_c'
  | 'mixto_d'
  // Femenino (estructura nueva, A-D)
  | 'femenino_a'
  | 'femenino_b'
  | 'femenino_c'
  | 'femenino_d'
  // Legacy masculino (queda por compatibilidad de data antigua, no se ofrece en UI)
  | 'libre'
  | 'primera'
  | 'segunda'
  | 'tercera'
  | 'cuarta'
  | 'quinta'
  | 'sexta'
  | 'septima'
  // Legacy Queens (queda por compatibilidad)
  | 'queens_libre'
  | 'queens_a'
  | 'queens_b'
  | 'queens_c'
  | 'queens_d'
  | 'queens_e';

export type CategoryKind =
  | 'estandar'
  | 'suma'
  | 'mixto_estandar'
  | 'mixto_suma'
  | 'queens_estandar'
  | 'queens_suma'
  | 'casual';

export type CategoryValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const CATEGORY_VALUES: Record<TeamCategory, CategoryValue> = {
  // Masculino nuevo (1 = mejor, 6 = principiante)
  '1': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  // Mixto
  mixto_a: 2,
  mixto_b: 3,
  mixto_c: 4,
  mixto_d: 5,
  // Femenino
  femenino_a: 2,
  femenino_b: 3,
  femenino_c: 4,
  femenino_d: 5,
  // Legacy (data antigua)
  libre: 1,
  primera: 2,
  segunda: 3,
  tercera: 4,
  cuarta: 5,
  quinta: 6,
  sexta: 7,
  septima: 8,
  queens_libre: 1,
  queens_a: 2,
  queens_b: 3,
  queens_c: 4,
  queens_d: 5,
  queens_e: 6,
};

export function categoryValue(c: TeamCategory): CategoryValue {
  return CATEGORY_VALUES[c];
}

export function isQueensCategory(c: TeamCategory): boolean {
  return c.startsWith('queens_') || c.startsWith('femenino_');
}

/**
 * Etiqueta amigable para cada categoría. Único source-of-truth — todas las
 * vistas deben leerlo desde acá para que un cambio sea consistente.
 * Tipo Record<string, string> (no Record<TeamCategory>) para indexación con
 * strings arbitrarios sin error (devuelve undefined si no existe la key).
 */
export const CATEGORY_LABELS: Record<string, string> = {
  // Masculino (nuevo, 1-6)
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  // Mixto (A-D)
  mixto_a: 'Mixto A',
  mixto_b: 'Mixto B',
  mixto_c: 'Mixto C',
  mixto_d: 'Mixto D',
  // Femenino (A-D)
  femenino_a: 'Femenino A',
  femenino_b: 'Femenino B',
  femenino_c: 'Femenino C',
  femenino_d: 'Femenino D',
  // Legacy masculino
  libre: 'Libre / Pro',
  primera: '1ra',
  segunda: '2da',
  tercera: '3ra',
  cuarta: '4ta',
  quinta: '5ta',
  sexta: '6ta',
  septima: '7ma',
  // Legacy queens
  queens_libre: 'Queens Libre',
  queens_a: 'Queens A',
  queens_b: 'Queens B',
  queens_c: 'Queens C',
  queens_d: 'Queens D',
  queens_e: 'Queens E',
};

/** Helper: etiqueta segura para cualquier categoría (string o null). */
export function categoryLabel(c: TeamCategory | string | null | undefined): string {
  if (!c) return '—';
  return CATEGORY_LABELS[c as TeamCategory] ?? c;
}

/** Etiquetas compactas para badges / chips donde el espacio es escaso. */
export const CATEGORY_LABELS_SHORT: Record<string, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  mixto_a: 'Mx A',
  mixto_b: 'Mx B',
  mixto_c: 'Mx C',
  mixto_d: 'Mx D',
  femenino_a: 'F A',
  femenino_b: 'F B',
  femenino_c: 'F C',
  femenino_d: 'F D',
  libre: 'Libre',
  primera: '1ra',
  segunda: '2da',
  tercera: '3ra',
  cuarta: '4ta',
  quinta: '5ta',
  sexta: '6ta',
  septima: '7ma',
  queens_libre: 'Q Libre',
  queens_a: 'Q A',
  queens_b: 'Q B',
  queens_c: 'Q C',
  queens_d: 'Q D',
  queens_e: 'Q E',
};

// Sets actuales (los que ofrece el UI desde 2026-05-28).
export const MASCULINO_CATEGORIES: TeamCategory[] = ['1', '2', '3', '4', '5', '6'];
// Mixto: A, B, C (sin D, ajuste Gabriel 2026-05-31).
// 'mixto_d' sigue siendo TeamCategory legal en tipo/label para no romper data
// histórica, pero no se ofrece en el UI.
export const MIXTO_CATEGORIES: TeamCategory[] = ['mixto_a', 'mixto_b', 'mixto_c'];
export const FEMENINO_CATEGORIES: TeamCategory[] = [
  'femenino_a',
  'femenino_b',
  'femenino_c',
  'femenino_d',
];

// Legacy (data anterior; el UI no los muestra como opción, pero quedan para
// renderizar perfiles/torneos viejos).
export const KING_CATEGORIES: TeamCategory[] = [
  'libre',
  'primera',
  'segunda',
  'tercera',
  'cuarta',
  'quinta',
  'sexta',
  'septima',
];
export const QUEENS_CATEGORIES: TeamCategory[] = [
  'queens_libre',
  'queens_a',
  'queens_b',
  'queens_c',
  'queens_d',
  'queens_e',
];

export const ALL_CATEGORIES: TeamCategory[] = [
  ...MASCULINO_CATEGORIES,
  ...MIXTO_CATEGORIES,
  ...FEMENINO_CATEGORIES,
  ...KING_CATEGORIES,
  ...QUEENS_CATEGORIES,
];

// ============================================================
// Tier y formato
// ============================================================

export type TournamentTier = 'competitivo' | 'casual';
export type TournamentFormat =
  | 'americano_fijo'
  | 'americano_random'
  | 'liguilla_casual'
  | 'liga'
  | 'express'
  | 'eliminacion';

export type CompetitionUnit = 'team' | 'player';
export type PairingMode = 'fixed' | 'random' | 'mixed';

export const TIER_WEIGHT: Record<TournamentTier, number> = {
  competitivo: 1.0,
  casual: 0.4,
};

export const TIER_BY_FORMAT: Record<TournamentFormat, TournamentTier> = {
  americano_fijo: 'competitivo',
  liga: 'competitivo',
  express: 'competitivo',
  eliminacion: 'competitivo',
  americano_random: 'casual',
  liguilla_casual: 'casual',
};

export function tierOf(format: TournamentFormat): TournamentTier {
  return TIER_BY_FORMAT[format];
}

export function weightOf(format: TournamentFormat): number {
  return TIER_WEIGHT[tierOf(format)];
}

// ============================================================
// Otros enums
// ============================================================

export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'disputed';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';
export type MemberRole = 'owner' | 'admin' | 'member';
export type RegistrationStatus = 'pending_payment' | 'confirmed' | 'waitlist' | 'cancelled';
export type SponsorTier = 'platform' | 'community' | 'tournament';
export type SponsorSlot = 'title' | 'official' | 'partner';
export type Gender = 'male' | 'female' | 'nonbinary' | 'prefer_not_to_say';
export type CategoryChangeStatus = 'suggested' | 'approved' | 'rejected' | 'auto_applied';

// ============================================================
// Entidades del dominio
// ============================================================

export interface Profile {
  id: UUID;
  displayName: string;
  avatarUrl?: string | null;
  city?: string | null;
  skillLevel: SkillLevel;
  skillCategory?: TeamCategory | null;
  gender?: Gender | null;
  rating: number;
}

export interface City {
  id: UUID;
  slug: string;
  name: string;
  region?: string | null;
}

export interface Community {
  id: UUID;
  slug: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  city: string;
  cityId?: UUID | null;
  country: string;
  ownerId: UUID;
  rating: number;
  createdAt: ISODate;
}

export interface Club {
  id: UUID;
  slug: string;
  name: string;
  city: string;
  cityId?: UUID | null;
  country: string;
  logoUrl?: string | null;
  ownerId: UUID;
}

export interface Team {
  id: UUID;
  slug: string;
  name: string;
  logoUrl?: string | null;
  primaryCommunityId: UUID;
  category?: TeamCategory | null;
  rating: number;
  isActive: boolean;
  createdAt: ISODate;
  dissolvedAt?: ISODate | null;
}

export interface TeamMember {
  id: UUID;
  teamId: UUID;
  profileId: UUID;
  isActive: boolean;
  joinedAt: ISODate;
  leftAt?: ISODate | null;
}

export interface Tournament {
  id: UUID;
  slug: string;
  name: string;
  format: TournamentFormat;
  tier: TournamentTier;
  weight: number;
  status: TournamentStatus;
  categoryKind: CategoryKind;
  category?: TeamCategory | null;
  minSum?: number | null;
  maxPlayerCategoryValue?: number | null;
  competitionUnit: CompetitionUnit;
  pairingMode?: PairingMode | null;
  clubId: UUID;
  cityId?: UUID | null;
  startsAt: ISODate;
  endsAt: ISODate;
  registrationDeadline: ISODate;
  pricePerTeam: number;
  maxTeams: number;
  minTeams: number;
  rotationGames: number;
  description?: string | null;
  bannerUrl?: string | null;
}

export interface TournamentRegistration {
  id: UUID;
  tournamentId: UUID;
  teamId?: UUID | null;
  playerId?: UUID | null;
  playerOneId?: UUID | null;
  playerTwoId?: UUID | null;
  registeredBy: UUID;
  status: RegistrationStatus;
  paymentAmount: number;
  registeredAt: ISODate;
  confirmedAt?: ISODate | null;
}

export interface Match {
  id: UUID;
  tournamentId: UUID;
  roundNumber: number;
  courtNumber: number;
  registrationOneId: UUID;
  registrationTwoId: UUID;
  scoreOne?: number | null;
  scoreTwo?: number | null;
  status: MatchStatus;
  scheduledAt?: ISODate | null;
  startedAt?: ISODate | null;
  endedAt?: ISODate | null;
  confirmedByOne: boolean;
  confirmedByTwo: boolean;
}

// ============================================================
// Americano (algoritmo)
// ============================================================

export interface AmericanoRound {
  roundNumber: number;
  matches: AmericanoMatch[];
  resting: UUID[];
}

export interface AmericanoMatch {
  roundNumber: number;
  courtNumber: number;
  pairOne: PairSnapshot;
  pairTwo: PairSnapshot;
  status: MatchStatus;
  scorePairOne?: number;
  scorePairTwo?: number;
}

export interface PairSnapshot {
  playerOneId: UUID;
  playerTwoId: UUID;
}

// ============================================================
// Ranking
// ============================================================

export type RankingPeriod = 'monthly' | 'quarterly' | 'semestral' | 'annual' | 'all_time';
export type RankingScope = 'community' | 'city' | 'national';
export type RankingKind = 'official' | 'by_sum' | 'casual';

export interface TeamRankingOfficialEntry {
  rank: number;
  teamId: UUID;
  teamName: string;
  teamLogoUrl?: string | null;
  category?: TeamCategory | null;
  communityId: UUID;
  communityName: string;
  cityName?: string | null;
  eloRating: number;
  absolutePoints: number;
  tournamentsPlayed: number;
}

export interface TeamRankingBySumEntry {
  rank: number;
  teamId: UUID;
  teamName: string;
  teamSum: number;
  communityId: UUID;
  communityName: string;
  eloRating: number;
  absolutePoints: number;
}

export interface PlayerRankingCasualEntry {
  rank: number;
  profileId: UUID;
  displayName: string;
  category?: TeamCategory | null;
  casualPoints: number;
  tournamentsPlayed: number;
}

export interface CommunityRankingEntry {
  rank: number;
  communityId: UUID;
  communityName: string;
  cityName?: string | null;
  communityPoints: number;
  avgEloTop5: number;
  activeTeams: number;
}

export interface CategoryChangeSuggestion {
  id: UUID;
  profileId: UUID;
  currentCategory?: TeamCategory | null;
  suggestedCategory: TeamCategory;
  reason: string;
  evidencePoints?: number | null;
  evidenceWinsVsHigher?: number | null;
  status: CategoryChangeStatus;
  reviewedBy?: UUID | null;
  reviewedAt?: ISODate | null;
  createdAt: ISODate;
}
