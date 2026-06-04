import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import {
  LaozhangClient,
  buildSystemPrompt,
  buildUserPrompt,
  llmPredictionResponseSchema,
  type MatchContext,
  type ModelCallResult,
} from '@ai-score/shared';
import type { PredictionDetail, ModelConsensus } from '@ai-score/shared';
import { DatabaseService } from '../database/database.service';
import { PredictionsService } from './predictions.service';

type LlmResponse = ReturnType<typeof llmPredictionResponseSchema.parse>;
type AggMarket = {
  market: string;
  outcomes: { label: string; outcome: string; probability: number; isRecommended: boolean }[];
  isLocked: boolean;
};

const DEFAULT_MODELS = ['gpt-4o', 'claude-sonnet-4-6', 'gemini-2.5-flash-nothinking', 'deepseek-v3'];

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly predictions: PredictionsService,
  ) {}

  // On-demand full AI analysis for a single fixture (the "AI-прогноз" button).
  // Test phase: free, no token charge (see config.predictions.tokensEnabled).
  async analyze(fixtureId: number): Promise<PredictionDetail> {
    const apiKey = this.config.get<string>('laozhang.apiKey') ?? '';
    if (!apiKey) throw new NotFoundException('LAOZHANG_API_KEY is not configured');

    const ctx = await this.buildContext(fixtureId);
    if (!ctx) throw new NotFoundException(`Fixture ${fixtureId} not found`);

    // TODO(tokens): when config.predictions.tokensEnabled — verify & charge
    // config.predictions.aiCostTokens here before running the analysis.

    const baseUrl = this.config.get<string>('laozhang.baseUrl');
    const models = (this.config.get<string>('laozhang.models') ?? DEFAULT_MODELS.join(','))
      .split(',').map((m) => m.trim()).filter(Boolean);
    const client = new LaozhangClient(apiKey, baseUrl, 90_000);

    this.logger.log(`AI analysis: ${ctx.homeTeam} vs ${ctx.awayTeam} × ${models.length} models`);
    const results = await client.fanOut(models, [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(ctx) },
    ]);

    const valid = parseValid(results);
    this.logger.log(`AI analysis: ${valid.length}/${results.length} models responded for ${fixtureId}`);
    if (!valid.length) throw new NotFoundException('All AI models failed to produce a prediction');

    const agg = aggregate(valid, results.length);

    // Persist as an immutable-style snapshot; re-running replaces the prior one.
    await this.db.db.delete(schema.predictions).where(eq(schema.predictions.fixtureId, fixtureId));
    const [row] = await this.db.db
      .insert(schema.predictions)
      .values({
        fixtureId,
        markets: agg.markets as unknown[],
        recommendedMarket: agg.recommendedMarket,
        recommendedOutcome: agg.recommendedOutcome,
        probability: agg.probability,
        confidence: agg.confidence,
        stars: agg.stars,
        modelConsensus: agg.modelConsensus as unknown,
        rationale: agg.rationale,
        keyFactors: agg.keyFactors,
        valueEdge: null,
        impliedProbability: null,
        status: 'pending',
      })
      .returning();

    return this.predictions.toDetail(row!, false);
  }

  private async buildContext(fixtureId: number): Promise<MatchContext | null> {
    const [fixture] = await this.db.db
      .select()
      .from(schema.fixtures)
      .where(eq(schema.fixtures.id, fixtureId))
      .limit(1);
    if (!fixture) return null;

    const [home] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.homeTeamId)).limit(1);
    const [away] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.awayTeamId)).limit(1);
    const [league] = await this.db.db.select().from(schema.leagues).where(eq(schema.leagues.id, fixture.leagueId)).limit(1);
    if (!home || !away || !league) return null;

    const isFriendly = /friendl|товарищ/i.test(`${league.name} ${league.type ?? ''}`);
    return {
      homeTeam: home.name,
      awayTeam: away.name,
      homeTeamShort: home.shortName || home.name,
      awayTeamShort: away.shortName || away.name,
      league: league.name,
      country: league.country ?? '',
      round: fixture.round,
      date: fixture.startsAt.toISOString().slice(0, 10),
      importance: isFriendly ? 'Товарищеский матч — невысокие ставки, возможна ротация составов' : undefined,
    };
  }
}

// ── Pure aggregation (all markets the ensemble returned → PredictionDetail) ──

function parseValid(results: ModelCallResult[]): LlmResponse[] {
  const valid: LlmResponse[] = [];
  for (const r of results) {
    if (r.error) continue;
    try {
      valid.push(llmPredictionResponseSchema.parse(JSON.parse(extractJson(r.content))));
    } catch {
      /* skip unparseable */
    }
  }
  return valid;
}

function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1]!.trim();
  if (s.startsWith('{') && s.endsWith('}')) return s;
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first !== -1 && last > first) return s.slice(first, last + 1);
  return s;
}

interface Aggregated {
  markets: AggMarket[];
  recommendedMarket: string;
  recommendedOutcome: string;
  probability: number;
  confidence: number;
  stars: 1 | 2 | 3 | 4 | 5;
  modelConsensus: ModelConsensus;
  rationale: string;
  keyFactors: string[];
}

function aggregate(responses: LlmResponse[], totalAttempts: number): Aggregated {
  // Consensus probabilities for every market the models returned.
  const marketTypes = [...new Set(responses.flatMap((r) => r.markets.map((m) => m.market)))];
  const markets: AggMarket[] = [];
  for (const mt of marketTypes) {
    const m = aggregateMarket(responses, mt);
    if (m) markets.push(m);
  }

  // Recommended pick = most common (market, outcome) recommended by the models.
  const tally = new Map<string, number>();
  for (const r of responses) tally.set(`${r.recommendedMarket}|${r.recommendedOutcome}`, (tally.get(`${r.recommendedMarket}|${r.recommendedOutcome}`) ?? 0) + 1);
  let topKey = `${responses[0]!.recommendedMarket}|${responses[0]!.recommendedOutcome}`;
  let topVotes = 0;
  for (const [k, v] of tally) if (v > topVotes) { topVotes = v; topKey = k; }
  const [recMarket, recOutcome] = topKey.split('|') as [string, string];

  const recMarketAgg = markets.find((m) => m.market === recMarket);
  const recOut = recMarketAgg?.outcomes.find((o) => o.outcome === recOutcome);
  const probability = recOut?.probability ?? 0.34;

  const confidence = clamp(
    responses.reduce((s, r) => s + r.confidence, 0) / responses.length,
    0.05, 0.97,
  );
  const agreement = topVotes / responses.length;
  const level: ModelConsensus['level'] = agreement >= 0.75 ? 'high' : agreement >= 0.5 ? 'medium' : 'low';

  const rationale = responses
    .map((r) => r.rationale ?? '')
    .filter((s) => s.length > 20)
    .sort((a, b) => b.length - a.length)[0] ?? '';
  const keyFactors = [...new Set(responses.flatMap((r) => r.keyFactors ?? []).filter(Boolean))].slice(0, 5);

  // Flag the recommended outcome in its market.
  const marketsWithRec = markets.map((m) => ({
    ...m,
    outcomes: m.outcomes.map((o) => ({
      ...o,
      isRecommended: m.market === recMarket && o.outcome === recOutcome,
    })),
  }));

  return {
    markets: marketsWithRec,
    recommendedMarket: recMarket,
    recommendedOutcome: recOutcome,
    probability,
    confidence,
    stars: toStars(confidence),
    modelConsensus: {
      totalModels: totalAttempts,
      agreement,
      level,
      summary: `${topVotes} из ${responses.length} моделей за «${recOutcome}» (${recMarket})`,
    },
    rationale,
    keyFactors,
  };
}

function aggregateMarket(responses: LlmResponse[], marketType: string): AggMarket | null {
  const matching = responses
    .map((r) => r.markets.find((m) => m.market === marketType))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);
  if (!matching.length) return null;

  const labels = new Map<string, string>();
  for (const m of matching) for (const o of m.outcomes) if (!labels.has(o.outcome)) labels.set(o.outcome, o.label);

  const outcomes = [...labels.entries()].map(([outcome, label]) => {
    const probs = matching.map((m) => m.outcomes.find((o) => o.outcome === outcome)?.probability ?? 0);
    return { label, outcome, probability: probs.reduce((a, b) => a + b, 0) / probs.length, isRecommended: false };
  });
  const sum = outcomes.reduce((a, o) => a + o.probability, 0);
  if (sum <= 0) return null;

  return {
    market: marketType,
    outcomes: outcomes.map((o) => ({ ...o, probability: o.probability / sum })),
    isLocked: false,
  };
}

function toStars(c: number): 1 | 2 | 3 | 4 | 5 {
  if (c >= 0.85) return 5;
  if (c >= 0.7) return 4;
  if (c >= 0.55) return 3;
  if (c >= 0.4) return 2;
  return 1;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
