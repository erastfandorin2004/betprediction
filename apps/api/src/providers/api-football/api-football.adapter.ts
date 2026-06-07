import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatOddsBlock } from '@ai-score/shared';

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

// Стат-строка матча в формате, который ждут settlement и страница матча.
export interface MatchStat { name: string; home: string; away: string }

// Состав в формате страницы матча (api-client TeamLineup/MatchLineups).
export interface LineupPlayerOut { id: string; name: string; number: number | null }
export interface TeamLineupOut {
  formation: string;
  lines: number[]; // ряды на поле, включая вратаря, напр. [1,4,3,3]
  coach: string | null;
  startingXI: LineupPlayerOut[];
  substitutes: LineupPlayerOut[];
}
export interface MatchLineupsOut { home: TeamLineupOut; away: TeamLineupOut }

interface AfLineupPlayer { player: { id: number; name: string; number: number | null; pos: string | null } }
interface AfLineupTeam {
  team: { id: number; name: string };
  formation: string | null;
  startXI: AfLineupPlayer[];
  substitutes: AfLineupPlayer[];
  coach: { id: number; name: string | null } | null;
}
interface AfStatTeam { team: { id: number }; statistics: { type: string; value: number | string | null }[] }
interface AfMatchEvent {
  type: string; // 'Goal' | 'Card' | 'subst' | 'Var'
  detail: string; // 'Normal Goal' | 'Penalty' | 'Own Goal' | 'Missed Penalty' | ...
  team: { id: number; name: string };
  player: { id: number | null; name: string | null };
}
interface AfOddValue { value: string; odd: string }
interface AfOddBet { id: number; name: string; values: AfOddValue[] }
interface AfOddBookmaker { id: number; name: string; bets: AfOddBet[] }

export interface OddsLine { map: Record<string, number>; block: string }

// Состав/тренер и таблица групп (форматы, которые ждут findContext и страница).
export interface SquadPlayer { id: number; name: string; position: string | null; shirtNumber: number | null; dateOfBirth: string | null; nationality: string | null }
export interface TeamSquad { coach: { name: string | null } | null; squad: SquadPlayer[] }
export interface StandingRow {
  position: number;
  team: { id: number; name: string; shortName: string; crest: string | null };
  playedGames: number; won: number; draw: number; lost: number;
  points: number; goalsFor: number; goalsAgainst: number; goalDifference: number; form: string | null;
}
export interface StandingGroup { stage: string; type: string; group: string | null; table: StandingRow[] }
export interface StandingsResponse { standings: StandingGroup[] }

interface AfSquadResp { response: { players: { id: number; name: string; position: string | null; number: number | null }[] }[] }
interface AfCoachResp { response: { name: string | null }[] }
interface AfStandingApi {
  rank: number; points: number; goalsDiff: number; group: string | null; form: string | null;
  team: { id: number; name: string; logo: string | null };
  all: { played: number; win: number; draw: number; lose: number; goals: { for: number; against: number } };
}
interface AfStandingsApi { response: { league: { standings: AfStandingApi[][] } }[] }

// Единый провайдер футбольных данных — API-Football (api-sports.io DIRECT,
// ключ API_FOOTBALL_KEY, заголовок x-apisports-key). Заменяет FlashLive и
// RapidAPI для формы/H2H/составов/статистики матча. Возвращает пустые значения
// при отсутствии ключа или данных (graceful degradation).
@Injectable()
export class ApiFootballAdapter {
  private readonly logger = new Logger(ApiFootballAdapter.name);
  private readonly base = 'https://v3.football.api-sports.io';
  private readonly teamIdCache = new Map<string, number | null>();

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get<string>('apiFootball.apiKey') ?? '';
  }
  get hasKey(): boolean {
    return !!this.apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    if (!this.hasKey) throw new Error('API_FOOTBALL_KEY not configured');
    const res = await fetch(`${this.base}${path}`, {
      headers: { 'x-apisports-key': this.apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`API-Football ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  async getTeamId(teamName: string): Promise<number | null> {
    const cached = this.teamIdCache.get(teamName);
    if (cached !== undefined) return cached;
    try {
      const data = await this.fetch<{ response: { team: AfTeam & { national?: boolean } }[] }>(
        `/teams?search=${encodeURIComponent(teamName)}`,
      );
      const id = pickTeamId(data.response ?? [], teamName);
      this.teamIdCache.set(teamName, id);
      return id;
    } catch (err) {
      this.logger.warn(`Team search failed for "${teamName}": ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // Последние сыгранные матчи команды (форма) в формате AfH2HFixture.
  async getTeamForm(teamName: string, last = 6): Promise<AfH2HFixture[]> {
    if (!this.hasKey) return [];
    const id = await this.getTeamId(teamName);
    if (!id) return [];
    try {
      const data = await this.fetch<{ response: AfH2HFixture[] }>(`/fixtures?team=${id}&last=${last}`);
      return (data.response ?? []).filter((f) => f.goals.home != null && f.goals.away != null);
    } catch (err) {
      this.logger.warn(`Form fetch failed for "${teamName}": ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  async getH2H(team1Name: string, team2Name: string, last = 10): Promise<AfH2HFixture[]> {
    if (!this.hasKey) return [];
    const [id1, id2] = await Promise.all([this.getTeamId(team1Name), this.getTeamId(team2Name)]);
    if (!id1 || !id2) return [];
    try {
      const data = await this.fetch<{ response: AfH2HFixture[] }>(
        `/fixtures/headtohead?h2h=${id1}-${id2}&last=${last}`,
      );
      return (data.response ?? []).filter((f) => f.goals.home != null && f.goals.away != null);
    } catch (err) {
      this.logger.warn(`H2H fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  // ID конкретного матча двух команд рядом с датой (для составов/статистики).
  private async resolveFixtureId(home: string, away: string, dateISO?: string): Promise<number | null> {
    const [id1, id2] = await Promise.all([this.getTeamId(home), this.getTeamId(away)]);
    if (!id1 || !id2) return null;
    try {
      const data = await this.fetch<{ response: AfH2HFixture[] }>(`/fixtures/headtohead?h2h=${id1}-${id2}&last=20`);
      const list = data.response ?? [];
      if (dateISO) {
        const target = new Date(dateISO).getTime();
        let best: { id: number; diff: number } | null = null;
        for (const f of list) {
          const diff = Math.abs(new Date(f.fixture.date).getTime() - target);
          if (!best || diff < best.diff) best = { id: f.fixture.id, diff };
        }
        // принимаем только если матч в пределах ±2 дней от ожидаемого времени
        if (best && best.diff < 2 * 86_400_000) return best.id;
        // Предстоящий матч в headtohead?last=20 не попадает (там только сыгранные) —
        // надёжный фолбэк по дню.
        const byDate = await this.resolveByDate(id1, id2, dateISO);
        if (byDate) return byDate;
        return null;
      }
      return list.length ? list[list.length - 1]!.fixture.id : null;
    } catch {
      if (dateISO) return this.resolveByDate(id1, id2, dateISO);
      return null;
    }
  }

  // Находит матч двух команд по конкретному дню через /fixtures?date= (в отличие
  // от headtohead?last= включает и предстоящие матчи).
  private async resolveByDate(id1: number, id2: number, dateISO: string): Promise<number | null> {
    const day = dateISO.slice(0, 10);
    try {
      const data = await this.fetch<{ response: AfH2HFixture[] }>(`/fixtures?date=${day}`);
      const f = (data.response ?? []).find((x) => {
        const h = x.teams.home.id, a = x.teams.away.id;
        return (h === id1 && a === id2) || (h === id2 && a === id1);
      });
      return f ? f.fixture.id : null;
    } catch {
      return null;
    }
  }

  async getLineups(home: string, away: string, dateISO?: string): Promise<MatchLineupsOut | null> {
    if (!this.hasKey) return null;
    const fixtureId = await this.resolveFixtureId(home, away, dateISO);
    if (!fixtureId) return null;
    try {
      const data = await this.fetch<{ response: AfLineupTeam[] }>(`/fixtures/lineups?fixture=${fixtureId}`);
      const teams = data.response ?? [];
      if (teams.length < 2) return null;
      return { home: toTeamLineup(teams[0]!), away: toTeamLineup(teams[1]!) };
    } catch (err) {
      this.logger.warn(`Lineups fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // Финальный счёт + статус матча (для самодостаточного сеттлмента ЛВС, не
  // завязанного на обновление таблицы fixtures). null — если матч не найден.
  async getMatchScore(
    home: string, away: string, dateISO?: string,
  ): Promise<{ finished: boolean; homeGoals: number | null; awayGoals: number | null } | null> {
    if (!this.hasKey) return null;
    const fixtureId = await this.resolveFixtureId(home, away, dateISO);
    if (!fixtureId) return null;
    try {
      const data = await this.fetch<{ response: AfH2HFixture[] }>(`/fixtures?id=${fixtureId}`);
      const f = (data.response ?? [])[0];
      if (!f) return null;
      const finished = ['FT', 'AET', 'PEN'].includes(f.fixture.status.short);
      return { finished, homeGoals: f.goals.home, awayGoals: f.goals.away };
    } catch (err) {
      this.logger.warn(`Match score fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // Имена игроков, забивших в матче (для сеттлмента ЛВС). Исключаем незабитые
  // пенальти и автоголы (автогол не засчитывается как «забил предсказанный игрок»).
  async getGoalscorers(home: string, away: string, dateISO?: string): Promise<string[]> {
    if (!this.hasKey) return [];
    const fixtureId = await this.resolveFixtureId(home, away, dateISO);
    if (!fixtureId) return [];
    try {
      const data = await this.fetch<{ response: AfMatchEvent[] }>(`/fixtures/events?fixture=${fixtureId}`);
      return (data.response ?? [])
        .filter((e) => e.type === 'Goal' && e.detail !== 'Missed Penalty' && e.detail !== 'Own Goal')
        .map((e) => e.player?.name ?? '')
        .filter(Boolean);
    } catch (err) {
      this.logger.warn(`Goalscorers fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  async getStats(home: string, away: string, dateISO?: string): Promise<MatchStat[] | null> {
    if (!this.hasKey) return null;
    const fixtureId = await this.resolveFixtureId(home, away, dateISO);
    if (!fixtureId) return null;
    try {
      const data = await this.fetch<{ response: AfStatTeam[] }>(`/fixtures/statistics?fixture=${fixtureId}`);
      const teams = data.response ?? [];
      if (teams.length < 2) return null;
      const homeStats = new Map(teams[0]!.statistics.map((s) => [s.type, s.value]));
      const awayStats = new Map(teams[1]!.statistics.map((s) => [s.type, s.value]));
      const types = [...new Set([...homeStats.keys(), ...awayStats.keys()])];
      return types.map((name) => ({
        name,
        home: String(homeStats.get(name) ?? ''),
        away: String(awayStats.get(name) ?? ''),
      }));
    } catch (err) {
      this.logger.warn(`Stats fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // Состав + тренер команды (заменяет football-data getTeamWithSquad).
  async getTeamWithSquad(teamId: number): Promise<TeamSquad> {
    if (!this.hasKey) return { coach: null, squad: [] };
    const [sq, co] = await Promise.allSettled([
      this.fetch<AfSquadResp>(`/players/squads?team=${teamId}`),
      this.fetch<AfCoachResp>(`/coachs?team=${teamId}`),
    ]);
    const squad: SquadPlayer[] = sq.status === 'fulfilled'
      ? (sq.value.response?.[0]?.players ?? []).map((p) => ({
          id: p.id, name: p.name, position: p.position, shirtNumber: p.number,
          dateOfBirth: null, nationality: null,
        }))
      : [];
    const coachName = co.status === 'fulfilled' ? (co.value.response?.[0]?.name ?? null) : null;
    return { coach: coachName ? { name: coachName } : null, squad };
  }

  // Таблица групп ЧМ-2026 (заменяет football-data getWcStandings).
  async getWcStandings(): Promise<StandingsResponse> {
    if (!this.hasKey) return { standings: [] };
    try {
      const data = await this.fetch<AfStandingsApi>(`/standings?league=1&season=2026`);
      const groups = data.response?.[0]?.league?.standings ?? [];
      return {
        standings: groups.map((g) => ({
          stage: 'GROUP_STAGE',
          type: 'TOTAL',
          group: g[0]?.group ?? null,
          table: g.map((r) => ({
            position: r.rank,
            team: { id: r.team.id, name: r.team.name, shortName: r.team.name.slice(0, 3).toUpperCase(), crest: r.team.logo },
            playedGames: r.all.played, won: r.all.win, draw: r.all.draw, lost: r.all.lose,
            points: r.points, goalsFor: r.all.goals.for, goalsAgainst: r.all.goals.against,
            goalDifference: r.goalsDiff, form: r.form,
          })),
        })),
      };
    } catch (err) {
      this.logger.warn(`Standings fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return { standings: [] };
    }
  }

  // Линия букмекеров: усредняем коэффициенты по всем БК → карта в формате,
  // который ждёт value-анализ (1/X/2, over_/under_ тоталы, btts_, двойной шанс).
  async getOddsMap(home: string, away: string, dateISO?: string): Promise<OddsLine | null> {
    if (!this.hasKey) return null;
    const fixtureId = await this.resolveFixtureId(home, away, dateISO);
    if (!fixtureId) return null;
    try {
      const data = await this.fetch<{ response: { bookmakers: AfOddBookmaker[] }[] }>(`/odds?fixture=${fixtureId}`);
      const bookmakers = data.response?.[0]?.bookmakers ?? [];
      if (!bookmakers.length) return null;
      const acc: Record<string, number[]> = {};
      for (const bk of bookmakers) {
        for (const bet of bk.bets) {
          for (const v of bet.values) {
            const key = oddKey(bet.name, v.value);
            const num = parseFloat(v.odd);
            if (key && !isNaN(num)) (acc[key] ??= []).push(num);
          }
        }
      }
      const map: Record<string, number> = {};
      for (const [k, arr] of Object.entries(acc)) {
        map[k] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
      }
      if (!Object.keys(map).length) return null;
      return { map, block: formatOddsBlock(map) };
    } catch (err) {
      this.logger.warn(`Odds fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }
}

// API-Football bet name + value → ключ нашей odds-карты. Поддерживаем рынки,
// которые реально используются в анализе/расчёте.
function oddKey(betName: string, value: string): string | null {
  const v = String(value).trim().toLowerCase();
  switch (betName) {
    case 'Match Winner':
      return v === 'home' ? '1' : v === 'draw' ? 'X' : v === 'away' ? '2' : null;
    case 'Both Teams Score':
      return v === 'yes' ? 'btts_yes' : v === 'no' ? 'btts_no' : null;
    case 'Double Chance':
      return v === 'home/draw' ? '1X' : v === 'home/away' ? '12' : v === 'draw/away' ? 'X2' : null;
    case 'Goals Over/Under': {
      const m = v.match(/^(over|under)\s+(\d+(?:\.\d+)?)$/);
      if (!m) return null;
      const line = m[2]!.replace('.', '_');
      return `${m[1]}_${line}`; // over_2_5 / under_1_5 ...
    }
    // Рынки с линией → ключ MARKET:side:line (как в oddsKeyFor анализа).
    case 'Total - Home':
      return lineKey('HOME_TOTAL', v);
    case 'Total - Away':
      return lineKey('AWAY_TOTAL', v);
    case 'Corners Over Under':
      return lineKey('CORNERS_OU', v);
    case 'Cards Over/Under':
      return lineKey('CARDS_OU', v);
    default:
      return null;
  }
}

function lineKey(market: string, value: string): string | null {
  const m = value.match(/^(over|under)\s+(\d+(?:\.\d+)?)$/);
  return m ? `${market}:${m[1]}:${m[2]}` : null;
}

// Поиск в API-Football по имени возвращает клубы/женские/молодёжные команды
// раньше нужной (напр. «Chile» → «Chile W»). Выбираем точное совпадение имени,
// предпочитая основную сборную/клуб; иначе — первый результат.
export function pickTeamId(
  response: { team: { id: number; name: string; national?: boolean } }[],
  query: string,
): number | null {
  if (!response.length) return null;
  const q = query.trim().toLowerCase();
  const exact = response.filter((r) => r.team.name.trim().toLowerCase() === q);
  if (exact.length) return (exact.find((r) => r.team.national) ?? exact[0]!).team.id;
  return response[0]!.team.id;
}

function toTeamLineup(lt: AfLineupTeam): TeamLineupOut {
  const formation = lt.formation ?? '';
  // «4-3-3» → ряды [1,4,3,3] (вратарь + линии). Пусто, если формация неизвестна.
  const lines = formation
    ? [1, ...formation.split('-').map((n) => parseInt(n, 10)).filter((n) => !isNaN(n))]
    : [];
  const map = (p: AfLineupPlayer): LineupPlayerOut => ({
    id: String(p.player.id),
    name: p.player.name,
    number: p.player.number,
  });
  return {
    formation,
    lines,
    coach: lt.coach?.name ?? null,
    startingXI: lt.startXI.map(map),
    substitutes: lt.substitutes.map(map),
  };
}
