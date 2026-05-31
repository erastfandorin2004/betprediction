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

export interface FdCompetitionsResponse {
  competitions: FdCompetition[];
}

export interface FdMatchesResponse {
  filters: Record<string, string>;
  resultSet: { count: number; competitions: string; first: string; last: string; played: number };
  matches: FdMatch[];
}
