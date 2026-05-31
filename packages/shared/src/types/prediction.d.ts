export type MarketType = '1X2' | 'BTTS' | 'O_U_1_5' | 'O_U_2_5' | 'O_U_3_5' | 'DC' | 'CS_TOP3' | 'HANDICAP' | 'HOME_TOTAL' | 'AWAY_TOTAL';
export interface MarketOutcome {
    label: string;
    outcome: string;
    probability: number;
    isRecommended: boolean;
}
export interface PredictionMarket {
    market: MarketType;
    outcomes: MarketOutcome[];
    isLocked: boolean;
}
export interface ModelConsensus {
    totalModels: number;
    agreement: number;
    level: 'high' | 'medium' | 'low';
    summary: string;
}
export type PredictionStatus = 'pending' | 'resolved' | 'cancelled';
export interface PredictionOutcome {
    isCorrect: boolean;
    actualResult: string;
    resolvedAt: string;
}
export interface PredictionBadge {
    recommendedOutcome: string;
    probability: number;
    confidence: number;
    stars: 1 | 2 | 3 | 4 | 5;
    isLocked: boolean;
}
export interface PredictionDetail {
    fixtureId: number;
    createdAt: string;
    status: PredictionStatus;
    markets: PredictionMarket[];
    recommendedMarket: MarketType;
    recommendedOutcome: string;
    probability: number;
    confidence: number;
    stars: 1 | 2 | 3 | 4 | 5;
    modelConsensus: ModelConsensus | null;
    rationale: string | null;
    keyFactors: string[] | null;
    valueEdge: number | null;
    impliedProbability: number | null;
    outcome: PredictionOutcome | null;
    isLocked: boolean;
    lockedFields: string[];
}
export interface AccuracyStats {
    total: number;
    correct: number;
    rate: number;
}
export interface TrackRecordStats {
    overall: AccuracyStats;
    byMarket: Partial<Record<MarketType, AccuracyStats>>;
    byLeague: Array<{
        leagueId: number;
        leagueName: string;
        stats: AccuracyStats;
    }>;
    byConfidence: Array<{
        stars: number;
        stats: AccuracyStats;
    }>;
    roiSimulation: {
        flatStake: number;
        roi: number;
        totalBets: number;
    };
    updatedAt: string;
}
//# sourceMappingURL=prediction.d.ts.map