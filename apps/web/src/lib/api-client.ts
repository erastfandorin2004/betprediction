import type {
  FixtureListItem,
  FixtureDetail,
  League,
  PaginationMeta,
  TrackRecordStats,
  BacktestSummary,
  PredictionHistoryItem,
  LvsDay,
  LvsHistoryItem,
} from '@ai-score/shared';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  path: string,
  init: RequestInit & { revalidate?: number; tags?: string[] } = {},
): Promise<T> {
  const { revalidate = 60, tags, ...options } = init;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    next: { revalidate, ...(tags ? { tags } : {}) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: 'Request failed' })) as {
      message?: string;
    };
    throw new ApiError(res.status, body.message ?? 'Request failed');
  }

  const json = (await res.json()) as { data: T };
  return json.data;
}

export interface FixtureListResult {
  items: FixtureListItem[];
  meta: PaginationMeta;
}

export interface FixtureListParams {
  date?: string;
  status?: string;
  leagueId?: number;
  sportId?: number;
  page?: number;
  limit?: number;
}

function buildQs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined) as [string, string | number][];
  if (!entries.length) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

export interface SquadPlayer {
  id: number;
  name: string;
  position: string | null;
  shirtNumber: number | null;
  nationality: string | null;
}

/** Roster member from FlashScore squad (has shirt number). */
export interface SquadMember {
  id: string;
  name: string;
  position: string;
  shirtNumber: number | null;
}

export interface MatchSummary {
  id: number;
  startsAt: string;
  status: string;
  scoreHome: number | null;
  scoreAway: number | null;
  homeTeam: { id: number; name: string; shortName: string; logo: string | null };
  awayTeam: { id: number; name: string; shortName: string; logo: string | null };
}

export interface StandingRow {
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
}

export interface H2HMatch {
  id: number;
  date: string;
  status: string;
  league: string;
  country: string;
  season: number;
  venue: string | null;
  homeTeam: { name: string; logo: string };
  awayTeam: { name: string; logo: string };
  scoreHome: number | null;
  scoreAway: number | null;
  scoreHtHome: number | null;
  scoreHtAway: number | null;
}

export interface NewsArticle {
  title: string;
  description: string | null;
  url: string;
  source: string;
  publishedAt: string;
  urlToImage: string | null;
}

export interface LineupPlayer {
  id: string;
  name: string;
  number: number | null;
}

export interface TeamLineup {
  formation: string;
  lines: number[];
  coach: string | null;
  startingXI: LineupPlayer[];
  substitutes: LineupPlayer[];
}

export interface MatchLineups {
  home: TeamLineup;
  away: TeamLineup;
}

export interface MatchStat {
  name: string;
  home: string;
  away: string;
}

export type SummaryEventType = 'goal' | 'penalty_goal' | 'penalty_missed' | 'yellow' | 'red' | 'marker';

export interface SummaryEvent {
  time: string;
  team: 'home' | 'away' | null;
  type: SummaryEventType;
  player: string | null;
  assist: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
}

export interface FixtureContext {
  homeForm: MatchSummary[];
  awayForm: MatchSummary[];
  homeFormFlash: H2HMatch[];
  awayFormFlash: H2HMatch[];
  h2hWc: MatchSummary[];
  h2hAll: H2HMatch[];
  lineups: MatchLineups | null;
  stats: MatchStat[] | null;
  summary: SummaryEvent[] | null;
  homeSquad: SquadPlayer[];
  awaySquad: SquadPlayer[];
  homeSquadFlash: SquadMember[];
  awaySquadFlash: SquadMember[];
  homeCoach: { name: string } | null;
  awayCoach: { name: string } | null;
  homeGroup: { group: string | null; table: StandingRow[]; teamRow: StandingRow } | null;
  awayGroup: { group: string | null; table: StandingRow[]; teamRow: StandingRow } | null;
  news: NewsArticle[];
}

export interface WorldCupDay {
  date: string;
  fixtures: FixtureListItem[];
}

export const api = {
  fixtures: {
    list: (params: FixtureListParams = {}) =>
      apiFetch<FixtureListResult>(`/v1/fixtures${buildQs(params as Record<string, string | number | undefined>)}`, {
        revalidate: 60,
        tags: ['fixtures'],
      }),
    live: () =>
      apiFetch<FixtureListItem[]>('/v1/fixtures/live', { revalidate: 0 }),
    get: (id: number) =>
      apiFetch<FixtureDetail>(`/v1/fixtures/${id}`, {
        revalidate: 60,
        tags: [`fixture-${id}`],
      }),
    context: (id: number, locale = 'en') =>
      apiFetch<FixtureContext>(`/v1/fixtures/${id}/context?locale=${locale}`, {
        revalidate: 1800,
        tags: [`fixture-context-${id}-${locale}`],
      }),
    worldCup: () =>
      apiFetch<WorldCupDay[]>('/v1/fixtures/world-cup', {
        revalidate: 300,
        tags: ['world-cup'],
      }),
  },
  leagues: {
    list: (sportId = 1) =>
      apiFetch<League[]>(`/v1/leagues?sportId=${sportId}`, { revalidate: 3600 }),
    get: (id: number) =>
      apiFetch<League>(`/v1/leagues/${id}`, { revalidate: 3600 }),
  },
  trackRecord: {
    get: () =>
      apiFetch<TrackRecordStats>('/v1/predictions/track-record', { revalidate: 300 }),
  },
  backtest: {
    get: () =>
      apiFetch<BacktestSummary | null>('/v1/predictions/backtest', { revalidate: 300 }),
  },
  history: {
    get: () =>
      apiFetch<PredictionHistoryItem[]>('/v1/predictions/history', { revalidate: 30 }),
  },
  lvs: {
    fixtures: () =>
      apiFetch<LvsDay[]>('/v1/lvs/fixtures', { revalidate: 60, tags: ['lvs'] }),
    history: () =>
      apiFetch<LvsHistoryItem[]>('/v1/lvs/history', { revalidate: 30 }),
  },
} as const;

export { ApiError };
