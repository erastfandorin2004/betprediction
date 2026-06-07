import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, between, count, eq, gte, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import { FootballDataAdapter } from '../providers/football-data/football-data.adapter';
import { ApiFootballAdapter, type AfH2HFixture } from '../providers/api-football/api-football.adapter';
import { NewsService } from '../news/news.service';
import type { FixtureListQueryDto } from './dto/fixture-list-query.dto';
import type {
  FixtureListItem,
  FixtureDetail,
  FixtureStatus,
  Score,
  TeamRef,
  LeagueRef,
  SportRef,
  PredictionBadge,
  PredictionDetail,
  PredictionMarket,
  ModelConsensus,
  PredictionStatus,
} from '@ai-score/shared';
import type { PaginationMeta } from '@ai-score/shared';

type FixtureRow = typeof schema.fixtures.$inferSelect;
type LeagueRow = typeof schema.leagues.$inferSelect;
type TeamRow = typeof schema.teams.$inferSelect;
type SportRow = typeof schema.sports.$inferSelect;
type PredictionRow = typeof schema.predictions.$inferSelect;

@Injectable()
export class FixturesService {
  private readonly logger = new Logger(FixturesService.name);
  // In-memory fallback for the match-context payload when Redis is unavailable,
  // so repeat views don't re-hit the rate-limited provider.
  private readonly contextMemo = new Map<number, { at: number; data: Record<string, unknown> }>();

  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
    private readonly fdAdapter: FootballDataAdapter,
    private readonly apiFootballAdapter: ApiFootballAdapter,
    private readonly newsService: NewsService,
  ) {}

  async findAll(
    query: FixtureListQueryDto,
  ): Promise<{ items: FixtureListItem[]; meta: PaginationMeta }> {
    const {
      date = new Date().toISOString().slice(0, 10),
      status = 'all',
      leagueId,
      sportId = 1,
      page = 1,
      limit = 20,
    } = query;

    const cacheKey = `fixtures:list:${JSON.stringify(query)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as { items: FixtureListItem[]; meta: PaginationMeta };

    const homeTeam = alias(schema.teams, 'home_team');
    const awayTeam = alias(schema.teams, 'away_team');

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const conditions = and(
      eq(schema.fixtures.sportId, sportId),
      between(schema.fixtures.startsAt, dayStart, dayEnd),
      ...(leagueId ? [eq(schema.fixtures.leagueId, leagueId)] : []),
      ...(status !== 'all' ? [eq(schema.fixtures.status, status)] : []),
    );

    const [rows, [totalRow]] = await Promise.all([
      this.db.db
        .select({
          fixture: schema.fixtures,
          league: schema.leagues,
          sport: schema.sports,
          homeTeam,
          awayTeam,
          prediction: schema.predictions,
        })
        .from(schema.fixtures)
        .leftJoin(schema.leagues, eq(schema.fixtures.leagueId, schema.leagues.id))
        .leftJoin(schema.sports, eq(schema.fixtures.sportId, schema.sports.id))
        .leftJoin(homeTeam, eq(schema.fixtures.homeTeamId, homeTeam.id))
        .leftJoin(awayTeam, eq(schema.fixtures.awayTeamId, awayTeam.id))
        .leftJoin(schema.predictions, eq(schema.fixtures.id, schema.predictions.fixtureId))
        .where(conditions)
        .orderBy(asc(schema.fixtures.startsAt))
        .limit(limit)
        .offset((page - 1) * limit),

      this.db.db.select({ total: count() }).from(schema.fixtures).where(conditions),
    ]);

    const total = totalRow?.total ?? 0;
    const items = rows.map((r) =>
      this.toListItem(r.fixture, r.league, r.sport, r.homeTeam, r.awayTeam, r.prediction),
    );

    const result = {
      items,
      meta: { page, limit, total, hasNext: page * limit < total },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 60);
    return result;
  }

  async findWorldCup(): Promise<{ date: string; fixtures: FixtureListItem[] }[]> {
    const cacheKey = 'fixtures:world-cup';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as { date: string; fixtures: FixtureListItem[] }[];

    const WC_LEAGUE_ID = 2000;
    const homeTeam = alias(schema.teams, 'home_team');
    const awayTeam = alias(schema.teams, 'away_team');

    const rows = await this.db.db
      .select({
        fixture: schema.fixtures,
        league: schema.leagues,
        sport: schema.sports,
        homeTeam,
        awayTeam,
        prediction: schema.predictions,
      })
      .from(schema.fixtures)
      .leftJoin(schema.leagues, eq(schema.fixtures.leagueId, schema.leagues.id))
      .leftJoin(schema.sports, eq(schema.fixtures.sportId, schema.sports.id))
      .leftJoin(homeTeam, eq(schema.fixtures.homeTeamId, homeTeam.id))
      .leftJoin(awayTeam, eq(schema.fixtures.awayTeamId, awayTeam.id))
      .leftJoin(schema.predictions, eq(schema.fixtures.id, schema.predictions.fixtureId))
      .where(and(
        eq(schema.fixtures.leagueId, WC_LEAGUE_ID),
        gte(schema.fixtures.startsAt, new Date('2026-06-01')),
      ))
      .orderBy(asc(schema.fixtures.startsAt));

    const byDay = new Map<string, FixtureListItem[]>();
    for (const r of rows) {
      const item = this.toListItem(r.fixture, r.league, r.sport, r.homeTeam, r.awayTeam, r.prediction);
      const day = r.fixture.startsAt.toISOString().slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(item);
    }

    const result = [...byDay.entries()].map(([date, fixtures]) => ({ date, fixtures }));
    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async findLive(): Promise<FixtureListItem[]> {
    const cacheKey = 'fixtures:live';
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as FixtureListItem[];

    const homeTeam = alias(schema.teams, 'home_team');
    const awayTeam = alias(schema.teams, 'away_team');

    const rows = await this.db.db
      .select({
        fixture: schema.fixtures,
        league: schema.leagues,
        sport: schema.sports,
        homeTeam,
        awayTeam,
        prediction: schema.predictions,
      })
      .from(schema.fixtures)
      .leftJoin(schema.leagues, eq(schema.fixtures.leagueId, schema.leagues.id))
      .leftJoin(schema.sports, eq(schema.fixtures.sportId, schema.sports.id))
      .leftJoin(homeTeam, eq(schema.fixtures.homeTeamId, homeTeam.id))
      .leftJoin(awayTeam, eq(schema.fixtures.awayTeamId, awayTeam.id))
      .leftJoin(schema.predictions, eq(schema.fixtures.id, schema.predictions.fixtureId))
      .where(eq(schema.fixtures.status, 'live'))
      .orderBy(asc(schema.fixtures.startsAt));

    const items = rows.map((r) =>
      this.toListItem(r.fixture, r.league, r.sport, r.homeTeam, r.awayTeam, r.prediction),
    );

    await this.redis.set(cacheKey, JSON.stringify(items), 30);
    return items;
  }

  async findOne(id: number): Promise<FixtureDetail> {
    const cacheKey = `fixtures:detail:${id}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as FixtureDetail;

    const homeTeam = alias(schema.teams, 'home_team');
    const awayTeam = alias(schema.teams, 'away_team');

    const [row] = await this.db.db
      .select({
        fixture: schema.fixtures,
        league: schema.leagues,
        sport: schema.sports,
        homeTeam,
        awayTeam,
        prediction: schema.predictions,
      })
      .from(schema.fixtures)
      .leftJoin(schema.leagues, eq(schema.fixtures.leagueId, schema.leagues.id))
      .leftJoin(schema.sports, eq(schema.fixtures.sportId, schema.sports.id))
      .leftJoin(homeTeam, eq(schema.fixtures.homeTeamId, homeTeam.id))
      .leftJoin(awayTeam, eq(schema.fixtures.awayTeamId, awayTeam.id))
      .leftJoin(schema.predictions, eq(schema.fixtures.id, schema.predictions.fixtureId))
      .where(eq(schema.fixtures.id, id))
      .limit(1);

    if (!row) throw new NotFoundException(`Fixture ${id} not found`);

    const detail = this.toDetail(
      row.fixture, row.league, row.sport, row.homeTeam, row.awayTeam, row.prediction,
    );
    const ttl = row.fixture.status === 'live' ? 30 : 300;
    await this.redis.set(cacheKey, JSON.stringify(detail), ttl);
    return detail;
  }

  async findContext(id: number, locale = 'en'): Promise<Record<string, unknown>> {
    const cacheKey = `fixtures:context:${id}:${locale}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as Record<string, unknown>;
    const memoKey = id * 10 + (locale === 'ru' ? 1 : 0);
    const memo = this.contextMemo.get(memoKey);
    if (memo && Date.now() - memo.at < 30 * 60 * 1000) return memo.data;

    const homeTeamAlias = alias(schema.teams, 'home_team');
    const awayTeamAlias = alias(schema.teams, 'away_team');

    const [row] = await this.db.db
      .select({ fixture: schema.fixtures, homeTeam: homeTeamAlias, awayTeam: awayTeamAlias })
      .from(schema.fixtures)
      .leftJoin(homeTeamAlias, eq(schema.fixtures.homeTeamId, homeTeamAlias.id))
      .leftJoin(awayTeamAlias, eq(schema.fixtures.awayTeamId, awayTeamAlias.id))
      .where(eq(schema.fixtures.id, id))
      .limit(1);

    if (!row) throw new NotFoundException(`Fixture ${id} not found`);

    const homeId = row.fixture.homeTeamId;
    const awayId = row.fixture.awayTeamId;
    const WC_LEAGUE = 2000;

    // WC group matches for both teams
    const groupRows = await this.db.db
      .select({ fixture: schema.fixtures, homeTeam: homeTeamAlias, awayTeam: awayTeamAlias })
      .from(schema.fixtures)
      .leftJoin(homeTeamAlias, eq(schema.fixtures.homeTeamId, homeTeamAlias.id))
      .leftJoin(awayTeamAlias, eq(schema.fixtures.awayTeamId, awayTeamAlias.id))
      .where(and(
        eq(schema.fixtures.leagueId, WC_LEAGUE),
        or(
          eq(schema.fixtures.homeTeamId, homeId),
          eq(schema.fixtures.awayTeamId, homeId),
          eq(schema.fixtures.homeTeamId, awayId),
          eq(schema.fixtures.awayTeamId, awayId),
        ),
      ))
      .orderBy(asc(schema.fixtures.startsAt));

    // H2H — WC matches between exactly these two teams (excluding current fixture)
    const h2hRows = groupRows.filter(
      (r) =>
        r.fixture.id !== id &&
        ((r.fixture.homeTeamId === homeId && r.fixture.awayTeamId === awayId) ||
          (r.fixture.homeTeamId === awayId && r.fixture.awayTeamId === homeId)),
    );

    const homeMatches = groupRows.filter(
      (r) => r.fixture.homeTeamId === homeId || r.fixture.awayTeamId === homeId,
    );
    const awayMatches = groupRows.filter(
      (r) => r.fixture.homeTeamId === awayId || r.fixture.awayTeamId === awayId,
    );

    const toMatchSummary = (r: (typeof groupRows)[0]) => ({
      id: r.fixture.id,
      startsAt: r.fixture.startsAt,
      status: r.fixture.status,
      scoreHome: r.fixture.scoreHome,
      scoreAway: r.fixture.scoreAway,
      homeTeam: { id: r.homeTeam?.id, name: r.homeTeam?.name, shortName: r.homeTeam?.shortName, logo: r.homeTeam?.logo },
      awayTeam: { id: r.awayTeam?.id, name: r.awayTeam?.name, shortName: r.awayTeam?.shortName, logo: r.awayTeam?.logo },
    });

    const homeName = row.homeTeam?.name ?? '';
    const awayName = row.awayTeam?.name ?? '';

    // Live data (lineups/stats/summary) only exists near kickoff — skip those
    // calls for far-future matches to stay well under the provider rate limit.
    const startsAtISO = row.fixture.startsAt.toISOString();
    const msToKickoff = row.fixture.startsAt.getTime() - Date.now();
    const wantLive = row.fixture.status === 'live' || row.fixture.status === 'finished'
      || msToKickoff < 3 * 60 * 60 * 1000;

    // Источник формы/H2H/составов/статистики — единый API-Football. Составы/
    // squads и таблица WC остаются из football-data (расписание ЧМ-2026).
    const [
      homeSquadData, awaySquadData, standingsData, h2hData,
      homeFormData, awayFormData,
      lineupsData, statsData, newsData,
    ] = await Promise.allSettled([
        this.fdAdapter.getTeamWithSquad(homeId),
        this.fdAdapter.getTeamWithSquad(awayId),
        this.fdAdapter.getWcStandings(),
        this.apiFootballAdapter.getH2H(homeName, awayName),
        this.apiFootballAdapter.getTeamForm(homeName),
        this.apiFootballAdapter.getTeamForm(awayName),
        wantLive ? this.apiFootballAdapter.getLineups(homeName, awayName, startsAtISO) : Promise.resolve(null),
        wantLive ? this.apiFootballAdapter.getStats(homeName, awayName, startsAtISO) : Promise.resolve(null),
        this.newsService.getTeamNews([homeName, awayName], locale),
      ]);

    // Find group for each team in standings
    const standings = standingsData.status === 'fulfilled' ? standingsData.value.standings : [];
    const totalStandings = standings.filter((s) => s.type === 'TOTAL');

    const findTeamGroup = (teamId: number) => {
      for (const group of totalStandings) {
        const row = group.table.find((r) => r.team.id === teamId);
        if (row) return { group: group.group, table: group.table, teamRow: row };
      }
      return null;
    };

    // H2H и форма команд — из API-Football (формат AfH2HFixture).
    const h2hAllRaw = h2hData.status === 'fulfilled' ? h2hData.value : [];
    const homeFormFlash = homeFormData.status === 'fulfilled' ? homeFormData.value : [];
    const awayFormFlash = awayFormData.status === 'fulfilled' ? awayFormData.value : [];

    const result = {
      homeForm: homeMatches.map(toMatchSummary),
      awayForm: awayMatches.map(toMatchSummary),
      homeFormFlash: homeFormFlash.map(this.mapH2HFixture),
      awayFormFlash: awayFormFlash.map(this.mapH2HFixture),
      h2hWc: h2hRows.map(toMatchSummary),
      h2hAll: h2hAllRaw.map(this.mapH2HFixture),
      homeSquad: homeSquadData.status === 'fulfilled' ? homeSquadData.value.squad : [],
      awaySquad: awaySquadData.status === 'fulfilled' ? awaySquadData.value.squad : [],
      homeCoach: homeSquadData.status === 'fulfilled'
        ? this.resolveCoachName(homeSquadData.value.coach)
        : null,
      awayCoach: awaySquadData.status === 'fulfilled'
        ? this.resolveCoachName(awaySquadData.value.coach)
        : null,
      homeGroup: findTeamGroup(homeId),
      awayGroup: findTeamGroup(awayId),
      homeSquadFlash: [],
      awaySquadFlash: [],
      lineups: lineupsData.status === 'fulfilled' ? lineupsData.value : null,
      stats: statsData.status === 'fulfilled' ? statsData.value : null,
      summary: null,
      news: newsData.status === 'fulfilled' ? newsData.value : [],
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 1800);
    // Memoise in-process too, but only a healthy payload — don't pin an empty
    // result produced by a transient provider rate-limit.
    if (homeFormFlash.length > 0 && awayFormFlash.length > 0) {
      this.contextMemo.set(memoKey, { at: Date.now(), data: result });
    }
    return result;
  }

  private mapH2HFixture = (f: AfH2HFixture) => ({
    id: f.fixture.id,
    date: f.fixture.date,
    status: f.fixture.status.short,
    league: f.league.name,
    country: f.league.country,
    season: f.league.season,
    venue: f.fixture.venue.name,
    homeTeam: { name: f.teams.home.name, logo: f.teams.home.logo },
    awayTeam: { name: f.teams.away.name, logo: f.teams.away.logo },
    scoreHome: f.goals.home,
    scoreAway: f.goals.away,
    scoreHtHome: f.score.halftime.home,
    scoreHtAway: f.score.halftime.away,
  });

  private resolveCoachName(coach: { name?: string | null; firstName?: string | null; lastName?: string | null } | null): { name: string } | null {
    if (!coach) return null;
    const name = coach.name || [coach.firstName, coach.lastName].filter(Boolean).join(' ') || null;
    return name ? { name } : null;
  }

  private toListItem(
    fixture: FixtureRow,
    league: LeagueRow | null,
    sport: SportRow | null,
    homeTeam: TeamRow | null,
    awayTeam: TeamRow | null,
    prediction: PredictionRow | null,
  ): FixtureListItem {
    return {
      id: fixture.id,
      sport: this.toSportRef(sport, fixture.sportId),
      league: this.toLeagueRef(league),
      homeTeam: this.toTeamRef(homeTeam),
      awayTeam: this.toTeamRef(awayTeam),
      startsAt: fixture.startsAt.toISOString(),
      status: fixture.status as FixtureStatus,
      minute: fixture.minute,
      score: this.toScore(fixture.scoreHome, fixture.scoreAway, fixture.halfTimeHome, fixture.halfTimeAway),
      prediction: prediction ? this.toPredictionBadge(prediction) : null,
      hasValue: (prediction?.valueEdge ?? 0) > 0.05,
      isFavorite: false,
    };
  }

  private toDetail(
    fixture: FixtureRow,
    league: LeagueRow | null,
    sport: SportRow | null,
    homeTeam: TeamRow | null,
    awayTeam: TeamRow | null,
    prediction: PredictionRow | null,
  ): FixtureDetail {
    return {
      id: fixture.id,
      sport: this.toSportRef(sport, fixture.sportId),
      league: this.toLeagueRef(league),
      round: fixture.round,
      venue: fixture.venueName
        ? { id: 0, name: fixture.venueName, city: fixture.venueCity ?? '', capacity: null }
        : null,
      homeTeam: this.toTeamRef(homeTeam),
      awayTeam: this.toTeamRef(awayTeam),
      startsAt: fixture.startsAt.toISOString(),
      status: fixture.status as FixtureStatus,
      minute: fixture.minute,
      score: this.toScore(fixture.scoreHome, fixture.scoreAway, fixture.halfTimeHome, fixture.halfTimeAway),
      events: [],
      stats: null,
      lineups: null,
      h2h: null,
      standings: { home: null, away: null },
      prediction: prediction ? this.toPredictionDetail(prediction) : null,
    };
  }

  private toPredictionBadge(pred: PredictionRow): PredictionBadge {
    return {
      recommendedOutcome: pred.recommendedOutcome,
      probability: pred.probability,
      confidence: pred.confidence,
      stars: (pred.stars ?? 1) as PredictionBadge['stars'],
      isLocked: false,
    };
  }

  private toPredictionDetail(pred: PredictionRow): PredictionDetail {
    return {
      fixtureId: pred.fixtureId,
      createdAt: pred.createdAt.toISOString(),
      status: pred.status as PredictionStatus,
      markets: (pred.markets as PredictionMarket[] | null) ?? [],
      recommendedMarket: pred.recommendedMarket as PredictionDetail['recommendedMarket'],
      recommendedOutcome: pred.recommendedOutcome,
      probability: pred.probability,
      confidence: pred.confidence,
      stars: (pred.stars ?? 1) as PredictionDetail['stars'],
      modelConsensus: (pred.modelConsensus as ModelConsensus | null) ?? null,
      rationale: pred.rationale,
      keyFactors: pred.keyFactors as string[] | null,
      valueEdge: pred.valueEdge,
      impliedProbability: pred.impliedProbability,
      selectedBets: (pred.selectedBets as PredictionDetail['selectedBets']) ?? null,
      riskNote: pred.riskNote ?? null,
      models: (pred.modelViews as PredictionDetail['models']) ?? null,
      summary: pred.summary ?? null,
      settlement: (pred.settlement as PredictionDetail['settlement']) ?? null,
      outcome: pred.isCorrect !== null
        ? { isCorrect: pred.isCorrect!, actualResult: pred.actualResult ?? '', resolvedAt: pred.resolvedAt?.toISOString() ?? '' }
        : null,
      isLocked: false,
      lockedFields: [],
    };
  }

  private toSportRef(sport: SportRow | null, fallbackId: number): SportRef {
    return { id: sport?.id ?? fallbackId, name: sport?.name ?? 'Football', slug: sport?.slug ?? 'football' };
  }

  private toLeagueRef(league: LeagueRow | null): LeagueRef {
    return {
      id: league?.id ?? 0, name: league?.name ?? 'Unknown',
      shortName: league?.shortName ?? null, logo: league?.logo ?? null,
      country: league?.country ?? '', countryCode: league?.countryCode ?? null,
    };
  }

  private toTeamRef(team: TeamRow | null): TeamRef {
    return { id: team?.id ?? 0, name: team?.name ?? 'Unknown', shortName: team?.shortName ?? '', logo: team?.logo ?? null };
  }

  private toScore(home: number | null, away: number | null, htHome: number | null, htAway: number | null): Score | null {
    if (home === null || away === null) return null;
    return { home, away, ...(htHome !== null && htAway !== null ? { halfTime: { home: htHome, away: htAway } } : {}) };
  }
}
