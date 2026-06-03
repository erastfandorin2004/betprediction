import 'reflect-metadata';
import { Module, Logger } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { BacktestService } from './backtest.service';
import configuration from '../config/configuration';

// Standalone runner: `pnpm --filter worker run backtest`
// Прогоняет логику value-bet по контрольной выборке (spec §9) и пишет результат
// в таблицу backtests, откуда его читает страница «Трек-рекорд».
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
  ],
  providers: [BacktestService],
})
class BacktestRunnerModule {}

async function main(): Promise<void> {
  const logger = new Logger('Backtest');
  const app = await NestFactory.createApplicationContext(BacktestRunnerModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const summary = await app.get(BacktestService).run();
    logger.log(
      `Итог: ${summary.recommended} ставок, ${summary.won} зашло / ${summary.lost} нет, ` +
      `${summary.skipped} пропусков, средний кэф ${summary.avgOdds}, ROI ${(summary.roi * 100).toFixed(1)}%`,
    );
  } finally {
    await app.close();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error('Backtest failed', err);
    process.exit(1);
  });
