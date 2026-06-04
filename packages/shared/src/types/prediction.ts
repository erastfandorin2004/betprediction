export type MarketType =
  | '1X2'
  | 'BTTS'
  | 'O_U_1_5'
  | 'O_U_2_5'
  | 'O_U_3_5'
  | 'DC'
  | 'CS_TOP3'
  | 'HANDICAP'
  | 'HOME_TOTAL'
  | 'AWAY_TOTAL'
  | 'CORNERS_OU'
  | 'CARDS_OU';

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
  models: ModelForecast[] | null;   // прогноз каждой модели ансамбля
  summary: string | null;           // синтез мнений всех моделей (общий вывод)
  settlement: PredictionSettlement | null; // проверка прогноза после матча
  isLocked: boolean;
  lockedFields: string[];
}

// ── Проверка прогноза после матча (settlement) ──────────────────────────────
export type SettlementStatus = 'won' | 'lost' | 'push' | 'unknown';

export interface MarketCheck {
  market: string;            // код рынка (1X2, CORNERS_OU, …)
  marketLabel: string;       // «Тотал угловых», «Исход 1X2» …
  predictedLabel: string;    // что выбрала AI: «Больше 8.5», «П1» …
  predictedProbability: number | null;
  actual: string;            // фактический показатель: «10 угловых», «2:1» …
  status: SettlementStatus;
  explanation: string;       // краткое объяснение, почему засчитан/нет
}

export interface PredictionSettlement {
  resolvedAt: string;
  finalScore: { home: number; away: number };
  winner: 'home' | 'away' | 'draw';
  mainStatus: 'won' | 'lost';            // основной прогноз
  overall: 'won' | 'partial' | 'lost';   // итог с учётом всех рынков
  wonCount: number;
  total: number;                         // проверяемых рынков (без unknown)
  mainCheck: MarketCheck;
  checks: MarketCheck[];                 // все рынки, включая основной
  stats: { corners: number | null; cards: number | null };
}

// Прогноз одной модели ансамбля по матчу (для on-demand AI-прогноза).
export interface ModelForecast {
  modelId: string;
  probability: number | null;   // вероятность итогового исхода по этой модели
  ownMarket: string | null;     // рынок, рекомендованный самой моделью
  ownOutcomeLabel: string | null;
  confidence: number | null;
  agreed: boolean;              // согласна ли модель с итоговым выбором
  rationale: string | null;
  error: string | null;
}

// Запись истории анализов (для раздела «Трек-рекорд»).
export interface PredictionHistoryItem {
  fixtureId: number;
  match: string;            // «Швеция — Греция»
  league: string;
  kickoff: string;          // ISO старта матча
  createdAt: string;        // когда сделан анализ
  status: PredictionStatus; // pending | resolved
  market: string;           // рекомендованный рынок
  pick: string;             // подпись ставки («П1», «Меньше 2.5»…)
  probability: number;
  stars: number;
  finalScore: { home: number; away: number } | null;
  verdict: 'won' | 'partial' | 'lost' | null; // итог после матча
  wonCount: number | null;
  total: number | null;
}

export interface AccuracyStats {
  total: number;
  correct: number;
  rate: number;
}

export interface TrackRecordStats {
  overall: AccuracyStats;
  byMarket: Partial<Record<MarketType, AccuracyStats>>;
  byLeague: Array<{ leagueId: number; leagueName: string; stats: AccuracyStats }>;
  byConfidence: Array<{ stars: number; stats: AccuracyStats }>;
  roiSimulation: { flatStake: number; roi: number; totalBets: number };
  updatedAt: string;
}

// ─── Backtest (spec §9) ─────────────────────────────────────────────────────
export type BacktestResult = 'won' | 'lost' | 'push' | 'skip';

// Прогноз одной модели ансамбля по конкретному матчу.
export interface BacktestModelView {
  modelId: string;
  probability: number | null;   // вероятность выбранного исхода по этой модели
  ownMarket: string | null;     // рынок, который рекомендовала сама модель
  ownOutcomeLabel: string | null;
  confidence: number | null;
  agreed: boolean;              // согласна ли модель с итоговым выбором
  rationale: string | null;
  error: string | null;         // если модель не ответила/ответ не распознан
}

export interface BacktestPick {
  match: string;
  league: string;
  date: string;
  recommended: boolean;
  market: string | null;
  outcome: string | null;
  outcomeLabel: string | null;
  modelProbability: number | null;
  impliedProbability: number | null;
  valueEdge: number | null;
  odds: number | null;
  stars: number | null;
  result: BacktestResult;
  actualResult: string;
  rationale: string | null;
  keyFactors: string[] | null;
  consensus: string | null;
  summary: string | null;       // синтез мнений всех моделей (общий вывод)
  models: BacktestModelView[] | null;
}

export interface BacktestSegmentStats {
  key: string;
  bets: number;
  won: number;
  lost: number;
  profit: number;
  roi: number;
}

export interface BacktestSummary {
  label: string;
  models: string[];
  totalMatches: number;
  recommended: number;
  skipped: number;
  won: number;
  lost: number;
  pushed: number;
  avgOdds: number;
  staked: number;
  profit: number;
  roi: number;
  hitRate: number;
  byMarket: BacktestSegmentStats[];
  byLeague: BacktestSegmentStats[];
  picks: BacktestPick[];
  createdAt: string;
}
