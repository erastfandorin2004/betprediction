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

export const llmPredictionResponseSchema = z.object({
  markets: z.array(predictionMarketSchema).min(1).max(12),
  recommendedMarket: z.enum(MARKET_TYPES),
  recommendedOutcome: cappedString(40),
  rationale: z.string().min(10).transform((s) => s.trim().slice(0, 1000)),
  keyFactors: z.array(cappedString(280)).min(1).max(8),
  confidence: z.number().min(0).max(1),
});

export type LlmPredictionResponse = z.infer<typeof llmPredictionResponseSchema>;
