import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { BacktestService } from './backtest.service';

@Module({
  imports: [DatabaseModule],
  providers: [BacktestService],
  exports: [BacktestService],
})
export class BacktestModule {}
