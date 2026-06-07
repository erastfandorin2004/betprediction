// ЛВС (LVS) — отдельный раздел матчей ЧМ. Анализ ограничен 4 рынками: исход
// (1X2), точный счёт и 3 вероятных бомбардира. Типы полностью отдельны от
// основного прогноза (PredictionDetail), чтобы разделы не смешивались.

export type LvsOutcome = '1' | 'X' | '2';
export type LvsResultStatus = 'won' | 'partial' | 'lost';
export type LvsStatus = 'pending' | 'resolved';

export interface LvsScorer {
  name: string;
  team: 'home' | 'away';
  probability: number;
}

export interface LvsScorerResult {
  name: string;
  team: 'home' | 'away';
  scored: boolean;
}

// Прогноз отдельной модели в ансамбле (для пер-модельного разбора в карточке).
export interface LvsModelForecast {
  modelId: string;
  outcome: LvsOutcome | null;
  scoreHome: number | null;
  scoreAway: number | null;
  scorers: string[];
  confidence: number | null;
  rationale: string | null;
  error: string | null;
}

export interface LvsLineupPlayer {
  id: string;
  name: string;
  number: number | null;
}

export interface LvsTeamLineup {
  formation: string;
  coach: string | null;
  startingXI: LvsLineupPlayer[];
}

export interface LvsLineups {
  home: LvsTeamLineup;
  away: LvsTeamLineup;
}

// Итог сверки прогноза с фактом (заполняется после матча).
export interface LvsSettlementView {
  resultStatus: LvsResultStatus;
  outcomeHit: boolean;
  scoreHit: boolean;
  actualOutcome: LvsOutcome;
  actualScore: { home: number; away: number };
  scorers: LvsScorerResult[];
}

// Полный прогноз ЛВС (ответ analyze + вложение в карточку матча).
export interface LvsPredictionDetail {
  fixtureId: number;
  outcome: LvsOutcome;
  outcomeLabel: string; // «П1» | «Ничья» | «П2»
  probs: { win1: number; draw: number; win2: number };
  score: { home: number; away: number };
  scorers: LvsScorer[];
  confidence: number;
  stars: number;
  rationale: string | null;
  summary: string | null;
  odds: string | null; // подтянутая букмекерская линия (читаемый блок)
  modelViews: LvsModelForecast[];
  lineups: LvsLineups | null;
  status: LvsStatus;
  result: LvsSettlementView | null;
  createdAt: string;
  resolvedAt: string | null;
}

import type { TeamRef } from './fixture';

// Матч ЧМ в разделе ЛВС с приложенным прогнозом (если уже сделан).
export interface LvsFixtureItem {
  id: number;
  startsAt: string;
  status: string;
  minute: number | null;
  round: string | null;
  homeTeam: TeamRef;
  awayTeam: TeamRef;
  score: { home: number; away: number } | null;
  prediction: LvsPredictionDetail | null;
}

export interface LvsDay {
  date: string;
  fixtures: LvsFixtureItem[];
}

// Строка отдельной Истории ЛВС (только разрешённые прогнозы).
export interface LvsHistoryItem {
  fixtureId: number;
  match: string; // «Бразилия — Аргентина»
  kickoff: string;
  resolvedAt: string | null;
  predictedOutcome: LvsOutcome;
  predictedOutcomeLabel: string;
  actualOutcome: LvsOutcome;
  actualOutcomeLabel: string;
  predictedScore: { home: number; away: number };
  actualScore: { home: number; away: number };
  scorers: LvsScorerResult[];
  resultStatus: LvsResultStatus;
}
