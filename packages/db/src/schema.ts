import {
  pgTable,
  text,
  integer,
  varchar,
  uuid,
  timestamp,
  date,
  real,
  boolean,
  jsonb,
  serial,
  unique,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const sports = pgTable('sports', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  slug: varchar('slug', { length: 50 }).notNull().unique(),
});

export const leagues = pgTable(
  'leagues',
  {
    id: integer('id').primaryKey(),
    sportId: integer('sport_id')
      .notNull()
      .references(() => sports.id),
    providerCode: varchar('provider_code', { length: 20 }).unique(),
    name: varchar('name', { length: 100 }).notNull(),
    shortName: varchar('short_name', { length: 50 }),
    country: varchar('country', { length: 100 }),
    countryCode: varchar('country_code', { length: 10 }),
    logo: text('logo'),
    season: integer('season').notNull(),
    type: varchar('type', { length: 20 }).notNull().default('League'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('leagues_sport_idx').on(t.sportId)],
);

export const teams = pgTable('teams', {
  id: integer('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  shortName: varchar('short_name', { length: 50 }).notNull().default(''),
  logo: text('logo'),
  country: varchar('country', { length: 100 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const fixtures = pgTable(
  'fixtures',
  {
    id: integer('id').primaryKey(),
    sportId: integer('sport_id')
      .notNull()
      .references(() => sports.id),
    leagueId: integer('league_id')
      .notNull()
      .references(() => leagues.id),
    homeTeamId: integer('home_team_id')
      .notNull()
      .references(() => teams.id),
    awayTeamId: integer('away_team_id')
      .notNull()
      .references(() => teams.id),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('scheduled'),
    minute: integer('minute'),
    round: varchar('round', { length: 100 }),
    venueName: varchar('venue_name', { length: 100 }),
    venueCity: varchar('venue_city', { length: 100 }),
    scoreHome: integer('score_home'),
    scoreAway: integer('score_away'),
    halfTimeHome: integer('half_time_home'),
    halfTimeAway: integer('half_time_away'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('fixtures_starts_at_idx').on(t.startsAt),
    index('fixtures_status_idx').on(t.status),
    index('fixtures_league_idx').on(t.leagueId),
  ],
);

export const predictions = pgTable(
  'predictions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fixtureId: integer('fixture_id')
      .notNull()
      .references(() => fixtures.id),
    markets: jsonb('markets').notNull().$type<unknown[]>(),
    recommendedMarket: varchar('recommended_market', { length: 20 }).notNull(),
    recommendedOutcome: varchar('recommended_outcome', { length: 20 }).notNull(),
    probability: real('probability').notNull(),
    confidence: real('confidence').notNull(),
    stars: integer('stars').notNull(),
    modelConsensus: jsonb('model_consensus').$type<unknown>(),
    rationale: text('rationale'),
    keyFactors: jsonb('key_factors').$type<string[]>(),
    valueEdge: real('value_edge'),
    impliedProbability: real('implied_probability'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    isCorrect: boolean('is_correct'),
    actualResult: varchar('actual_result', { length: 50 }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('predictions_fixture_idx').on(t.fixtureId),
    index('predictions_status_idx').on(t.status),
  ],
);

// Backtest runs: replaying the value-bet logic over a fixed sample of finished
// matches to measure ROI / hit-rate before trusting it live (spec §9). Each row
// is one full run; `picks` holds the per-match detail, `summary` the aggregates.
export const backtests = pgTable('backtests', {
  id: uuid('id').primaryKey().defaultRandom(),
  label: varchar('label', { length: 120 }).notNull().default(''),
  models: jsonb('models').notNull().$type<string[]>(),
  totalMatches: integer('total_matches').notNull(),
  recommended: integer('recommended').notNull(),
  skipped: integer('skipped').notNull(),
  won: integer('won').notNull(),
  lost: integer('lost').notNull(),
  pushed: integer('pushed').notNull().default(0),
  avgOdds: real('avg_odds').notNull().default(0),
  staked: real('staked').notNull().default(0),
  profit: real('profit').notNull().default(0),
  roi: real('roi').notNull().default(0),
  hitRate: real('hit_rate').notNull().default(0),
  byMarket: jsonb('by_market').notNull().$type<unknown>(),
  byLeague: jsonb('by_league').notNull().$type<unknown>(),
  picks: jsonb('picks').notNull().$type<unknown[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash'),
  role: varchar('role', { length: 20 }).notNull().default('user'),
  timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),
  locale: varchar('locale', { length: 10 }).notNull().default('ru'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  tier: varchar('tier', { length: 20 }).notNull().default('free'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const usageCounters = pgTable(
  'usage_counters',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    date: date('date').notNull(),
    predictionsUsed: integer('predictions_used').notNull().default(0),
  },
  (t) => [unique('usage_counters_user_date_unique').on(t.userId, t.date)],
);

export const favorites = pgTable(
  'favorites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: varchar('type', { length: 20 }).notNull(),
    entityId: integer('entity_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('favorites_user_idx').on(t.userId)],
);

export const modelWeights = pgTable('model_weights', {
  id: uuid('id').primaryKey().defaultRandom(),
  modelId: varchar('model_id', { length: 100 }).notNull().unique(),
  weight: real('weight').notNull().default(1.0),
  totalPredictions: integer('total_predictions').notNull().default(0),
  correctPredictions: integer('correct_predictions').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const sportsRelations = relations(sports, ({ many }) => ({
  leagues: many(leagues),
  fixtures: many(fixtures),
}));

export const leaguesRelations = relations(leagues, ({ one, many }) => ({
  sport: one(sports, { fields: [leagues.sportId], references: [sports.id] }),
  fixtures: many(fixtures),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  homeFixtures: many(fixtures, { relationName: 'homeTeam' }),
  awayFixtures: many(fixtures, { relationName: 'awayTeam' }),
}));

export const fixturesRelations = relations(fixtures, ({ one, many }) => ({
  sport: one(sports, { fields: [fixtures.sportId], references: [sports.id] }),
  league: one(leagues, { fields: [fixtures.leagueId], references: [leagues.id] }),
  homeTeam: one(teams, {
    fields: [fixtures.homeTeamId],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teams, {
    fields: [fixtures.awayTeamId],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  fixture: one(fixtures, { fields: [predictions.fixtureId], references: [fixtures.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  subscription: one(subscriptions),
  usageCounters: many(usageCounters),
  favorites: many(favorites),
}));
