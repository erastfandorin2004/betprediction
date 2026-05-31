import type { TeamRef } from './fixture';

export interface LeagueRef {
  id: number;
  name: string;
  shortName: string | null;
  logo: string | null;
  country: string;
  countryCode: string | null;
}

export interface League extends LeagueRef {
  season: number;
  type: 'League' | 'Cup' | 'Other';
  startDate: string | null;
  endDate: string | null;
}

export interface StandingRow {
  team: TeamRef;
  rank: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

export interface StandingGroup {
  group: string | null;
  rows: StandingRow[];
}

export interface TopScorer {
  player: { id: number; name: string; photo: string | null };
  team: TeamRef;
  goals: number;
  assists: number;
  played: number;
}
