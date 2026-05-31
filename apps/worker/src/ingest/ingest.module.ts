import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { DatabaseService } from '../database/database.service';
import { DatabaseModule } from '../database/database.module';
import { FootballDataAdapter } from '../providers/football-data.adapter';

@Module({
  imports: [DatabaseModule],
  providers: [IngestService, FootballDataAdapter],
})
export class IngestModule {}
