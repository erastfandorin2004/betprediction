import { Module } from '@nestjs/common';
import { ApiFootballAdapter } from './api-football/api-football.adapter';
import { InjuriesAdapter } from './injuries/injuries.adapter';
import { OddsAdapter } from './odds/odds.adapter';

// Единый провайдер футбольных данных — API-Football. football-data.org,
// FlashLive и прочие RapidAPI-сервисы убраны.
@Module({
  providers: [ApiFootballAdapter, InjuriesAdapter, OddsAdapter],
  exports: [ApiFootballAdapter, InjuriesAdapter, OddsAdapter],
})
export class ProvidersModule {}
