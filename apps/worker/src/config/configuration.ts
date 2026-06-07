export default () => ({
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  // AI-анализ матчей запускается ТОЛЬКО вручную (кнопка «Сделать анализ» в карточке
  // матча → API /analyze). Авто-генерация прогнозов по всем матчам выключена по
  // умолчанию; включается явно через AUTO_PREDICTIONS=true.
  autoPredictions: process.env['AUTO_PREDICTIONS'] === 'true',
  database: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://aiscore:aiscore@localhost:5432/aiscore',
  },
  redis: {
    url: process.env['REDIS_URL'] ?? 'redis://localhost:6379',
  },
  // API-Football (api-sports.io DIRECT) — основной источник расписания/линии.
  apiFootball: {
    apiKey: process.env['API_FOOTBALL_KEY'] ?? '',
  },
  // laozhang (老张) — OpenAI-compatible aggregator, single LLM provider for the
  // multi-model prediction ensemble. https://docs.laozhang.ai
  laozhang: {
    apiKey: process.env['LAOZHANG_API_KEY'] ?? '',
    baseUrl: process.env['LAOZHANG_BASE_URL'] ?? 'https://api.laozhang.ai/v1',
    // grok-4 — laozhang-алиас Grok 4.3 (литералы grok-4.3/grok-4-3 не резолвятся).
    models: process.env['LAOZHANG_MODELS'] ?? [
      'gpt-5.1', 'grok-4', 'claude-opus-4-8', 'deepseek-chat',
    ].join(','),
  },
});
