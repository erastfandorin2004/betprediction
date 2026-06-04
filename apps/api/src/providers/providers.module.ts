import { Module } from '@nestjs/common';
import { SportsDataProvider } from './sports-data.provider';
import { FootballDataAdapter } from './football-data/football-data.adapter';
import { ApiFootballAdapter } from './api-football/api-football.adapter';
import { AllSportsAdapter } from './allsports/allsports.adapter';
import { FlashLiveAdapter } from './flashlive/flashlive.adapter';
import { InjuriesAdapter } from './injuries/injuries.adapter';
import { OddsAdapter } from './odds/odds.adapter';

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
    InjuriesAdapter,
    OddsAdapter,
  ],
  exports: [SportsDataProvider, FootballDataAdapter, ApiFootballAdapter, AllSportsAdapter, FlashLiveAdapter, InjuriesAdapter, OddsAdapter],
})
export class ProvidersModule {}
