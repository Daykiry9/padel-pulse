export type UUID = string;
export type ISODate = string;

export type TeamCategory =
  | 'primera'
  | 'segunda'
  | 'tercera'
  | 'cuarta'
  | 'quinta'
  | 'mixto'
  | 'queens_1'
  | 'queens_2'
  | 'queens_3'
  | 'queens_4'
  | 'queens_5';

export type TournamentFormat = 'americano' | 'express' | 'league' | 'elimination';
export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'disputed';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';
export type MemberRole = 'owner' | 'admin' | 'member';
export type RegistrationStatus = 'pending_payment' | 'confirmed' | 'waitlist' | 'cancelled';
export type SponsorTier = 'platform' | 'community' | 'tournament';
export type SponsorSlot = 'title' | 'official' | 'partner';

export const KING_CATEGORIES: TeamCategory[] = [
  'primera',
  'segunda',
  'tercera',
  'cuarta',
  'quinta',
  'mixto',
];

export const QUEENS_CATEGORIES: TeamCategory[] = [
  'queens_1',
  'queens_2',
  'queens_3',
  'queens_4',
  'queens_5',
];

export const ALL_CATEGORIES: TeamCategory[] = [...KING_CATEGORIES, ...QUEENS_CATEGORIES];

export function isQueensCategory(category: TeamCategory): boolean {
  return QUEENS_CATEGORIES.includes(category);
}

export interface Profile {
  id: UUID;
  displayName: string;
  avatarUrl?: string | null;
  city?: string | null;
  skillLevel: SkillLevel;
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
  category: TeamCategory;
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
  invitedBy?: UUID | null;
}

export interface Tournament {
  id: UUID;
  slug: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  category?: TeamCategory | null;
  clubId: UUID;
  cityId?: UUID | null;
  startsAt: ISODate;
  endsAt: ISODate;
  registrationDeadline: ISODate;
  pricePerTeam: number;
  maxTeams: number;
  minTeams: number;
  rotationGames: number;
  allowsPro: boolean;
  description?: string | null;
  bannerUrl?: string | null;
}

export interface TournamentRegistration {
  id: UUID;
  tournamentId: UUID;
  teamId: UUID;
  playerOneId: UUID;
  playerTwoId: UUID;
  registeredBy: UUID;
  status: RegistrationStatus;
  paymentAmount: number;
  paymentProviderRef?: string | null;
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

export interface AmericanoRound {
  roundNumber: number;
  matches: AmericanoMatch[];
}

export interface AmericanoMatch {
  id?: UUID;
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

export type RankingPeriod = 'monthly' | 'quarterly' | 'semestral' | 'annual' | 'all_time';
export type RankingScope = 'community' | 'city' | 'national';

export interface TeamPointsEntry {
  teamId: UUID;
  tournamentId: UUID;
  communityId: UUID;
  category: TeamCategory;
  position: number;
  points: number;
  awardedAt: ISODate;
}

export interface TeamRankingEntry {
  rank: number;
  teamId: UUID;
  teamName: string;
  teamLogoUrl?: string | null;
  category: TeamCategory;
  communityId: UUID;
  communityName: string;
  cityName?: string | null;
  eloRating: number;
  absolutePoints: number;
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
