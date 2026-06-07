import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SportsDataProvider, type SportsDataLeague, type SportsDataFixture } from './sports-data.provider';

// Расписание матчей из API-Football (api-sports.io DIRECT, ключ API_FOOTBALL_KEY).
// Заменяет football-data.org. ЧМ-2026 (league=1) мапится во внутренний id 2000,
// чтобы не ломать витрину (homepage/findContext завязаны на league 2000).

const WC_AF_LEAGUE = 1;       // World Cup в API-Football
const WC_INTERNAL_LEAGUE = 2000; // внутренний id ЧМ в нашей БД
const WC_SEASON = 2026;

// Белый список лиг для ежедневного инжеста (иначе /fixtures?date отдаёт ~570
// матчей со всего мира). id — как в API-Football.
const DAILY_LEAGUES: { id: number; name: string; code: string; country: string }[] = [
  { id: 2, name: 'UEFA Champions League', code: 'CL', country: 'World' },
  { id: 3, name: 'UEFA Europa League', code: 'EL', country: 'World' },
  { id: 39, name: 'Premier League', code: 'PL', country: 'England' },
  { id: 140, name: 'La Liga', code: 'PD', country: 'Spain' },
  { id: 135, name: 'Serie A', code: 'SA', country: 'Italy' },
  { id: 78, name: 'Bundesliga', code: 'BL1', country: 'Germany' },
  { id: 61, name: 'Ligue 1', code: 'FL1', country: 'France' },
  { id: 5, name: 'UEFA Nations League', code: 'NL', country: 'World' },
  { id: 10, name: 'Friendlies', code: 'FR', country: 'World' },
];
const DAILY_LEAGUE_IDS = new Set(DAILY_LEAGUES.map((l) => l.id));

interface AfFixture {
  fixture: { id: number; date: string; status: { short: string; elapsed: number | null }; venue: { name: string | null; city: string | null } };
  league: { id: number; name: string; country: string; logo: string | null; season: number; round: string | null };
  teams: { home: AfTeamRef; away: AfTeamRef };
  goals: { home: number | null; away: number | null };
  score: { halftime: { home: number | null; away: number | null } };
}
interface AfTeamRef { id: number; name: string; logo: string | null }

const FINISHED = new Set(['FT', 'AET', 'PEN']);
const LIVE = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP']);

@Injectable()
export class ApiFootballAdapter extends SportsDataProvider {
  private readonly logger = new Logger(ApiFootballAdapter.name);
  private readonly base = 'https://v3.football.api-sports.io';

  constructor(private readonly config: ConfigService) {
    super();
  }

  private get apiKey(): string {
    return this.config.get<string>('apiFootball.apiKey') ?? '';
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      headers: { 'x-apisports-key': this.apiKey },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) throw new Error(`API-Football ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  // ЧМ-2026 + лиги белого списка (для таблицы leagues).
  async getLeagues(): Promise<SportsDataLeague[]> {
    const wc: SportsDataLeague = {
      providerId: WC_INTERNAL_LEAGUE,
      providerCode: 'WC',
      name: 'FIFA World Cup',
      shortName: 'WC',
      country: 'World',
      countryCode: null,
      logo: null,
      season: WC_SEASON,
      type: 'Cup',
      startDate: null,
      endDate: null,
    };
    const daily: SportsDataLeague[] = DAILY_LEAGUES.map((l) => ({
      providerId: l.id,
      // Уникальный код, чтобы не конфликтовать с letter-кодами football-data
      // (PL/CL/SA…), у которых уже есть свои строки в таблице leagues.
      providerCode: `AF-${l.id}`,
      name: l.name,
      shortName: l.code,
      country: l.country,
      countryCode: null,
      logo: null,
      season: new Date().getFullYear(),
      type: 'League',
      startDate: null,
      endDate: null,
    }));
    return [wc, ...daily];
  }

  // Матчи ЧМ-2026 (league=1) → внутренний league 2000.
  async getWorldCupFixtures(): Promise<SportsDataFixture[]> {
    const data = await this.fetch<{ response: AfFixture[] }>(
      `/fixtures?league=${WC_AF_LEAGUE}&season=${WC_SEASON}`,
    );
    return (data.response ?? []).map((f) => this.mapFixture(f, WC_INTERNAL_LEAGUE));
  }

  // Матчи за период по белому списку лиг.
  async getFixturesByDate(dateFrom: string, dateTo: string): Promise<SportsDataFixture[]> {
    const data = await this.fetch<{ response: AfFixture[] }>(
      `/fixtures?from=${dateFrom}&to=${dateTo}`,
    );
    return (data.response ?? [])
      .filter((f) => DAILY_LEAGUE_IDS.has(f.league.id))
      .map((f) => this.mapFixture(f, f.league.id));
  }

  private mapFixture(f: AfFixture, leagueProviderId: number): SportsDataFixture {
    const mapTeam = (t: AfTeamRef) => ({
      providerId: t.id,
      name: t.name,
      shortName: t.name.length > 20 ? t.name.slice(0, 20) : t.name,
      logo: t.logo,
      country: null,
    });
    const short = f.fixture.status.short;
    const status = FINISHED.has(short) ? 'finished' : LIVE.has(short) ? 'live' : 'scheduled';
    return {
      providerId: f.fixture.id,
      leagueProviderId,
      homeTeam: mapTeam(f.teams.home),
      awayTeam: mapTeam(f.teams.away),
      startsAt: new Date(f.fixture.date),
      status,
      minute: f.fixture.status.elapsed,
      round: f.league.round,
      scoreHome: f.goals.home,
      scoreAway: f.goals.away,
      halfTimeHome: f.score.halftime.home,
      halfTimeAway: f.score.halftime.away,
      venueName: f.fixture.venue.name,
      venueCity: f.fixture.venue.city,
    };
  }
}
