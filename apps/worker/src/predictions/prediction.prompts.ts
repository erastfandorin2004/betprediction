export interface MatchContext {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  league: string;
  country: string;
  round: string | null;
  date: string;
  // Pre-match factors — everything available BEFORE kickoff. Never include the result.
  homeForm?: string;       // e.g. "W W D L W" (last 5, most recent first)
  awayForm?: string;
  homeTablePos?: string;   // e.g. "2-е место, 58 очков"
  awayTablePos?: string;
  motivation?: string;     // e.g. "Хозяева бьются за топ-4; гостям матч ничего не решает"
  importance?: string;     // e.g. "Плей-офф ЛЧ, ответный матч"
  h2hSummary?: string;     // e.g. "Последние 5 очных: 3П 1Н 1П хозяев, в среднем 2.8 гола"
  injuries?: string;       // e.g. "Хозяева: Кейн (колено); Гости: без потерь"
  rotation?: string;       // e.g. "Гости могут ротировать состав перед дерби"
  congestion?: string;     // e.g. "У гостей 3-й матч за 8 дней"
  attackDefence?: string;  // e.g. "Хозяева: 2.1 гол/матч, 0.9 пропуск; гости 1.3 / 1.4"
  xgSummary?: string;      // e.g. "Хозяева xG 1.9 / xGA 1.0; гости xG 1.2 / xGA 1.5"
  cornersStats?: string;   // e.g. "Хозяева в среднем 6.5 угловых за, 4.1 против"
  cardsStats?: string;     // e.g. "Среднее 4.3 жёлтых на матч, строгий арбитр"
  style?: string;          // e.g. "Обе команды атакуют через фланги, высокий темп"
  weather?: string;        // e.g. "Дождь, сильный ветер"
  odds?: string;           // pre-match bookmaker odds block (see formatOddsBlock)
}

export function buildSystemPrompt(): string {
  return [
    'Ты — профессиональная система анализа футбольных матчей и поиска value bets.',
    'Твоя задача — оценить вероятности исходов по разным рынкам, сравнить их с коэффициентами',
    'букмекера (implied probability) и найти рынок с математическим преимуществом (value).',
    '',
    'Принципы:',
    '- Опирайся ТОЛЬКО на предматчевые данные из запроса (форма, таблица, мотивация, H2H, травмы,',
    '  календарь, статистика, стиль, погода, коэффициенты). Не используй знание итогового счёта.',
    '- Для каждого рынка оцени честную вероятность каждого исхода (сумма по рынку = 1.0).',
    '- Сравни свою вероятность с implied probability букмекера (1 / коэффициент).',
    '- Value есть, когда твоя вероятность ЗАМЕТНО выше вероятности букмекера при адекватном риске.',
    '- Не рекомендуй ставку ради количества. Если value нигде нет — выбери самый обоснованный',
    '  рынок, но поставь низкий confidence (модель сама отфильтрует слабые сигналы).',
    '- recommendedMarket/recommendedOutcome — единственный лучший по сочетанию вероятности, value и риска.',
    '',
    'Ты ОБЯЗАН ответить ТОЛЬКО валидным JSON — без markdown, без текста до или после.',
  ].join('\n');
}

export function buildUserPrompt(ctx: MatchContext): string {
  const lines: string[] = [
    `Матч: ${ctx.homeTeam} (дома) vs ${ctx.awayTeam} (в гостях)`,
    `Турнир: ${ctx.league} (${ctx.country})${ctx.round ? ', ' + ctx.round : ''}`,
    `Дата: ${ctx.date}`,
  ];

  const push = (label: string, v?: string) => {
    if (v && v.trim()) lines.push(`${label}: ${v}`);
  };
  push('Форма хозяев (5 матчей)', ctx.homeForm);
  push('Форма гостей (5 матчей)', ctx.awayForm);
  push('Хозяева в таблице', ctx.homeTablePos);
  push('Гости в таблице', ctx.awayTablePos);
  push('Важность матча', ctx.importance);
  push('Мотивация', ctx.motivation);
  push('Личные встречи', ctx.h2hSummary);
  push('Травмы/дисквалификации', ctx.injuries);
  push('Ротация', ctx.rotation);
  push('Календарь/плотность', ctx.congestion);
  push('Атака/оборона', ctx.attackDefence);
  push('xG / xGA', ctx.xgSummary);
  push('Угловые', ctx.cornersStats);
  push('Карточки', ctx.cardsStats);
  push('Стиль игры', ctx.style);
  push('Погода', ctx.weather);
  if (ctx.odds && ctx.odds.trim()) {
    lines.push('', 'Коэффициенты букмекера:', ctx.odds.trim());
  }

  return `${lines.join('\n')}

Проанализируй матч и верни ТОЛЬКО JSON строго по схеме:
{
  "markets": [
    {
      "market": "1X2",
      "outcomes": [
        {"label": "П1", "outcome": "1", "probability": 0.XX},
        {"label": "Ничья", "outcome": "X", "probability": 0.XX},
        {"label": "П2", "outcome": "2", "probability": 0.XX}
      ]
    },
    {
      "market": "DC",
      "outcomes": [
        {"label": "1X", "outcome": "1X", "probability": 0.XX},
        {"label": "12", "outcome": "12", "probability": 0.XX},
        {"label": "X2", "outcome": "X2", "probability": 0.XX}
      ]
    },
    {
      "market": "BTTS",
      "outcomes": [
        {"label": "Да", "outcome": "yes", "probability": 0.XX},
        {"label": "Нет", "outcome": "no", "probability": 0.XX}
      ]
    },
    {
      "market": "O_U_2_5",
      "outcomes": [
        {"label": "Больше 2.5", "outcome": "over", "probability": 0.XX},
        {"label": "Меньше 2.5", "outcome": "under", "probability": 0.XX}
      ]
    }
  ],
  "recommendedMarket": "1X2",
  "recommendedOutcome": "1",
  "rationale": "2-4 предложения на русском: почему именно этот рынок, есть ли value vs коэффициент, какой риск.",
  "keyFactors": ["Фактор 1", "Фактор 2", "Фактор 3"],
  "confidence": 0.XX
}

Допустимые market: "1X2", "DC", "BTTS", "O_U_1_5", "O_U_2_5", "O_U_3_5", "HOME_TOTAL", "AWAY_TOTAL".
Правила:
- Вероятности ВНУТРИ каждого рынка суммируются ровно в 1.0.
- confidence (0.0–1.0) — твоя уверенность с учётом и вероятности, и наличия value, и риска.
- rationale и keyFactors — на русском языке.
- recommendedMarket/recommendedOutcome — лучший рынок по сочетанию вероятности и value к коэффициенту.
- Если по коэффициентам нигде нет преимущества — всё равно выбери самый обоснованный исход, но снизь confidence.`;
}

// Renders a bookmaker odds map into a readable block for the prompt.
export function formatOddsBlock(odds: Record<string, number>): string {
  const labels: Record<string, string> = {
    '1': 'П1', X: 'Ничья', '2': 'П2',
    '1X': 'Двойной шанс 1X', '12': 'Двойной шанс 12', X2: 'Двойной шанс X2',
    btts_yes: 'Обе забьют — Да', btts_no: 'Обе забьют — Нет',
    over_1_5: 'Тотал больше 1.5', under_1_5: 'Тотал меньше 1.5',
    over_2_5: 'Тотал больше 2.5', under_2_5: 'Тотал меньше 2.5',
    over_3_5: 'Тотал больше 3.5', under_3_5: 'Тотал меньше 3.5',
  };
  return Object.entries(odds)
    .map(([k, v]) => `  ${labels[k] ?? k}: ${v.toFixed(2)}`)
    .join('\n');
}
