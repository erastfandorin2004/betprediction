import { z } from 'zod';
import { MARKET_TYPES } from '../constants/markets';

// Free-text fields are TRUNCATED, not rejected: a strong model that writes a
// slightly verbose rationale/keyFactor must still count in the ensemble — we
// shouldn't drop its whole prediction over a length overrun.
const cappedString = (max: number) =>
  z.string().transform((s) => s.trim().slice(0, max));

const marketOutcomeSchema = z.object({
  label: cappedString(40),
  outcome: cappedString(40),
  probability: z.number().min(0).max(1),
});

const predictionMarketSchema = z.object({
  market: z.enum(MARKET_TYPES),
  outcomes: z.array(marketOutcomeSchema).min(2).max(20),
});

// Чистим массив рынков ДО строгой валидации: выбрасываем неизвестные типы и
// дубли (модель иногда отдаёт >12 рынков или повторы) — иначе весь ответ
// сильной модели отклонялся бы целиком. Так у каждой модели всегда есть ответ.
const KNOWN_MARKETS = new Set<string>(MARKET_TYPES);
const marketsField = z.preprocess((val) => {
  if (!Array.isArray(val)) return val;
  const seen = new Set<string>();
  const out: unknown[] = [];
  for (const m of val) {
    const type = m && typeof m === 'object' ? (m as { market?: unknown }).market : undefined;
    if (typeof type !== 'string' || !KNOWN_MARKETS.has(type) || seen.has(type)) continue;
    seen.add(type);
    out.push(m);
  }
  return out;
}, z.array(predictionMarketSchema).min(1));

export const llmPredictionResponseSchema = z.object({
  markets: marketsField,
  recommendedMarket: z.enum(MARKET_TYPES),
  recommendedOutcome: cappedString(40),
  rationale: z.string().min(10).transform((s) => s.trim().slice(0, 1000)),
  keyFactors: z.array(cappedString(280)).min(1).max(8),
  confidence: z.number().min(0).max(1),
});

export type LlmPredictionResponse = z.infer<typeof llmPredictionResponseSchema>;
