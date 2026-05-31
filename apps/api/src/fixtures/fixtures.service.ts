import { Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, between, count, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
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
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
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
