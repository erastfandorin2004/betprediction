import type { SportRef } from './common';
import type { LeagueRef } from './league';
import type { PredictionBadge, PredictionDetail } from './prediction';

export type FixtureStatus =
  | 'scheduled'
  | 'live'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'suspended';

export interface Score {
  home: number;
  away: number;
  halfTime?: { home: number; away: number };
}

export interface TeamRef {
  id: number;
  name: string;
  shortName: string;
  logo: string | null;
}

export interface Venue {
  id: number;
  name: string;
  city: string;
  capacity: number | null;
}

export type MatchEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty'
  | 'missed_penalty'
  | 'yellow_card'
  | 'red_card'
  | 'yellow_red_card'
  | 'substitution';

export interface MatchEvent {
  id: number;
  minute: number;
  extraMinute: number | null;
  type: MatchEventType;
  team: 'home' | 'away';
  player: { id: number; name: string } | null;
  assist: { id: number; name: string } | null;
  detail: string | null;
}

export interface TeamMatchStats {
  possession: number | null;
  shots: number | null;
  shotsOnTarget: number | null;
  corners: number | null;
  fouls: number | null;
  offsides: number | null;
  yellowCards: number | null;
  redCards: number | null;
  xG: number | null;
}

export interface MatchStats {
  home: TeamMatchStats;
  away: TeamMatchStats;
}

export interface FormRecord {
  fixtureId: number;
  opponent: TeamRef;
  result: 'W' | 'D' | 'L';
  score: Score;
  isHome: boolean;
  date: string;
}

export interface TeamForm {
  team: TeamRef;
  last5: FormRecord[];
  last5Home: FormRecord[];
  last5Away: FormRecord[];
  currentStreak: { type: 'W' | 'D' | 'L' | 'unbeaten'; count: number } | null;
}

export interface H2HRecord {
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  meetings: Array<{
    fixtureId: number;
    date: string;
    homeTeam: TeamRef;
    awayTeam: TeamRef;
    score: Score;
  }>;
  summary: {
    totalMeetings: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    avgGoals: number;
    bttsRate: number;
    over2_5Rate: number;
  };
}

export interface PlayerLineup {
  id: number;
  name: string;
  number: number | null;
  position: string | null;
  isStarter: boolean;
  photo: string | null;
}

export interface InjuryReport {
  player: { id: number; name: string };
  type: 'injury' | 'suspension';
  reason: string | null;
  expectedReturn: string | null;
}

export interface Lineups {
  home: {
    formation: string | null;
    starters: PlayerLineup[];
    substitutes: PlayerLineup[];
    injuries: InjuryReport[];
  };
  away: {
    formation: string | null;
    starters: PlayerLineup[];
    substitutes: PlayerLineup[];
    injuries: InjuryReport[];
  };
  confirmed: boolean;
}

export interface TeamStandingRow {
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

export interface TeamStandings {
  home: TeamStandingRow | null;
  away: TeamStandingRow | null;
}

export interface FixtureListItem {
  id: number;
  sport: SportRef;
  league: LeagueRef;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  startsAt: string;
  status: FixtureStatus;
  minute: number | null;
  score: Score | null;
  prediction: PredictionBadge | null;
  hasValue: boolean;
  isFavorite: boolean;
}

export interface FixtureDetail {
  id: number;
  sport: SportRef;
  league: LeagueRef;
  round: string | null;
  venue: Venue | null;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  startsAt: string;
  status: FixtureStatus;
  minute: number | null;
  score: Score | null;
  events: MatchEvent[];
  stats: MatchStats | null;
  lineups: Lineups | null;
  h2h: H2HRecord | null;
  standings: TeamStandings;
  prediction: PredictionDetail | null;
}
