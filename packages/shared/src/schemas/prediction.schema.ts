import { z } from 'zod';
import { MARKET_TYPES } from '../constants/markets';

const marketOutcomeSchema = z.object({
  label: z.string().min(1).max(20),
  outcome: z.string().min(1).max(20),
  probability: z.number().min(0).max(1),
});

const predictionMarketSchema = z.object({
  market: z.enum(MARKET_TYPES),
  outcomes: z.array(marketOutcomeSchema).min(2).max(20),
});

export const llmPredictionResponseSchema = z.object({
  markets: z.array(predictionMarketSchema).min(1).max(10),
  recommendedMarket: z.enum(MARKET_TYPES),
  recommendedOutcome: z.string().min(1).max(20),
  rationale: z.string().min(10).max(600),
  keyFactors: z.array(z.string().max(200)).min(1).max(5),
  confidence: z.number().min(0).max(1),
});

export type LlmPredictionResponse = z.infer<typeof llmPredictionResponseSchema>;
