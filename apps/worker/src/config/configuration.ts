export default () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  database: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://aiscore:aiscore@localhost:5432/aiscore',
  },
  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  },
  footballData: {
    apiKey: process.env['FOOTBALL_DATA_API_KEY'] ?? '',
  },
});
