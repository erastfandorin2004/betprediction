import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AfH2HFixture } from '../api-football/api-football.adapter';

interface FfMatchSuggestion {
  type: string;
  id: string;
  leagueId: number;
  leagueName: string;
  matchDate: string;
  status: {
    utcTime: string;
    finished?: boolean;
    started?: boolean;
    cancelled?: boolean;
    scoreStr?: string;
    reason?: { short: string; long: string };
  };
  homeTeamId?: string;
  homeTeamName?: string;
  homeTeamScore?: number | null;
  awayTeamId?: string;
  awayTeamName?: string;
  awayTeamScore?: number | null;
}

@Injectable()
export class AllSportsAdapter {
  private readonly logger = new Logger(AllSportsAdapter.name);
  private readonly base = 'https://free-api-live-football-data.p.rapidapi.com';
  private readonly host = 'free-api-live-football-data.p.rapidapi.com';

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get<string>('rapidApi.footballApiKey') ?? '';
  }

  private get hasKey(): boolean {
    return !!this.apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    if (!this.hasKey) throw new Error('RAPIDAPI_FOOTBALL_KEY not configured');
    const res = await fetch(`${this.base}${path}`, {
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.host,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`FreeFootball API ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  async getH2H(homeTeamName: string, awayTeamName: string): Promise<AfH2HFixture[]> {
    if (!this.hasKey) return [];

    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

    const h = norm(homeTeamName);
    const a = norm(awayTeamName);

    const matches = await this.searchMatches(homeTeamName, awayTeamName);

    const h2h = matches.filter((m) => {
      if (!m.status.finished) return false;
      const mh = norm(m.homeTeamName ?? '');
      const ma = norm(m.awayTeamName ?? '');
      const homeMatch = mh.includes(h) || h.includes(mh) || ma.includes(h) || h.includes(ma);
      const awayMatch = mh.includes(a) || a.includes(mh) || ma.includes(a) || a.includes(ma);
      return homeMatch && awayMatch;
    });

    return h2h
      .sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())
      .slice(0, 15)
      .map((m) => this.mapMatch(m));
  }

  private async searchMatches(team1: string, team2: string): Promise<FfMatchSuggestion[]> {
    try {
      const query = encodeURIComponent(`${team1} ${team2}`);
      const data = await this.fetch<{ status: string; response: { suggestions: FfMatchSuggestion[] } }>(
        `/football-matches-search?search=${query}`,
      );
      const suggestions = data?.response?.suggestions ?? [];

      // If few results, try reverse order
      if (suggestions.length < 3) {
        const revQuery = encodeURIComponent(`${team2} ${team1}`);
        const rev = await this.fetch<{ status: string; response: { suggestions: FfMatchSuggestion[] } }>(
          `/football-matches-search?search=${revQuery}`,
        ).catch(() => ({ response: { suggestions: [] } }));
        const revSuggestions = rev?.response?.suggestions ?? [];
        const combined = [...suggestions, ...revSuggestions];
        const seen = new Set<string>();
        return combined.filter((m) => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
      }

      return suggestions;
    } catch (err) {
      this.logger.warn(`H2H search failed for "${team1}" vs "${team2}": ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  private mapMatch(m: FfMatchSuggestion): AfH2HFixture {
    const scoreHome = m.homeTeamScore ?? null;
    const scoreAway = m.awayTeamScore ?? null;

    return {
      fixture: {
        id: parseInt(m.id) || 0,
        date: m.matchDate,
        status: { short: m.status.reason?.short ?? (m.status.finished ? 'FT' : 'NS'), elapsed: null },
        venue: { name: null, city: null },
      },
      league: {
        id: m.leagueId,
        name: m.leagueName,
        country: '',
        logo: '',
        season: new Date(m.matchDate).getFullYear(),
      },
      teams: {
        home: { id: parseInt(m.homeTeamId ?? '0') || 0, name: m.homeTeamName ?? '', logo: '', winner: null },
        away: { id: parseInt(m.awayTeamId ?? '0') || 0, name: m.awayTeamName ?? '', logo: '', winner: null },
      },
      goals: { home: scoreHome, away: scoreAway },
      score: {
        halftime: { home: null, away: null },
        fulltime: { home: scoreHome, away: scoreAway },
      },
    };
  }
}
