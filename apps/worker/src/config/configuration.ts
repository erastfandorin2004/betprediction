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
  openrouter: {
    apiKey: process.env['OPENROUTER_API_KEY'] ?? '',
    models: process.env['OPENROUTER_MODELS'] ?? [
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-haiku',
      'google/gemini-flash-1.5',
      'deepseek/deepseek-chat',
    ].join(','),
  },
});
