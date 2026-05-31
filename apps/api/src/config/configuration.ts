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
      url: process.env['DATABASE_URL'] ?? '',
    },
    redis: {
      url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
    },
    openrouter: {
      apiKey: process.env['OPENROUTER_API_KEY'] ?? '',
    },
    cors: {
      origins: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3000').split(','),
    },
  };
};
