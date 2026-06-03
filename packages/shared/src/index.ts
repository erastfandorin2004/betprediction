export type { ApiResponse, ApiError, PaginationMeta, PaginationQuery, SportRef } from './types/common';

export type {
  FixtureStatus,
  Score,
  TeamRef,
  Venue,
  MatchEvent,
  MatchEventType,
  MatchStats,
  TeamMatchStats,
  FormRecord,
  TeamForm,
  H2HRecord,
  InjuryReport,
  PlayerLineup,
  Lineups,
  TeamStandingRow,
  TeamStandings,
  FixtureListItem,
  FixtureDetail,
} from './types/fixture';

export type {
  MarketType,
  MarketOutcome,
  PredictionMarket,
  ModelConsensus,
  PredictionStatus,
  PredictionOutcome,
  PredictionBadge,
  PredictionDetail,
  AccuracyStats,
  TrackRecordStats,
  BacktestResult,
  BacktestModelView,
  BacktestPick,
  BacktestSegmentStats,
  BacktestSummary,
} from './types/prediction';

export type {
  League,
  LeagueRef,
  StandingRow,
  StandingGroup,
  TopScorer,
} from './types/league';

export type {
  SubscriptionTier,
  FavoriteType,
  UserProfile,
  Subscription,
  UsageCounter,
  Favorite,
  NotificationPreference,
} from './types/user';

export type { OddsOutcome, OddsMarket, OddsMovement, OddsData } from './types/odds';

export type { ClientMessage, ServerMessage } from './types/ws';

export { registerSchema, loginSchema, refreshSchema } from './schemas/auth.schema';
export type { RegisterInput, LoginInput, RefreshInput } from './schemas/auth.schema';

export { fixtureListQuerySchema } from './schemas/fixture.schema';
export type { FixtureListQueryInput, FixtureListQueryParsed } from './schemas/fixture.schema';

export { llmPredictionResponseSchema } from './schemas/prediction.schema';
export type { LlmPredictionResponse } from './schemas/prediction.schema';

export {
  MARKET_TYPES,
  MARKET_LABELS,
  FREE_PREDICTIONS_PER_DAY,
  CONFIDENCE_STAR_THRESHOLDS,
  VALUE_EDGE_THRESHOLD,
} from './constants/markets';
