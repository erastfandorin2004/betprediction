import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SportsDataProvider,
  type SportsDataLeague,
  type SportsDataFixture,
} from '../sports-data.provider';
import type {
  FdCompetitionsResponse,
  FdMatchesResponse,
  FdMatch,
  FdCompetition,
  FdTeamDetail,
  FdStandingsResponse,
} from './football-data.types';

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

@Injectable()
export class FootballDataAdapter extends SportsDataProvider {
  private readonly logger = new Logger(FootballDataAdapter.name);
  private readonly baseUrl = 'https://api.football-data.org/v4';

  constructor(private readonly config: ConfigService) {
    super();
  }

  private get apiKey(): string {
    return this.config.get<string>('footballData.apiKey') ?? '';
  }

  private async fetch<T>(path: string): Promise<T> {
    if (!this.apiKey) {
      throw new Error('FOOTBALL_DATA_API_KEY is not configured');
    }
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
    const data = await this.fetch<FdCompetitionsResponse>('/competitions');
    return data.competitions
      .filter((c) => c.currentSeason !== null)
      .map((c) => this.mapCompetition(c));
  }

  async getTeamWithSquad(teamId: number): Promise<FdTeamDetail> {
    return this.fetch<FdTeamDetail>(`/teams/${teamId}`);
  }

  async getWcStandings(): Promise<FdStandingsResponse> {
    return this.fetch<FdStandingsResponse>('/competitions/WC/standings');
  }

  async getFixturesByDate(dateFrom: string, dateTo: string): Promise<SportsDataFixture[]> {
    const data = await this.fetch<FdMatchesResponse>(
      `/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    );
    return data.matches.map((m) => this.mapMatch(m));
  }

  private mapCompetition(c: FdCompetition): SportsDataLeague {
    const season = c.currentSeason;
    return {
      providerId: c.id,
      providerCode: c.code,
      name: c.name,
      shortName: c.code,
      country: c.area.name,
      countryCode: c.area.code,
      logo: c.emblem,
      season: season ? new Date(season.startDate).getFullYear() : new Date().getFullYear(),
      type: c.type === 'LEAGUE' ? 'League' : 'Cup',
      startDate: season?.startDate ?? null,
      endDate: season?.endDate ?? null,
    };
  }

  private mapMatch(m: FdMatch): SportsDataFixture {
    return {
      providerId: m.id,
      leagueProviderId: m.competition.id,
      homeTeam: {
        providerId: m.homeTeam.id,
        name: m.homeTeam.name,
        shortName: m.homeTeam.shortName || m.homeTeam.tla || m.homeTeam.name.slice(0, 20),
        logo: m.homeTeam.crest,
        country: m.homeTeam.area?.name ?? null,
      },
      awayTeam: {
        providerId: m.awayTeam.id,
        name: m.awayTeam.name,
        shortName: m.awayTeam.shortName || m.awayTeam.tla || m.awayTeam.name.slice(0, 20),
        logo: m.awayTeam.crest,
        country: m.awayTeam.area?.name ?? null,
      },
      startsAt: new Date(m.utcDate),
      status: FD_STATUS_MAP[m.status] ?? 'scheduled',
      minute: null, // Football-Data.org free tier doesn't provide live minute
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
