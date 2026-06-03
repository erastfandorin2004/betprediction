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
  // laozhang (老张) — OpenAI-compatible aggregator, single LLM provider for the
  // multi-model prediction ensemble. https://docs.laozhang.ai
  laozhang: {
    apiKey: process.env['LAOZHANG_API_KEY'] ?? '',
    baseUrl: process.env['LAOZHANG_BASE_URL'] ?? 'https://api.laozhang.ai/v1',
    models: process.env['LAOZHANG_MODELS'] ?? [
      'gpt-4o',
      'claude-sonnet-4-6',
      'gemini-2.5-flash-nothinking',
      'deepseek-v3',
    ].join(','),
  },
});
