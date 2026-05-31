export type SubscriptionTier = 'free' | 'pro';

export type FavoriteType = 'team' | 'league' | 'fixture';

export interface UserProfile {
  id: string;
  email: string;
  role: 'user' | 'admin';
  timezone: string;
  locale: 'ru' | 'en';
  createdAt: string;
}

export interface Subscription {
  tier: SubscriptionTier;
  expiresAt: string | null;
  cancelledAt: string | null;
  stripeCustomerId: string | null;
}

export interface UsageCounter {
  date: string;
  predictionsUsed: number;
  predictionsLimit: number;
  isUnlimited: boolean;
}

export interface Favorite {
  id: string;
  type: FavoriteType;
  entityId: number;
  entityName: string;
  entityLogo: string | null;
  createdAt: string;
}

export interface NotificationPreference {
  channel: 'push' | 'telegram';
  types: {
    matchStart: boolean;
    goal: boolean;
    predictionReady: boolean;
    valueBet: boolean;
    dailyPicks: boolean;
  };
  dailyPicksTime: string | null;
}
