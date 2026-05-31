import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { ProvidersModule } from './providers/providers.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { FixturesModule } from './fixtures/fixtures.module';
import { LeaguesModule } from './leagues/leagues.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    RedisModule,
    ProvidersModule,
    HealthModule,
    AuthModule,
    FixturesModule,
    LeaguesModule,
  ],
})
export class AppModule {}
