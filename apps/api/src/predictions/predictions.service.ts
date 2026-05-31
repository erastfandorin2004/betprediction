import { Injectable } from '@nestjs/common';
import { and, desc, eq, gte, lte, not, isNull, sql } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import type {
  PredictionDetail,
  PredictionMarket,
  ModelConsensus,
  PredictionStatus,
  TrackRecordStats,
  AccuracyStats,
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
      outcome: row.isCorrect !== null
        ? { isCorrect: row.isCorrect!, actualResult: row.actualResult ?? '', resolvedAt: row.resolvedAt?.toISOString() ?? '' }
        : null,
      isLocked,
      lockedFields: isLocked ? ['rationale', 'keyFactors', 'markets', 'modelConsensus', 'valueEdge'] : [],
    };
  }
}
