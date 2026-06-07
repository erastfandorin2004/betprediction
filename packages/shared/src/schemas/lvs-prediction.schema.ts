import { z } from 'zod';

// Устойчивый разбор ответа модели для ЛВС (по образцу prediction.schema.ts):
// обязательны только probs/score/scorers, текстовые поля — мягкие (.catch),
// чтобы ответ сильной модели не отклонялся целиком из-за мелочей. Исход (outcome)
// при отсутствии выводится из вероятностей.
const cappedString = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

const probsSchema = z.object({
  win1: z.number().min(0).max(1),
  draw: z.number().min(0).max(1),
  win2: z.number().min(0).max(1),
});

const scoreSchema = z.object({
  home: z.number().int().min(0).max(20),
  away: z.number().int().min(0).max(20),
});

const scorerSchema = z.object({
  name: cappedString(80),
  team: z.enum(['home', 'away']).catch('home'),
  position: z.string().catch('').transform((s) => s.trim().slice(0, 40)),
  probability: z.number().min(0).max(1).catch(0.3),
});

export const lvsPredictionResponseSchema = z
  .object({
    outcome: z.enum(['1', 'X', '2']).optional(),
    probs: probsSchema,
    score: scoreSchema,
    scorers: z.array(scorerSchema).catch([]).transform((a) => a.filter((s) => s.name).slice(0, 3)),
    rationale: z.string().catch('').transform((s) => s.trim().slice(0, 1000)),
    keyFactors: z
      .array(z.string())
      .catch([])
      .transform((a) => a.map((s) => s.trim().slice(0, 280)).filter(Boolean).slice(0, 8)),
    confidence: z.number().min(0).max(1).catch(0.5),
  })
  .transform((o) => {
    let outcome = o.outcome;
    if (!outcome) {
      const { win1, draw, win2 } = o.probs;
      outcome = win1 >= draw && win1 >= win2 ? '1' : win2 >= draw ? '2' : 'X';
    }
    return { ...o, outcome };
  });

export type LvsPredictionResponse = z.infer<typeof lvsPredictionResponseSchema>;
