import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SportsDataLeague, SportsDataFixture } from './sports-data.provider';

const FD_STATUS_MAP: Record<string, string> = {
  SCHEDULED: 'scheduled',
  TIMED: 'scheduled',
  IN_PLAY: 'live',
  PAUSED: 'live',
  FINISHED: 'finished',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
  AWARDED: 'finished',
  SUSPENDED: 'suspended',
};

interface FdTeam {
  id: number | null;
  name: string | null;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
  area?: { name: string; code: string };
}

interface FdMatch {
  id: number;
  competition: { id: number; code: string; name: string };
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: {
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
  venue?: string;
}

interface FdCompetition {
  id: number;
  area: { id: number; name: string; code: string };
  code: string;
  name: string;
  type: string;
  emblem: string | null;
  currentSeason: { id: number; startDate: string; endDate: string } | null;
}

@Injectable()
export class FootballDataAdapter {
  private readonly logger = new Logger(FootballDataAdapter.name);
  private readonly baseUrl = 'https://api.football-data.org/v4';

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get<string>('footballData.apiKey') ?? '';
  }

  private async fetch<T>(path: string): Promise<T> {
    if (!this.apiKey) throw new Error('FOOTBALL_DATA_API_KEY not configured');
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'X-Auth-Token': this.apiKey },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Football-Data.org ${res.status} on ${path}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async getLeagues(): Promise<SportsDataLeague[]> {
    const data = await this.fetch<{ competitions: FdCompetition[] }>('/competitions');
    return data.competitions
      .filter((c) => c.currentSeason !== null)
      .map((c) => ({
        providerId: c.id,
        providerCode: c.code,
        name: c.name,
        shortName: c.code,
        country: c.area.name,
        countryCode: c.area.code,
        logo: c.emblem,
        season: c.currentSeason ? new Date(c.currentSeason.startDate).getFullYear() : new Date().getFullYear(),
        type: c.type === 'LEAGUE' ? 'League' : 'Cup',
        startDate: c.currentSeason?.startDate ?? null,
        endDate: c.currentSeason?.endDate ?? null,
      }));
  }

  async getFixturesByCompetition(code: string): Promise<SportsDataFixture[]> {
    const data = await this.fetch<{ matches: FdMatch[] }>(
      `/competitions/${code}/matches`,
    );
    return data.matches.map((m) => this.mapMatch(m));
  }

  async getFixturesByDate(dateFrom: string, dateTo: string): Promise<SportsDataFixture[]> {
    const data = await this.fetch<{ matches: FdMatch[] }>(
      `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    );
    return data.matches.map((m) => this.mapMatch(m));
  }

  private mapMatch(m: FdMatch): SportsDataFixture {
    const mapTeam = (t: FdTeam) => ({
      providerId: t.id ?? 0,
      name: t.name ?? 'TBD',
      shortName: t.shortName || t.tla || (t.name ? t.name.slice(0, 20) : 'TBD'),
      logo: t.crest,
      country: t.area?.name ?? null,
    });

    return {
      providerId: m.id,
      leagueProviderId: m.competition.id,
      homeTeam: mapTeam(m.homeTeam),
      awayTeam: mapTeam(m.awayTeam),
      startsAt: new Date(m.utcDate),
      status: FD_STATUS_MAP[m.status] ?? 'scheduled',
      minute: null,
      round: m.matchday !== null ? `Matchday ${m.matchday}` : m.stage,
      scoreHome: m.score.fullTime.home,
      scoreAway: m.score.fullTime.away,
      halfTimeHome: m.score.halfTime.home,
      halfTimeAway: m.score.halfTime.away,
      venueName: m.venue ?? null,
      venueCity: null,
    };
  }
}
