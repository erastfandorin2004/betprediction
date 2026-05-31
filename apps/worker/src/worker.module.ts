import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { IngestModule } from './ingest/ingest.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    IngestModule,
  ],
})
export class WorkerModule {}
