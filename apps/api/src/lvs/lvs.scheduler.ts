import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, eq, gt, isNull, lte } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { LvsService } from './lvs.service';
import { LvsSettlementService } from './lvs-settlement.service';

const WC_LEAGUE_ID = 2000;
const ANALYSIS_LEAD_MS = 60 * 60 * 1000; // запускаем анализ за ≤1ч до матча

// Планировщик ЛВС (interval, без @nestjs/schedule — как settlement.scheduler):
//  • свип №1 — анализирует матчи ЧМ за ~1ч до старта, когда есть составы;
//  • свип №2 — после матча выносит вердикт в Историю ЛВС.
@Injectable()
export class LvsScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LvsScheduler.name);
  private analyzeTimer: ReturnType<typeof setInterval> | null = null;
  private settleTimer: ReturnType<typeof setInterval> | null = null;
  private busy = false;

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly lvs: LvsService,
    private readonly settlement: LvsSettlementService,
  ) {}

  onModuleInit(): void {
    const auto = this.config.get<boolean>('lvs.auto');
    const hasKey = !!this.config.get<string>('laozhang.apiKey');
    if (auto && hasKey) {
      // каждые 4 минуты ищем матчи, входящие в окно T-60мин
      this.analyzeTimer = setInterval(() => void this.analyzeSweep(), 4 * 60_000);
      setTimeout(() => void this.analyzeSweep(), 15_000);
      this.logger.log('LVS auto-analysis ON (анализ за 1ч до матча при наличии составов)');
    } else {
      this.logger.log('LVS auto-analysis OFF — матчи анализируются только по кнопке (LVS_AUTO=false или нет ключа)');
    }
    // сеттлмент работает всегда — он не тратит токены
    this.settleTimer = setInterval(() => void this.settleSweep(), 2 * 60_000);
    setTimeout(() => void this.settleSweep(), 20_000);
  }

  onModuleDestroy(): void {
    if (this.analyzeTimer) clearInterval(this.analyzeTimer);
    if (this.settleTimer) clearInterval(this.settleTimer);
  }

  private async analyzeSweep(): Promise<void> {
    if (this.busy) return; // анализ долгий — не запускаем параллельно
    this.busy = true;
    try {
      const now = new Date();
      const deadline = new Date(now.getTime() + ANALYSIS_LEAD_MS);
      const rows = await this.db.db
        .select({ id: schema.fixtures.id })
        .from(schema.fixtures)
        .leftJoin(schema.lvsPredictions, eq(schema.fixtures.id, schema.lvsPredictions.fixtureId))
        .where(and(
          eq(schema.fixtures.leagueId, WC_LEAGUE_ID),
          eq(schema.fixtures.status, 'scheduled'),
          gt(schema.fixtures.startsAt, now),
          lte(schema.fixtures.startsAt, deadline),
          isNull(schema.lvsPredictions.id),
        ));
      if (!rows.length) return;
      this.logger.log(`LVS: ${rows.length} матч(ей) в окне T-60мин — пробуем анализ`);
      for (const r of rows) {
        try {
          await this.lvs.analyze(r.id);
        } catch (err) {
          // 409 = составов ещё нет → молча повторим на следующем тике
          const msg = err instanceof Error ? err.message : String(err);
          if (/составы/i.test(msg)) this.logger.debug(`LVS ${r.id}: составов ещё нет`);
          else this.logger.warn(`LVS analyze failed for ${r.id}: ${msg}`);
        }
      }
    } catch (err) {
      this.logger.warn(`LVS analyze sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      this.busy = false;
    }
  }

  private async settleSweep(): Promise<void> {
    try {
      const rows = await this.db.db
        .select({ fixtureId: schema.lvsPredictions.fixtureId })
        .from(schema.lvsPredictions)
        .innerJoin(schema.fixtures, eq(schema.fixtures.id, schema.lvsPredictions.fixtureId))
        .where(and(eq(schema.lvsPredictions.status, 'pending'), eq(schema.fixtures.status, 'finished')));
      if (!rows.length) return;
      this.logger.log(`LVS: авто-сеттлмент ${rows.length} матч(ей)`);
      for (const r of rows) {
        await this.settlement.settle(r.fixtureId).catch((err: Error) =>
          this.logger.warn(`LVS settle failed for ${r.fixtureId}: ${err.message}`),
        );
      }
    } catch (err) {
      this.logger.warn(`LVS settle sweep failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
