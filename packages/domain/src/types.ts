export type UUID = string;
export type ISODate = string;

export type TournamentFormat = 'americano' | 'mexicano' | 'league';
export type TournamentStatus = 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
export type MatchStatus = 'scheduled' | 'in_progress' | 'completed' | 'disputed';
export type Gender = 'mixed' | 'male' | 'female';
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'pro';

export interface Player {
  id: UUID;
  userId: UUID;
  displayName: string;
  avatarUrl?: string | null;
  skillLevel: SkillLevel;
  rating: number;
}

export interface Community {
  id: UUID;
  slug: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  city: string;
  country: string;
  ownerId: UUID;
  createdAt: ISODate;
  memberCount: number;
  rating: number;
}

export interface Club {
  id: UUID;
  slug: string;
  name: string;
  city: string;
  country: string;
  logoUrl?: string | null;
  ownerId: UUID;
}

export interface Tournament {
  id: UUID;
  slug: string;
  name: string;
  format: TournamentFormat;
  status: TournamentStatus;
  gender: Gender;
  clubId: UUID;
  startsAt: ISODate;
  endsAt: ISODate;
  registrationDeadline: ISODate;
  pricePerPair: number;
  maxPairs: number;
  rotationGames: number;
  description?: string | null;
  bannerUrl?: string | null;
  sponsorName?: string | null;
  sponsorLogoUrl?: string | null;
}

export interface Pair {
  id: UUID;
  tournamentId: UUID;
  communityId: UUID;
  playerOneId: UUID;
  playerTwoId: UUID;
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

export interface CommunityRankingEntry {
  rank: number;
  communityId: UUID;
  communityName: string;
  communityLogoUrl?: string | null;
  city: string;
  points: number;
  rating: number;
  tournamentsPlayed: number;
  tournamentsWon: number;
  matchesWon: number;
  matchesPlayed: number;
}

export interface PlayerRankingEntry {
  rank: number;
  playerId: UUID;
  displayName: string;
  avatarUrl?: string | null;
  communityId?: UUID;
  communityName?: string;
  rating: number;
  matchesPlayed: number;
  matchesWon: number;
  winRate: number;
}
