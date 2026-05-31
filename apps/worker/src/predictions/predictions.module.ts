import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PredictionGeneratorService } from './prediction-generator.service';

@Module({
  imports: [DatabaseModule],
  providers: [PredictionGeneratorService],
})
export class PredictionsModule {}
