import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { and, eq, gte, lte, isNull } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { LaozhangClient, buildSystemPrompt, buildUserPrompt, type MatchContext } from '@ai-score/shared';
import { parseAndValidate, aggregate } from './prediction.aggregator';

const DEFAULT_MODELS = [
  'gpt-5.5', 'claude-opus-4-8', 'deepseek-chat',
];

@Injectable()
export class PredictionGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(PredictionGeneratorService.name);
  private client!: LaozhangClient;
  private models: string[] = [];

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    const apiKey = this.config.get<string>('laozhang.apiKey') ?? '';
    const baseUrl = this.config.get<string>('laozhang.baseUrl');
    // 120s — deepseek-v3.2-exp иногда отвечает ~60с, при 60s таймауте отваливался.
    this.client = new LaozhangClient(apiKey, baseUrl, 120_000);
    this.models = (
      this.config.get<string>('laozhang.models') ?? DEFAULT_MODELS.join(',')
    ).split(',').map((m) => m.trim()).filter(Boolean);

    if (!apiKey) {
      this.logger.warn('LAOZHANG_API_KEY not set — prediction generation disabled');
    } else if (!this.config.get<boolean>('autoPredictions')) {
      // По умолчанию авто-анализ выключен: матчи анализируются только вручную по
      // кнопке «Сделать анализ» (API /v1/predictions/:id/analyze).
      this.logger.log('Auto prediction generation is OFF — matches are analysed only on manual request (set AUTO_PREDICTIONS=true to enable)');
    } else {
      this.logger.log(`Prediction engine ready with ${this.models.length} models`);
      setImmediate(() => void this.generatePendingPredictions());
    }
  }

  @Cron('0 * * * *') // every hour
  async generatePendingPredictions(): Promise<void> {
    // Никаких авто-прогонов по матчам, пока AUTO_PREDICTIONS не включён явно —
    // токены/запросы к моделям тратятся только при ручном запуске анализа.
    if (!this.config.get<boolean>('autoPredictions')) return;

    const apiKey = this.config.get<string>('laozhang.apiKey');
    if (!apiKey) return;

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find scheduled fixtures in next 24h that have no prediction yet
    const fixtures = await this.db.db
      .select({
        id: schema.fixtures.id,
        homeTeamId: schema.fixtures.homeTeamId,
        awayTeamId: schema.fixtures.awayTeamId,
        leagueId: schema.fixtures.leagueId,
        round: schema.fixtures.round,
        startsAt: schema.fixtures.startsAt,
      })
      .from(schema.fixtures)
      .leftJoin(schema.predictions, eq(schema.fixtures.id, schema.predictions.fixtureId))
      .where(
        and(
          eq(schema.fixtures.status, 'scheduled'),
          gte(schema.fixtures.startsAt, now),
          lte(schema.fixtures.startsAt, in24h),
          isNull(schema.predictions.id),
        ),
      )
      .limit(20);

    if (!fixtures.length) {
      this.logger.debug('No pending fixtures to predict');
      return;
    }

    this.logger.log(`Generating predictions for ${fixtures.length} fixtures`);

    for (const fixture of fixtures) {
      await this.generateForFixture(fixture.id).catch((err: Error) => {
        this.logger.error(`Failed to predict fixture ${fixture.id}: ${err.message}`);
      });
      // Small delay to avoid rate limiting
      await sleep(2000);
    }
  }

  async generateForFixture(fixtureId: number): Promise<void> {
    // Double-check no prediction exists
    const [existing] = await this.db.db
      .select({ id: schema.predictions.id })
      .from(schema.predictions)
      .where(eq(schema.predictions.fixtureId, fixtureId))
      .limit(1);

    if (existing) {
      this.logger.debug(`Fixture ${fixtureId} already has a prediction`);
      return;
    }

    // Load context
    const ctx = await this.buildContext(fixtureId);
    if (!ctx) {
      this.logger.warn(`Could not build context for fixture ${fixtureId}`);
      return;
    }

    this.logger.log(
      `Predicting: ${ctx.homeTeam} vs ${ctx.awayTeam} (${ctx.league})`,
    );

    // Build messages
    const messages = [
      { role: 'system' as const, content: buildSystemPrompt() },
      { role: 'user' as const, content: buildUserPrompt(ctx) },
    ];

    // Fan-out to all models
    const results = await this.client.fanOut(this.models, messages);

    // Parse and validate
    const { valid, meta } = parseAndValidate(results);

    this.logger.log(
      `Models responded: ${valid.length}/${results.length} valid (fixture ${fixtureId})`,
    );

    if (!valid.length) {
      this.logger.warn(`All models failed for fixture ${fixtureId}`);
      return;
    }

    // Aggregate
    const aggregated = aggregate(valid, results.length, meta);
    if (!aggregated) {
      this.logger.warn(`Aggregation returned null for fixture ${fixtureId}`);
      return;
    }

    // Store immutable snapshot
    await this.db.db.insert(schema.predictions).values({
      fixtureId,
      markets: aggregated.markets as unknown[],
      recommendedMarket: aggregated.recommendedMarket,
      recommendedOutcome: aggregated.recommendedOutcome,
      probability: aggregated.probability,
      confidence: aggregated.confidence,
      stars: aggregated.stars,
      modelConsensus: aggregated.modelConsensus as unknown,
      rationale: aggregated.rationale,
      keyFactors: aggregated.keyFactors,
      valueEdge: null, // calculated when odds are available
      impliedProbability: null,
      status: 'pending',
    });

    this.logger.log(
      `✓ Prediction stored for fixture ${fixtureId}: ` +
      `${aggregated.recommendedOutcome} @ ${Math.round(aggregated.probability * 100)}% ` +
      `confidence=${Math.round(aggregated.confidence * 100)}% ★${aggregated.stars}`,
    );
  }

  private async buildContext(fixtureId: number): Promise<MatchContext | null> {
    const [fixture] = await this.db.db
      .select()
      .from(schema.fixtures)
      .where(eq(schema.fixtures.id, fixtureId))
      .limit(1);

    if (!fixture) return null;

    const [homeTeam] = await this.db.db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.id, fixture.homeTeamId))
      .limit(1);

    const [awayTeam] = await this.db.db
      .select()
      .from(schema.teams)
      .where(eq(schema.teams.id, fixture.awayTeamId))
      .limit(1);

    const [league] = await this.db.db
      .select()
      .from(schema.leagues)
      .where(eq(schema.leagues.id, fixture.leagueId))
      .limit(1);

    if (!homeTeam || !awayTeam || !league) return null;

    return {
      homeTeam: homeTeam.name,
      awayTeam: awayTeam.name,
      homeTeamShort: homeTeam.shortName,
      awayTeamShort: awayTeam.shortName,
      league: league.name,
      country: league.country ?? '',
      round: fixture.round,
      date: fixture.startsAt.toISOString().slice(0, 10),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
