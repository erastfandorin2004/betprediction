import { z } from 'zod';
export declare const llmPredictionResponseSchema: z.ZodObject<{
    markets: z.ZodArray<z.ZodObject<{
        market: z.ZodEnum<["1X2", "BTTS", "O_U_1_5", "O_U_2_5", "O_U_3_5", "DC", "CS_TOP3", "HANDICAP", "HOME_TOTAL", "AWAY_TOTAL"]>;
        outcomes: z.ZodArray<z.ZodObject<{
            label: z.ZodString;
            outcome: z.ZodString;
            probability: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            label: string;
            outcome: string;
            probability: number;
        }, {
            label: string;
            outcome: string;
            probability: number;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        market: "1X2" | "BTTS" | "O_U_1_5" | "O_U_2_5" | "O_U_3_5" | "DC" | "CS_TOP3" | "HANDICAP" | "HOME_TOTAL" | "AWAY_TOTAL";
        outcomes: {
            label: string;
            outcome: string;
            probability: number;
        }[];
    }, {
        market: "1X2" | "BTTS" | "O_U_1_5" | "O_U_2_5" | "O_U_3_5" | "DC" | "CS_TOP3" | "HANDICAP" | "HOME_TOTAL" | "AWAY_TOTAL";
        outcomes: {
            label: string;
            outcome: string;
            probability: number;
        }[];
    }>, "many">;
    recommendedMarket: z.ZodEnum<["1X2", "BTTS", "O_U_1_5", "O_U_2_5", "O_U_3_5", "DC", "CS_TOP3", "HANDICAP", "HOME_TOTAL", "AWAY_TOTAL"]>;
    recommendedOutcome: z.ZodString;
    rationale: z.ZodString;
    keyFactors: z.ZodArray<z.ZodString, "many">;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    markets: {
        market: "1X2" | "BTTS" | "O_U_1_5" | "O_U_2_5" | "O_U_3_5" | "DC" | "CS_TOP3" | "HANDICAP" | "HOME_TOTAL" | "AWAY_TOTAL";
        outcomes: {
            label: string;
            outcome: string;
            probability: number;
        }[];
    }[];
    recommendedMarket: "1X2" | "BTTS" | "O_U_1_5" | "O_U_2_5" | "O_U_3_5" | "DC" | "CS_TOP3" | "HANDICAP" | "HOME_TOTAL" | "AWAY_TOTAL";
    recommendedOutcome: string;
    rationale: string;
    keyFactors: string[];
    confidence: number;
}, {
    markets: {
        market: "1X2" | "BTTS" | "O_U_1_5" | "O_U_2_5" | "O_U_3_5" | "DC" | "CS_TOP3" | "HANDICAP" | "HOME_TOTAL" | "AWAY_TOTAL";
        outcomes: {
            label: string;
            outcome: string;
            probability: number;
        }[];
    }[];
    recommendedMarket: "1X2" | "BTTS" | "O_U_1_5" | "O_U_2_5" | "O_U_3_5" | "DC" | "CS_TOP3" | "HANDICAP" | "HOME_TOTAL" | "AWAY_TOTAL";
    recommendedOutcome: string;
    rationale: string;
    keyFactors: string[];
    confidence: number;
}>;
export type LlmPredictionResponse = z.infer<typeof llmPredictionResponseSchema>;
//# sourceMappingURL=prediction.schema.d.ts.map