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

// Обязательны только markets. Остальное — мягкое: пустой/кривой rationale,
// keyFactors, confidence НЕ должны ронять ответ модели (иначе «нет ответа»).
// Рекомендация выводится из самого вероятного исхода, если модель её не дала.
export const llmPredictionResponseSchema = z
  .object({
    markets: marketsField,
    recommendedMarket: z.enum(MARKET_TYPES).optional(),
    recommendedOutcome: cappedString(40).optional(),
    rationale: z.string().catch('').transform((s) => s.trim().slice(0, 1000)),
    keyFactors: z
      .array(z.string())
      .catch([])
      .transform((a) => a.map((s) => s.trim().slice(0, 280)).filter(Boolean).slice(0, 8)),
    confidence: z.number().min(0).max(1).catch(0.5),
  })
  .transform((o) => {
    let mk = o.recommendedMarket;
    let oc = o.recommendedOutcome;
    if (!mk || !oc) {
      // Самый вероятный исход среди всех рынков → рекомендация по умолчанию.
      let best: { mk: (typeof MARKET_TYPES)[number]; oc: string; p: number } | null = null;
      for (const m of o.markets)
        for (const out of m.outcomes)
          if (!best || out.probability > best.p) best = { mk: m.market, oc: out.outcome, p: out.probability };
      mk = mk ?? best!.mk;
      oc = oc ?? best!.oc;
    }
    return { ...o, recommendedMarket: mk, recommendedOutcome: oc };
  });

export type LlmPredictionResponse = z.infer<typeof llmPredictionResponseSchema>;
