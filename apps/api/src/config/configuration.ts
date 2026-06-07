import { Logger } from '@nestjs/common';

const logger = new Logger('Configuration');

export default () => {
  const jwtSecret = process.env['JWT_SECRET'];
  if (process.env['NODE_ENV'] === 'production' && !jwtSecret) {
    throw new Error('JWT_SECRET must be set in production');
  }
  if (jwtSecret === 'change-me-in-production-use-a-long-random-string') {
    logger.warn('JWT_SECRET is using the default value — change it before going to production');
  }

  return {
    nodeEnv: process.env['NODE_ENV'] ?? 'development',
    port: parseInt(process.env['PORT'] ?? '3001', 10),
    jwt: {
      secret: jwtSecret ?? 'change-me-in-production-use-a-long-random-string',
      accessExpiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] ?? '15m',
      refreshExpiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] ?? '7d',
    },
    database: {
      url: process.env['DATABASE_URL'] ?? 'postgresql://aiscore:aiscore@localhost:5432/aiscore',
    },
    redis: {
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    },
    laozhang: {
      apiKey: process.env['LAOZHANG_API_KEY'] ?? '',
      baseUrl: process.env['LAOZHANG_BASE_URL'] ?? 'https://api.laozhang.ai/v1',
      // grok-4 — laozhang-алиас Grok 4.3 (литералы grok-4.3/grok-4-3 не резолвятся).
      models: process.env['LAOZHANG_MODELS'] ??
        ['gpt-5.1', 'grok-4', 'claude-opus-4-8', 'deepseek-chat'].join(','),
    },
    // On-demand AI prediction. Tokens disabled in the test phase — structure ready
    // to flip TOKENS_ENABLED=true and charge AI_PREDICTION_COST tokens later.
    predictions: {
      tokensEnabled: process.env['TOKENS_ENABLED'] === 'true',
      aiCostTokens: parseInt(process.env['AI_PREDICTION_COST'] ?? '5', 10),
    },
    // ЛВС (LVS) — отдельный раздел матчей ЧМ. Анализ запускается автоматически за
    // ~1ч до матча (когда доступны составы) — намеренное исключение из «анализ
    // только по кнопке», действует только для ЛВС. Отключается LVS_AUTO=false.
    lvs: {
      auto: process.env['LVS_AUTO'] !== 'false',
    },
    newsApi: {
      apiKey: process.env['NEWS_API_KEY'] ?? '',
    },
    rapidApi: (() => {
      // Comma-separated list of RapidAPI keys — the FlashLive adapter rotates to
      // the next when one hits its monthly quota (pool several free accounts).
      const footballApiKeys = (process.env['RAPIDAPI_FOOTBALL_KEY'] ?? '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);
      return { footballApiKeys, footballApiKey: footballApiKeys[0] ?? '' };
    })(),
    // Direct API-Football account (api-sports.io) — free 100 req/day, daily reset.
    apiFootball: {
      apiKey: process.env['API_FOOTBALL_KEY'] ?? '',
    },
    // Live bookmaker line — The Odds API (the-odds-api.com), free tier.
    theOddsApi: {
      apiKey: process.env['THE_ODDS_API_KEY'] ?? '',
    },
    cors: {
      origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    },
  };
};
