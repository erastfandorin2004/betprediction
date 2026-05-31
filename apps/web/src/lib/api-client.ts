import type {
  FixtureListItem,
  FixtureDetail,
  League,
  PaginationMeta,
  TrackRecordStats,
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
  },
  leagues: {
    list: (sportId = 1) =>
      apiFetch<League[]>(`/v1/leagues?sportId=${sportId}`, { revalidate: 3600 }),
    get: (id: number) =>
      apiFetch<League>(`/v1/leagues/${id}`, { revalidate: 3600 }),
  },
  trackRecord: {
    get: () =>
      apiFetch<TrackRecordStats>('/v1/track-record', { revalidate: 300 }),
  },
} as const;

export { ApiError };
