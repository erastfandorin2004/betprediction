import { Module } from '@nestjs/common';
import { FixturesController } from './fixtures.controller';
import { FixturesService } from './fixtures.service';
import { ProvidersModule } from '../providers/providers.module';
import { NewsModule } from '../news/news.module';

@Module({
  imports: [ProvidersModule, NewsModule],
  controllers: [FixturesController],
  providers: [FixturesService],
  exports: [FixturesService],
})
export class FixturesModule {}
