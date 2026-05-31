import { Module } from '@nestjs/common';
import { SportsDataProvider } from './sports-data.provider';
import { FootballDataAdapter } from './football-data/football-data.adapter';
import { ApiFootballAdapter } from './api-football/api-football.adapter';
import { AllSportsAdapter } from './allsports/allsports.adapter';
import { FlashLiveAdapter } from './flashlive/flashlive.adapter';

@Module({
  providers: [
    {
      provide: SportsDataProvider,
      useClass: FootballDataAdapter,
    },
    FootballDataAdapter,
    ApiFootballAdapter,
    AllSportsAdapter,
    FlashLiveAdapter,
  ],
  exports: [SportsDataProvider, FootballDataAdapter, ApiFootballAdapter, AllSportsAdapter, FlashLiveAdapter],
})
export class ProvidersModule {}
