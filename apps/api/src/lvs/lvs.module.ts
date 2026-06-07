import { Module } from '@nestjs/common';
import { LvsController } from './lvs.controller';
import { LvsService } from './lvs.service';
import { LvsSettlementService } from './lvs-settlement.service';
import { LvsScheduler } from './lvs.scheduler';
import { FixturesModule } from '../fixtures/fixtures.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [FixturesModule, ProvidersModule],
  controllers: [LvsController],
  providers: [LvsService, LvsSettlementService, LvsScheduler],
  exports: [LvsService],
})
export class LvsModule {}
