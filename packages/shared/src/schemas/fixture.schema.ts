import { z } from 'zod';

export const fixtureListQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .optional(),
  status: z
    .enum(['scheduled', 'live', 'finished', 'postponed', 'cancelled', 'all'])
    .optional()
    .default('all'),
  leagueId: z.coerce.number().positive().optional(),
  sportId: z.coerce.number().positive().optional().default(1),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  timezone: z.string().optional().default('UTC'),
});

export type FixtureListQueryInput = z.input<typeof fixtureListQuerySchema>;
export type FixtureListQueryParsed = z.output<typeof fixtureListQuerySchema>;
