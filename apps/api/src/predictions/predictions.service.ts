import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, not, isNull, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import type {
  PredictionDetail,
  PredictionMarket,
  PredictionSettlement,
  PredictionHistoryItem,
  ModelConsensus,
  PredictionStatus,
  TrackRecordStats,
  AccuracyStats,
  BacktestSummary,
  BacktestSegmentStats,
  BacktestPick,
} from '@ai-score/shared';

type PredictionRow = typeof schema.predictions.$inferSelect;

@Injectable()
export class PredictionsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async getDailyPicks(limit = 5): Promise<PredictionDetail[]> {
    return this.redis.getOrSet(`predictions:daily-picks`, 300, async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      // Top predictions by confidence + value
      const rows = await this.db.db
        .select({ prediction: schema.predictions, fixture: schema.fixtures })
        .from(schema.predictions)
        .innerJoin(schema.fixtures, eq(schema.predictions.fixtureId, schema.fixtures.id))
        .where(
          and(
            eq(schema.predictions.status, 'pending'),
            eq(schema.fixtures.status, 'scheduled'),
            gte(schema.fixtures.startsAt, today),
            lte(schema.fixtures.startsAt, tomorrow),
          ),
        )
        .orderBy(desc(schema.predictions.confidence))
        .limit(limit);

      return rows.map((r) => this.toDetail(r.prediction, false));
    });
  }

  async getValueBets(limit = 20): Promise<PredictionDetail[]> {
    return this.redis.getOrSet(`predictions:value-bets`, 120, async () => {
      const now = new Date();
      const rows = await this.db.db
        .select({ prediction: schema.predictions })
        .from(schema.predictions)
        .innerJoin(schema.fixtures, eq(schema.predictions.fixtureId, schema.fixtures.id))
        .where(
          and(
            eq(schema.predictions.status, 'pending'),
            eq(schema.fixtures.status, 'scheduled'),
            gte(schema.fixtures.startsAt, now),
            not(isNull(schema.predictions.valueEdge)),
          ),
        )
        .orderBy(desc(schema.predictions.valueEdge))
        .limit(limit);

      return rows.map((r) => this.toDetail(r.prediction, false));
    });
  }

  async getTrackRecord(): Promise<TrackRecordStats> {
    return this.redis.getOrSet('predictions:track-record', 600, async () => {
      const resolved = await this.db.db
        .select()
        .from(schema.predictions)
        .where(eq(schema.predictions.status, 'resolved'));

      const total = resolved.length;
      const correct = resolved.filter((p) => p.isCorrect).length;
      const overall: AccuracyStats = {
        total,
        correct,
        rate: total > 0 ? correct / total : 0,
      };

      return {
        overall,
        byMarket: {},
        byLeague: [],
        byConfidence: [1, 2, 3, 4, 5].map((stars) => {
          const subset = resolved.filter((p) => p.stars === stars);
          const c = subset.filter((p) => p.isCorrect).length;
          return { stars, stats: { total: subset.length, correct: c, rate: subset.length > 0 ? c / subset.length : 0 } };
        }),
        roiSimulation: { flatStake: 1, roi: 0, totalBets: total },
        updatedAt: new Date().toISOString(),
      };
    });
  }

  // Latest backtest run (value-bet logic replayed over the control sample, spec §9).
  async getBacktest(): Promise<BacktestSummary | null> {
    return this.redis.getOrSet('predictions:backtest', 600, async () => {
      const [row] = await this.db.db
        .select()
        .from(schema.backtests)
        .orderBy(desc(schema.backtests.createdAt))
        .limit(1);
      if (!row) return null;
      return {
        label: row.label,
        models: row.models,
        totalMatches: row.totalMatches,
        recommended: row.recommended,
        skipped: row.skipped,
        won: row.won,
        lost: row.lost,
        pushed: row.pushed,
        avgOdds: row.avgOdds,
        staked: row.staked,
        profit: row.profit,
        roi: row.roi,
        hitRate: row.hitRate,
        byMarket: row.byMarket as BacktestSegmentStats[],
        byLeague: row.byLeague as BacktestSegmentStats[],
        picks: row.picks as BacktestPick[],
        createdAt: row.createdAt.toISOString(),
      } satisfies BacktestSummary;
    });
  }

  // История всех сделанных анализов с их итогом (для раздела «Трек-рекорд»).
  async getHistory(limit = 50): Promise<PredictionHistoryItem[]> {
    return this.redis.getOrSet(`predictions:history:${limit}`, 30, async () => {
      const home = alias(schema.teams, 'hist_home');
      const away = alias(schema.teams, 'hist_away');
      const rows = await this.db.db
        .select({ pred: schema.predictions, fixture: schema.fixtures, home, away, league: schema.leagues })
        .from(schema.predictions)
        .innerJoin(schema.fixtures, eq(schema.fixtures.id, schema.predictions.fixtureId))
        .leftJoin(home, eq(home.id, schema.fixtures.homeTeamId))
        .leftJoin(away, eq(away.id, schema.fixtures.awayTeamId))
        .leftJoin(schema.leagues, eq(schema.leagues.id, schema.fixtures.leagueId))
        .orderBy(desc(schema.predictions.createdAt))
        .limit(limit);

      return rows.map((r): PredictionHistoryItem => {
        const settlement = r.pred.settlement as PredictionSettlement | null;
        const markets = (r.pred.markets as PredictionMarket[] | null) ?? [];
        const recMkt = markets.find((m) => m.market === r.pred.recommendedMarket);
        const recOut = recMkt?.outcomes.find((o) => o.outcome === r.pred.recommendedOutcome);
        return {
          fixtureId: r.pred.fixtureId,
          match: `${r.home?.name ?? '—'} — ${r.away?.name ?? '—'}`,
          league: r.league?.name ?? '',
          kickoff: r.fixture.startsAt.toISOString(),
          createdAt: r.pred.createdAt.toISOString(),
          status: r.pred.status as PredictionStatus,
          market: r.pred.recommendedMarket,
          pick: recOut?.label ?? r.pred.recommendedOutcome,
          probability: r.pred.probability,
          stars: r.pred.stars ?? 1,
          finalScore: settlement?.finalScore ?? null,
          verdict: settlement?.overall ?? null,
          wonCount: settlement?.wonCount ?? null,
          total: settlement?.total ?? null,
        };
      });
    });
  }

  toDetail(row: PredictionRow, isLocked: boolean): PredictionDetail {
    const markets = (row.markets as PredictionMarket[] | null) ?? [];
    const consensus = row.modelConsensus as ModelConsensus | null;

    return {
      fixtureId: row.fixtureId,
      createdAt: row.createdAt.toISOString(),
      status: row.status as PredictionStatus,
      markets: isLocked
        ? markets.map((m) => ({ ...m, isLocked: true, outcomes: [] }))
        : markets,
      recommendedMarket: row.recommendedMarket as PredictionDetail['recommendedMarket'],
      recommendedOutcome: row.recommendedOutcome,
      probability: row.probability,
      confidence: row.confidence,
      stars: (row.stars ?? 1) as PredictionDetail['stars'],
      modelConsensus: isLocked ? null : (consensus ?? null),
      rationale: isLocked ? null : row.rationale,
      keyFactors: isLocked ? null : (row.keyFactors as string[] | null),
      valueEdge: isLocked ? null : row.valueEdge,
      impliedProbability: row.impliedProbability,
      selectedBets: isLocked ? null : ((row.selectedBets as PredictionDetail['selectedBets']) ?? null),
      riskNote: isLocked ? null : row.riskNote,
      models: isLocked ? null : (row.modelViews as PredictionDetail['models']),
      summary: isLocked ? null : row.summary,
      settlement: (row.settlement as PredictionDetail['settlement']) ?? null,
      outcome: row.isCorrect !== null
        ? { isCorrect: row.isCorrect!, actualResult: row.actualResult ?? '', resolvedAt: row.resolvedAt?.toISOString() ?? '' }
        : null,
      isLocked,
      lockedFields: isLocked ? ['rationale', 'keyFactors', 'markets', 'modelConsensus', 'valueEdge'] : [],
    };
  }
}
