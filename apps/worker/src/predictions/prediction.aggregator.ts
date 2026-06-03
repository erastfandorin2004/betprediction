import { z } from 'zod';
import type { ModelConsensus } from '@ai-score/shared';
import { llmPredictionResponseSchema } from '@ai-score/shared';
import type { ModelCallResult } from '../laozhang/laozhang.client';

export type LlmResponse = z.infer<typeof llmPredictionResponseSchema>;
type LlmMarket = LlmResponse['markets'][number];
type LlmOutcome = LlmMarket['outcomes'][number];

export interface AggregatedPrediction {
  markets: AggMarket[];
  recommendedMarket: string;
  recommendedOutcome: string;
  probability: number;
  confidence: number;
  stars: 1 | 2 | 3 | 4 | 5;
  modelConsensus: ModelConsensus;
  rationale: string;
  keyFactors: string[];
  rawResponses: { modelId: string; valid: boolean; error: string | null }[];
}

interface AggMarket {
  market: string;
  outcomes: { label: string; outcome: string; probability: number; isRecommended: boolean }[];
  isLocked: boolean;
}

export interface ParsedModelResult {
  modelId: string;
  parsed: LlmResponse | null;
  error: string | null;
}

// Парсит ответ каждой модели, сохраняя привязку к modelId (для пер-модельного разбора).
export function parseResults(results: ModelCallResult[]): ParsedModelResult[] {
  return results.map((r) => {
    if (r.error) return { modelId: r.modelId, parsed: null, error: r.error };
    try {
      const json = JSON.parse(extractJson(r.content)) as unknown;
      const parsed = llmPredictionResponseSchema.parse(json);
      return { modelId: r.modelId, parsed, error: null };
    } catch (err) {
      const msg = err instanceof Error ? err.message.slice(0, 200) : 'parse error';
      return { modelId: r.modelId, parsed: null, error: msg };
    }
  });
}

export function parseAndValidate(results: ModelCallResult[]): {
  valid: LlmResponse[];
  meta: { modelId: string; valid: boolean; error: string | null }[];
} {
  const valid: LlmResponse[] = [];
  const meta: { modelId: string; valid: boolean; error: string | null }[] = [];

  for (const r of parseResults(results)) {
    if (r.parsed) {
      valid.push(r.parsed);
      meta.push({ modelId: r.modelId, valid: true, error: null });
    } else {
      meta.push({ modelId: r.modelId, valid: false, error: r.error });
    }
  }

  return { valid, meta };
}

// Some models (Claude, DeepSeek via the proxy) wrap JSON in ```json fences or add
// prose despite response_format. Strip fences and fall back to the outermost {…}.
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

export function aggregate(
  responses: LlmResponse[],
  totalAttempts: number,
  rawMeta: { modelId: string; valid: boolean; error: string | null }[],
): AggregatedPrediction | null {
  if (!responses.length) return null;

  const x12 = aggregateMarket(responses, '1X2');
  if (!x12 || x12.outcomes.length < 3) return null;

  const markets: AggMarket[] = [x12];
  for (const mkt of ['BTTS', 'O_U_2_5'] as const) {
    const m = aggregateMarket(responses, mkt);
    if (m) markets.push(m);
  }

  const recommended = x12.outcomes.reduce(
    (best, o) => (o.probability > best.probability ? o : best),
    x12.outcomes[0]!,
  );

  const confidence = calcConfidence(responses, '1X2', recommended.outcome);
  const stars = toStars(confidence);
  const modelConsensus = buildConsensus(responses, '1X2', recommended.outcome, totalAttempts);

  const rationale = responses
    .map((r) => r.rationale ?? '')
    .filter((s) => s.length > 20)
    .sort((a, b) => b.length - a.length)[0] ?? '';

  const keyFactors = [
    ...new Set(responses.flatMap((r) => r.keyFactors ?? []).filter(Boolean)),
  ].slice(0, 5);

  const marketsWithRec: AggMarket[] = markets.map((m) => {
    const maxProb = Math.max(...m.outcomes.map((o) => o.probability));
    return {
      ...m,
      outcomes: m.outcomes.map((o) => ({ ...o, isRecommended: o.probability === maxProb })),
    };
  });

  return {
    markets: marketsWithRec,
    recommendedMarket: '1X2',
    recommendedOutcome: recommended.outcome,
    probability: recommended.probability,
    confidence,
    stars,
    modelConsensus,
    rationale,
    keyFactors,
    rawResponses: rawMeta,
  };
}

function aggregateMarket(responses: LlmResponse[], marketType: string): AggMarket | null {
  const matching: LlmMarket[] = responses
    .map((r) => r.markets.find((m: LlmMarket) => m.market === marketType))
    .filter((m): m is LlmMarket => m !== undefined);

  if (matching.length < Math.ceil(responses.length / 2)) return null;

  const outcomeLabels = new Map<string, string>();
  for (const m of matching) {
    for (const o of m.outcomes as LlmOutcome[]) {
      if (!outcomeLabels.has(o.outcome)) outcomeLabels.set(o.outcome, o.label);
    }
  }
  if (!outcomeLabels.size) return null;

  const outcomes = [...outcomeLabels.entries()].map(([outcome, label]) => {
    const probs = matching.map(
      (m) => (m.outcomes as LlmOutcome[]).find((o) => o.outcome === outcome)?.probability ?? 0,
    );
    const avg = probs.reduce((a, b) => a + b, 0) / probs.length;
    return { label, outcome, probability: avg, isRecommended: false };
  });

  const sum = outcomes.reduce((a, o) => a + o.probability, 0);
  if (sum <= 0) return null;

  return {
    market: marketType,
    outcomes: outcomes.map((o) => ({ ...o, probability: o.probability / sum })),
    isLocked: false,
  };
}

function calcConfidence(responses: LlmResponse[], marketType: string, recommendedOutcome: string): number {
  const defaultProb = 1 / 3;
  const probs = responses.map((r) => {
    const m = r.markets.find((mkt: LlmMarket) => mkt.market === marketType);
    return (m?.outcomes as LlmOutcome[] | undefined)
      ?.find((o) => o.outcome === recommendedOutcome)?.probability ?? defaultProb;
  });

  const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
  const variance = probs.reduce((s, p) => s + (p - mean) ** 2, 0) / probs.length;
  const stdDev = Math.sqrt(variance);

  const agreement = Math.max(0, 1 - stdDev * 4);
  const signal = Math.min(1, Math.max(0, (mean - defaultProb) / (1 - defaultProb)));

  return Math.min(0.97, Math.max(0.05, 0.6 * agreement + 0.4 * signal));
}

function buildConsensus(
  responses: LlmResponse[],
  marketType: string,
  recommendedOutcome: string,
  totalAttempts: number,
): ModelConsensus {
  const agreeing = responses.filter((r) => {
    const m = r.markets.find((mkt: LlmMarket) => mkt.market === marketType);
    const outcomes = m?.outcomes as LlmOutcome[] | undefined;
    if (!outcomes?.length) return false;
    const maxProb = Math.max(...outcomes.map((o) => o.probability));
    return outcomes.find((o) => o.outcome === recommendedOutcome)?.probability === maxProb;
  }).length;

  const agreement = responses.length > 0 ? agreeing / responses.length : 0;
  const level: ModelConsensus['level'] =
    agreement >= 0.75 ? 'high' : agreement >= 0.5 ? 'medium' : 'low';
  const spread = { high: 'низкий', medium: 'средний', low: 'высокий' }[level];

  return {
    totalModels: totalAttempts,
    agreement,
    level,
    summary: `${agreeing} из ${responses.length} моделей за «${recommendedOutcome}», разброс ${spread}`,
  };
}

function toStars(confidence: number): 1 | 2 | 3 | 4 | 5 {
  if (confidence >= 0.85) return 5;
  if (confidence >= 0.70) return 4;
  if (confidence >= 0.55) return 3;
  if (confidence >= 0.40) return 2;
  return 1;
}
