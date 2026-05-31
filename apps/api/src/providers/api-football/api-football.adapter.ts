import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AfTeam {
  id: number;
  name: string;
  logo: string;
}

export interface AfH2HFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string; elapsed: number | null };
    venue: { name: string | null; city: string | null };
  };
  league: { id: number; name: string; country: string; logo: string; season: number };
  teams: {
    home: AfTeam & { winner: boolean | null };
    away: AfTeam & { winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
  };
}

@Injectable()
export class ApiFootballAdapter {
  private readonly logger = new Logger(ApiFootballAdapter.name);
  private readonly base = 'https://api-football-v1.p.rapidapi.com/v3';
  private readonly teamIdCache = new Map<string, number | null>();

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
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`API-Football ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  async getTeamId(teamName: string): Promise<number | null> {
    const cached = this.teamIdCache.get(teamName);
    if (cached !== undefined) return cached;

    try {
      const data = await this.fetch<{ response: { team: AfTeam }[] }>(
        `/teams?search=${encodeURIComponent(teamName)}`,
      );
      const id = data.response?.[0]?.team?.id ?? null;
      this.teamIdCache.set(teamName, id);
      return id;
    } catch (err) {
      this.logger.warn(`Team search failed for "${teamName}": ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  async getH2H(team1Name: string, team2Name: string, last = 20): Promise<AfH2HFixture[]> {
    if (!this.hasKey) return [];

    const [id1, id2] = await Promise.all([
      this.getTeamId(team1Name),
      this.getTeamId(team2Name),
    ]);

    if (!id1 || !id2) {
      this.logger.warn(`Could not resolve team IDs: ${team1Name}=${id1}, ${team2Name}=${id2}`);
      return [];
    }

    try {
      const data = await this.fetch<{ response: AfH2HFixture[] }>(
        `/fixtures/headtohead?h2h=${id1}-${id2}&last=${last}&status=FT-AET-PEN`,
      );
      return data.response ?? [];
    } catch (err) {
      this.logger.warn(`H2H fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }
}
