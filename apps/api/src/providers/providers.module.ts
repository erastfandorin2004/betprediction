import { Module } from '@nestjs/common';
import { SportsDataProvider } from './sports-data.provider';
import { FootballDataAdapter } from './football-data/football-data.adapter';

@Module({
  providers: [
    {
      provide: SportsDataProvider,
      useClass: FootballDataAdapter,
    },
    FootballDataAdapter,
  ],
  exports: [SportsDataProvider, FootballDataAdapter],
})
export class ProvidersModule {}
