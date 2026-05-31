import type { MarketType } from './prediction';

export interface OddsOutcome {
  label: string;
  outcome: string;
  value: number;
  impliedProbability: number;
}

export interface OddsMarket {
  market: MarketType;
  bookmaker: string;
  outcomes: OddsOutcome[];
  updatedAt: string;
}

export interface OddsMovement {
  market: MarketType;
  outcome: string;
  points: Array<{ value: number; timestamp: string }>;
}

export interface OddsData {
  fixtureId: number;
  markets: OddsMarket[];
  movements: OddsMovement[];
  updatedAt: string;
}
