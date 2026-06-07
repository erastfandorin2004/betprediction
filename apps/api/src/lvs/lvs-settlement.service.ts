import { Injectable, Logger } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { settleLvs, type LvsScorer, type LvsPredictionDetail } from '@ai-score/shared';
import { DatabaseService } from '../database/database.service';
import { ApiFootballAdapter } from '../providers/api-football/api-football.adapter';
import { rowToLvsDetail } from './lvs.mapper';

@Injectable()
export class LvsSettlementService {
  private readonly logger = new Logger(LvsSettlementService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly apiFootball: ApiFootballAdapter,
  ) {}

  // Сверяет ЛВС-прогноз завершённого матча с фактом: исход / точный счёт /
  // забившие игроки → статус won|partial|lost. Неизменяемо: уже resolved не трогаем.
  async settle(fixtureId: number): Promise<LvsPredictionDetail | null> {
    const [pred] = await this.db.db
      .select().from(schema.lvsPredictions)
      .where(and(eq(schema.lvsPredictions.fixtureId, fixtureId), eq(schema.lvsPredictions.status, 'pending')))
      .orderBy(desc(schema.lvsPredictions.createdAt))
      .limit(1);
    if (!pred) return null;

    const [fixture] = await this.db.db
      .select().from(schema.fixtures).where(eq(schema.fixtures.id, fixtureId)).limit(1);
    if (!fixture) return null;

    const [home] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.homeTeamId)).limit(1);
    const [away] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.awayTeamId)).limit(1);
    const dateISO = fixture.startsAt.toISOString();

    // Финальный счёт: сначала самодостаточно у провайдера (не зависим от обновления
    // таблицы fixtures), затем фолбэк на таблицу (для матчей ЧМ её обновляет ingest).
    let homeGoals: number | null = null;
    let awayGoals: number | null = null;
    try {
      const res = await this.apiFootball.getMatchScore(home?.name ?? '', away?.name ?? '', dateISO);
      if (res?.finished && res.homeGoals != null && res.awayGoals != null) {
        homeGoals = res.homeGoals;
        awayGoals = res.awayGoals;
      }
    } catch (err) {
      this.logger.warn(`LVS score unavailable for ${fixtureId}: ${err instanceof Error ? err.message : err}`);
    }
    if (homeGoals == null && fixture.status === 'finished' && fixture.scoreHome != null && fixture.scoreAway != null) {
      homeGoals = fixture.scoreHome;
      awayGoals = fixture.scoreAway;
    }
    // Матч ещё не завершён / счёт недоступен — оставляем pending.
    if (homeGoals == null || awayGoals == null) return rowToLvsDetail(pred);

    let scorerNames: string[] = [];
    try {
      scorerNames = await this.apiFootball.getGoalscorers(home?.name ?? '', away?.name ?? '', dateISO);
    } catch (err) {
      this.logger.warn(`LVS goalscorers unavailable for ${fixtureId}: ${err instanceof Error ? err.message : err}`);
    }

    const settlement = settleLvs(
      {
        outcome: pred.outcome as LvsPredictionDetail['outcome'],
        scoreHome: pred.scoreHome,
        scoreAway: pred.scoreAway,
        scorers: (pred.scorers as LvsScorer[] | null) ?? [],
      },
      { homeGoals, awayGoals, scorers: scorerNames },
    );

    const [updated] = await this.db.db
      .update(schema.lvsPredictions)
      .set({
        status: 'resolved',
        resultStatus: settlement.resultStatus,
        actualOutcome: settlement.actualOutcome,
        actualScoreHome: settlement.actualScore.home,
        actualScoreAway: settlement.actualScore.away,
        outcomeHit: settlement.outcomeHit,
        scoreHit: settlement.scoreHit,
        scorersResult: settlement.scorers as unknown[],
        isCorrect: settlement.resultStatus === 'won',
        resolvedAt: new Date(),
      })
      .where(eq(schema.lvsPredictions.id, pred.id))
      .returning();

    this.logger.log(`Settled LVS fixture ${fixtureId}: ${settlement.resultStatus} (исход ${settlement.outcomeHit ? '✓' : '✗'}, счёт ${settlement.scoreHit ? '✓' : '✗'})`);
    return rowToLvsDetail(updated!);
  }
}
