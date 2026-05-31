"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.llmPredictionResponseSchema = void 0;
const zod_1 = require("zod");
const markets_1 = require("../constants/markets");
const marketOutcomeSchema = zod_1.z.object({
    label: zod_1.z.string().min(1).max(20),
    outcome: zod_1.z.string().min(1).max(20),
    probability: zod_1.z.number().min(0).max(1),
});
const predictionMarketSchema = zod_1.z.object({
    market: zod_1.z.enum(markets_1.MARKET_TYPES),
    outcomes: zod_1.z.array(marketOutcomeSchema).min(2).max(20),
});
exports.llmPredictionResponseSchema = zod_1.z.object({
    markets: zod_1.z.array(predictionMarketSchema).min(1).max(10),
    recommendedMarket: zod_1.z.enum(markets_1.MARKET_TYPES),
    recommendedOutcome: zod_1.z.string().min(1).max(20),
    rationale: zod_1.z.string().min(10).max(600),
    keyFactors: zod_1.z.array(zod_1.z.string().max(200)).min(1).max(5),
    confidence: zod_1.z.number().min(0).max(1),
});
//# sourceMappingURL=prediction.schema.js.map