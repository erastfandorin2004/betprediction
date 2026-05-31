export interface FdCompetition {
  id: number;
  area: { id: number; name: string; code: string; flag: string | null };
  code: string;
  name: string;
  type: string;
  emblem: string | null;
  currentSeason: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number | null;
  } | null;
}

export interface FdTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string | null;
  area?: { name: string; code: string };
}

export interface FdScore {
  winner: string | null;
  duration: string;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface FdMatch {
  id: number;
  competition: { id: number; code: string; name: string };
  season: { id: number; startDate: string; endDate: string; currentMatchday: number | null };
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  group: string | null;
  lastUpdated: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: FdScore;
  venue?: string;
}

export interface FdPlayer {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  shirtNumber: number | null;
}

export interface FdTeamDetail {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string | null;
  area: { name: string; code: string };
  coach: { name: string | null } | null;
  squad: FdPlayer[];
}

export interface FdStandingRow {
  position: number;
  team: { id: number; name: string; shortName: string; crest: string | null };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}

export interface FdStandingGroup {
  stage: string;
  type: string;
  group: string | null;
  table: FdStandingRow[];
}

export interface FdStandingsResponse {
  standings: FdStandingGroup[];
}

export interface FdCompetitionsResponse {
  competitions: FdCompetition[];
}

export interface FdMatchesResponse {
  filters: Record<string, string>;
  resultSet: { count: number; competitions: string; first: string; last: string; played: number };
  matches: FdMatch[];
}
