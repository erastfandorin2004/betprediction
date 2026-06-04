import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { settlePrediction, type ActualResult, type PredictionMarket, type PredictionDetail } from '@ai-score/shared';
import { DatabaseService } from '../database/database.service';
import { PredictionsService } from './predictions.service';
import { FixturesService } from '../fixtures/fixtures.service';

interface RawStat { name: string; home: string; away: string }

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly predictions: PredictionsService,
    private readonly fixtures: FixturesService,
  ) {}

  // Settle the AI prediction for a finished fixture against the real result.
  // Immutable: only the settlement/result fields are written — the original
  // prediction (markets, rationale, recommendation) is never changed.
  async settle(fixtureId: number): Promise<PredictionDetail | null> {
    const [pred] = await this.db.db
      .select()
      .from(schema.predictions)
      .where(eq(schema.predictions.fixtureId, fixtureId))
      .orderBy(desc(schema.predictions.createdAt))
      .limit(1);
    if (!pred) return null;

    // Already settled → return as-is (immutable).
    if (pred.status === 'resolved' && pred.settlement) return this.predictions.toDetail(pred, false);

    const [fixture] = await this.db.db
      .select()
      .from(schema.fixtures)
      .where(eq(schema.fixtures.id, fixtureId))
      .limit(1);
    if (!fixture) throw new NotFoundException(`Fixture ${fixtureId} not found`);

    // Not finished yet — leave the prediction pending.
    if (fixture.status !== 'finished' || fixture.scoreHome == null || fixture.scoreAway == null) {
      return this.predictions.toDetail(pred, false);
    }

    const { corners, cards } = await this.fetchStats(fixtureId);
    const actual: ActualResult = {
      homeGoals: fixture.scoreHome,
      awayGoals: fixture.scoreAway,
      corners,
      cards,
    };

    const settlement = settlePrediction(
      (pred.markets as PredictionMarket[]) ?? [],
      pred.recommendedMarket,
      pred.recommendedOutcome,
      actual,
    );

    const [updated] = await this.db.db
      .update(schema.predictions)
      .set({
        settlement: settlement as unknown,
        isCorrect: settlement.mainStatus === 'won',
        actualResult: `${actual.homeGoals}:${actual.awayGoals}`,
        resolvedAt: new Date(),
        status: 'resolved',
      })
      .where(eq(schema.predictions.id, pred.id))
      .returning();

    this.logger.log(
      `Settled fixture ${fixtureId}: main ${settlement.mainStatus}, ${settlement.wonCount}/${settlement.total} рынков`,
    );
    return this.predictions.toDetail(updated!, false);
  }

  // Extract total corners and cards (yellow + red) from provider match stats.
  private async fetchStats(fixtureId: number): Promise<{ corners: number | null; cards: number | null }> {
    try {
      const ctx = (await this.fixtures.findContext(fixtureId, 'ru')) as Record<string, unknown>;
      const stats = (ctx['stats'] as RawStat[] | null) ?? null;
      if (!stats?.length) return { corners: null, cards: null };

      const sum = (re: RegExp): number | null => {
        const rows = stats.filter((s) => re.test(s.name));
        if (!rows.length) return null;
        return rows.reduce((acc, s) => acc + (parseInt(s.home, 10) || 0) + (parseInt(s.away, 10) || 0), 0);
      };
      const corners = sum(/corner/i);
      const yellow = sum(/yellow/i);
      const red = sum(/red card/i);
      const cards = yellow == null && red == null ? null : (yellow ?? 0) + (red ?? 0);
      return { corners, cards };
    } catch {
      return { corners: null, cards: null };
    }
  }
}
