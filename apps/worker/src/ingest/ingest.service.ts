import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { sql } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { FootballDataAdapter } from '../providers/football-data.adapter';
import type { SportsDataLeague, SportsDataFixture } from '../providers/sports-data.provider';

const FOOTBALL_SPORT_ID = 1;
const FOOTBALL_SPORT = { id: FOOTBALL_SPORT_ID, name: 'Football', slug: 'football' };

@Injectable()
export class IngestService implements OnModuleInit {
  private readonly logger = new Logger(IngestService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly provider: FootballDataAdapter,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSport();
    // Run initial ingest at startup without blocking
    setImmediate(() => void this.runInitialIngest());
  }

  private async runInitialIngest(): Promise<void> {
    this.logger.log('Running initial data ingest...');
    await this.ingestLeagues();
    await this.ingestWorldCupFixtures();
    await this.ingestFixtures();
  }

  private async ensureSport(): Promise<void> {
    await this.db.db
      .insert(schema.sports)
      .values(FOOTBALL_SPORT)
      .onConflictDoNothing();
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async ingestLeagues(): Promise<void> {
    if (!this.config.get<string>('footballData.apiKey')) {
      this.logger.warn('FOOTBALL_DATA_API_KEY not set — skipping league ingest');
      return;
    }
    this.logger.log('Ingesting leagues...');
    try {
      const leagues = await this.provider.getLeagues();
      await this.upsertLeagues(leagues);
      this.logger.log(`Ingested ${leagues.length} leagues`);
    } catch (err) {
      this.logger.error('League ingest failed', err instanceof Error ? err.message : String(err));
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async ingestWorldCupFixtures(): Promise<void> {
    if (!this.config.get<string>('footballData.apiKey')) return;
    this.logger.log('Ingesting World Cup fixtures...');
    try {
      const fixtures = await this.provider.getFixturesByCompetition('WC');
      await this.upsertFixtures(fixtures);
      this.logger.log(`Ingested ${fixtures.length} World Cup fixtures`);
    } catch (err) {
      this.logger.error('WC fixture ingest failed', err instanceof Error ? err.message : String(err));
    }
  }

  @Cron('*/5 * * * *')
  async ingestFixtures(): Promise<void> {
    if (!this.config.get<string>('footballData.apiKey')) return;
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    this.logger.log(`Ingesting fixtures ${today} → ${tomorrow}`);
    try {
      const fixtures = await this.provider.getFixturesByDate(today, tomorrow);
      await this.upsertFixtures(fixtures);
      this.logger.log(`Ingested ${fixtures.length} fixtures`);
    } catch (err) {
      this.logger.error('Fixture ingest failed', err instanceof Error ? err.message : String(err));
    }
  }

  private async upsertLeagues(leagues: SportsDataLeague[]): Promise<void> {
    if (!leagues.length) return;
    const values = leagues.map((l) => ({
      id: l.providerId,
      sportId: FOOTBALL_SPORT_ID,
      providerCode: l.providerCode,
      name: l.name,
      shortName: l.shortName,
      country: l.country,
      countryCode: l.countryCode,
      logo: l.logo,
      season: l.season,
      type: l.type,
      startDate: l.startDate,
      endDate: l.endDate,
      updatedAt: new Date(),
    }));

    await this.db.db
      .insert(schema.leagues)
      .values(values)
      .onConflictDoUpdate({
        target: schema.leagues.id,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          logo: sql`excluded.logo`,
          country: sql`excluded.country`,
          countryCode: sql`excluded.country_code`,
          season: sql`excluded.season`,
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          updatedAt: new Date(),
        },
      });
  }

  private async upsertFixtures(fixtures: SportsDataFixture[]): Promise<void> {
    if (!fixtures.length) return;

    // Collect unique teams and upsert them first
    const teamsMap = new Map<number, SportsDataFixture['homeTeam']>();
    for (const f of fixtures) {
      teamsMap.set(f.homeTeam.providerId, f.homeTeam);
      teamsMap.set(f.awayTeam.providerId, f.awayTeam);
    }

    const teamValues = [...teamsMap.values()].map((t) => ({
      id: t.providerId,
      name: t.name,
      shortName: t.shortName,
      logo: t.logo,
      country: t.country,
      updatedAt: new Date(),
    }));

    await this.db.db
      .insert(schema.teams)
      .values(teamValues)
      .onConflictDoUpdate({
        target: schema.teams.id,
        set: {
          name: sql`excluded.name`,
          shortName: sql`excluded.short_name`,
          logo: sql`excluded.logo`,
          updatedAt: new Date(),
        },
      });

    // Upsert fixtures (only for leagues we have in DB)
    const fixtureValues = fixtures.map((f) => ({
      id: f.providerId,
      sportId: FOOTBALL_SPORT_ID,
      leagueId: f.leagueProviderId,
      homeTeamId: f.homeTeam.providerId,
      awayTeamId: f.awayTeam.providerId,
      startsAt: f.startsAt,
      status: f.status,
      minute: f.minute,
      round: f.round,
      venueName: f.venueName,
      venueCity: f.venueCity,
      scoreHome: f.scoreHome,
      scoreAway: f.scoreAway,
      halfTimeHome: f.halfTimeHome,
      halfTimeAway: f.halfTimeAway,
      updatedAt: new Date(),
    }));

    // Insert in chunks of 50 to avoid parameter limits
    for (let i = 0; i < fixtureValues.length; i += 50) {
      const chunk = fixtureValues.slice(i, i + 50);
      await this.db.db
        .insert(schema.fixtures)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.fixtures.id,
          set: {
            status: sql`excluded.status`,
            minute: sql`excluded.minute`,
            scoreHome: sql`excluded.score_home`,
            scoreAway: sql`excluded.score_away`,
            halfTimeHome: sql`excluded.half_time_home`,
            halfTimeAway: sql`excluded.half_time_away`,
            updatedAt: new Date(),
          },
        })
        .catch((err: Error) => {
          // Fixture references a league not yet in DB — skip gracefully
          this.logger.debug(`Skipping chunk: ${err.message}`);
        });
    }
  }
}
