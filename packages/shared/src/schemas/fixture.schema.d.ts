import { z } from 'zod';
export declare const fixtureListQuerySchema: z.ZodObject<{
    date: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["scheduled", "live", "finished", "postponed", "cancelled", "all"]>>>;
    leagueId: z.ZodOptional<z.ZodNumber>;
    sportId: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    timezone: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    status: "cancelled" | "scheduled" | "live" | "finished" | "postponed" | "all";
    sportId: number;
    page: number;
    limit: number;
    timezone: string;
    date?: string | undefined;
    leagueId?: number | undefined;
}, {
    status?: "cancelled" | "scheduled" | "live" | "finished" | "postponed" | "all" | undefined;
    date?: string | undefined;
    leagueId?: number | undefined;
    sportId?: number | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    timezone?: string | undefined;
}>;
export type FixtureListQueryInput = z.input<typeof fixtureListQuerySchema>;
export type FixtureListQueryParsed = z.output<typeof fixtureListQuerySchema>;
//# sourceMappingURL=fixture.schema.d.ts.map