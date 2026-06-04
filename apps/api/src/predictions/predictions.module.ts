import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { AiAnalysisService } from './ai-analysis.service';
import { SettlementService } from './settlement.service';
import { FixturesModule } from '../fixtures/fixtures.module';
import { ProvidersModule } from '../providers/providers.module';

@Module({
  imports: [FixturesModule, ProvidersModule],
  controllers: [PredictionsController],
  providers: [PredictionsService, AiAnalysisService, SettlementService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
