import { Module } from '@nestjs/common';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';
import { AiAnalysisService } from './ai-analysis.service';
import { FixturesModule } from '../fixtures/fixtures.module';

@Module({
  imports: [FixturesModule],
  controllers: [PredictionsController],
  providers: [PredictionsService, AiAnalysisService],
  exports: [PredictionsService],
})
export class PredictionsModule {}
