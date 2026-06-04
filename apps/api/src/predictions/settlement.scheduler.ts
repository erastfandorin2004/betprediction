import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { SettlementService } from './settlement.service';

// Автоматически выносит вердикт по завершённым матчам: периодически находит
// прогнозы со статусом pending, у которых матч уже finished, и сверяет их.
// Лёгкий interval-планировщик (без @nestjs/schedule, чтобы не тянуть зависимость).
@Injectable()
export class SettlementScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SettlementScheduler.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private readonly intervalMs = 120_000; // каждые 2 минуты

  constructor(
    private readonly db: DatabaseService,
    private readonly settlement: SettlementService,
  ) {}

  onModuleInit(): void {
    // Первый прогон вскоре после старта, затем по интервалу.
    setTimeout(() => void this.sweep(), 5_000);
    this.timer = setInterval(() => void this.sweep(), this.intervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async sweep(): Promise<void> {
    try {
      const rows = await this.db.db
        .select({ fixtureId: schema.predictions.fixtureId })
        .from(schema.predictions)
        .innerJoin(schema.fixtures, eq(schema.fixtures.id, schema.predictions.fixtureId))
        .where(and(eq(schema.predictions.status, 'pending'), eq(schema.fixtures.status, 'finished')));

      if (!rows.length) return;
      this.logger.log(`Auto-settling ${rows.length} finished match(es)`);
      for (const r of rows) {
        await this.settlement.settle(r.fixtureId).catch((err: Error) =>
          this.logger.warn(`Auto-settle failed for ${r.fixtureId}: ${err.message}`),
        );
      }
    } catch (err) {
      this.logger.warn(`Settlement sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
