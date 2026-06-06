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
  coaches?: string;        // тренеры команд, если известны
  lineups?: string;        // стартовые составы / расстановка, если известны
  odds?: string;           // pre-match bookmaker odds block (see formatOddsBlock)
}

export function buildSystemPrompt(): string {
  return (
    'Ты — система анализа футбола и поиска value bets. По предматчевым данным из запроса оцени ' +
    'вероятности исходов по рынкам (сумма в каждом рынке = 1.0), сравни с implied probability ' +
    'букмекера (1/коэф) и найди рынок с перевесом (value). Не используй знание итогового счёта. ' +
    'Если перевеса нет нигде — выбери самый обоснованный исход, но снизь confidence. ' +
    'Ответь ТОЛЬКО валидным JSON, без markdown и текста вне JSON.'
  );
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
  push('Тренеры', ctx.coaches);
  if (ctx.lineups && ctx.lineups.trim()) {
    lines.push('Составы:', ctx.lineups.trim());
  }
  if (ctx.odds && ctx.odds.trim()) {
    lines.push('', 'Коэффициенты букмекера:', ctx.odds.trim());
  }

  return `${lines.join('\n')}

Верни ТОЛЬКО JSON. Пример формата одного рынка:
{"market":"1X2","outcomes":[{"label":"П1","outcome":"1","probability":0.0},{"label":"Ничья","outcome":"X","probability":0.0},{"label":"П2","outcome":"2","probability":0.0}]}

Структура ответа: {"markets":[...],"recommendedMarket":"1X2","recommendedOutcome":"1","rationale":"2-4 предложения на русском","keyFactors":["...","...","..."],"confidence":0.0}

Добавь в "markets" по одному объекту на КАЖДЫЙ рынок (outcomes как у примера, сумма probability в рынке = 1.0):
- 1X2 → 1/X/2; DC → 1X/12/X2; BTTS → yes/no
- O_U_2_5 → over/under; HOME_TOTAL → over/under; AWAY_TOTAL → over/under
- CORNERS_OU (угловые) → over/under; CARDS_OU (карточки) → over/under
Для тоталов/угловых/карточек/инд.тоталов в label укажи линию, напр. "Больше 9.5" (бери линию из коэффициентов, если даны).
rationale — 2-4 предложения; keyFactors — 3-5 КОРОТКИХ пунктов (до 140 символов каждый). Всё на русском. recommendedMarket/recommendedOutcome — лучший рынок по сочетанию вероятности и перевеса (value) к коэффициенту.`;
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
