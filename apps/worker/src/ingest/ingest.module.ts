import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { DatabaseService } from '../database/database.service';
import { DatabaseModule } from '../database/database.module';
import { ApiFootballAdapter } from '../providers/api-football.adapter';

@Module({
  imports: [DatabaseModule],
  providers: [IngestService, ApiFootballAdapter],
})
export class IngestModule {}
