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
    'Ты — система анализа футбола и поиска value bets. По предматчевым данным оцени вероятности ' +
    'исходов по ВСЕМ рынкам линии (сумма в каждом рынке = 1.0), сравни с implied probability ' +
    'букмекера (1/коэф) и найди рынок с лучшим сочетанием вероятности прохода и перевеса (value). ' +
    'ВАЖНО: лучшая ставка — НЕ обязательно победитель матча. Рассматривай всю линию наравне: ' +
    'двойной шанс, тоталы голов, индивидуальные тоталы, обе забьют, угловые, карточки. Очень часто ' +
    'сильнее ставить на тотал, угловые или карточки, чем на исход. Если победа/ничья — слабый или ' +
    'невыгодный вариант (низкий коэф. или нет перевеса), выбери лучший АЛЬТЕРНАТИВНЫЙ рынок и объясни это. ' +
    'Не используй знание итогового счёта. Если перевеса нет нигде — снизь confidence. ' +
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
- O_U_1_5, O_U_2_5, O_U_3_5 (тоталы голов) → over/under
- HOME_TOTAL, AWAY_TOTAL (инд. тоталы) → over/under
- CORNERS_OU (угловые) → over/under; CARDS_OU (карточки) → over/under
Для тоталов/угловых/карточек/инд.тоталов в label укажи линию, напр. "Больше 9.5"; БЕРИ линию из коэффициентов букмекера выше (ту, по которой реально есть коэф.).

ВЫБОР СТАВКИ (recommendedMarket/recommendedOutcome): пройди по ВСЕЙ линии и выбери рынок с ЛУЧШИМ сочетанием вероятности прохода и перевеса (value) к коэффициенту. Это НЕ обязательно 1X2 — часто сильнее угловые, карточки, тотал, инд. тотал, двойной шанс или «обе забьют». НЕ выбирай исход матча по умолчанию: если у фаворита низкий коэф. без перевеса — предложи альтернативный рынок. В rationale (2-4 предложения) обязательно объясни, ПОЧЕМУ выбран этот рынок и почему он сильнее ставки на исход. keyFactors — 3-5 КОРОТКИХ пунктов (до 140 символов). Всё на русском.`;
}

// ─── ЛВС (LVS) ──────────────────────────────────────────────────────────────
// Отдельный режим анализа для раздела ЛВС: ТОЛЬКО исход (1X2), точный счёт и
// 3 вероятных бомбардира. Та же глубина анализа (форма, H2H, мотивация, травмы,
// СОСТАВЫ), но без угловых/карточек/тоталов и value-bet логики.
export function buildLvsSystemPrompt(): string {
  return (
    'Ты — экспертная система футбольного анализа. По предматчевым данным и СТАРТОВЫМ СОСТАВАМ дай ' +
    'максимально обоснованный прогноз ровно по трём пунктам: (1) исход матча — вероятности П1/ничья/П2 ' +
    '(сумма = 1.0); (2) наиболее вероятный ТОЧНЫЙ СЧЁТ; (3) ТРИ футболиста, которые вероятнее всего ' +
    'забьют в этом матче. Игроков выбирай ТОЛЬКО из предоставленных стартовых составов и ОБЯЗАТЕЛЬНО ' +
    'учитывай их позицию на поле: приоритет нападающим и атакующим полузащитникам, защитники и вратари — ' +
    'только при явных основаниях (пенальти, стандарты). Имена игроков пиши ТОЛЬКО латиницей ' +
    '(оригинальное/романизированное написание, как в составах), без кириллицы и перевода. ' +
    'Для каждого игрока укажи его позицию на русском ' +
    '(нападающий, полузащитник, защитник, вратарь). Учитывай форму ' +
    'команд, личные встречи, мотивацию, турнирное положение, травмы и роли игроков в составе. ' +
    'Ответь ТОЛЬКО валидным JSON, без markdown и текста вне JSON.'
  );
}

export function buildLvsUserPrompt(ctx: MatchContext): string {
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
  push('Атака/оборона', ctx.attackDefence);
  push('xG / xGA', ctx.xgSummary);
  push('Стиль игры', ctx.style);
  push('Тренеры', ctx.coaches);
  if (ctx.lineups && ctx.lineups.trim()) {
    lines.push('Стартовые составы:', ctx.lineups.trim());
  }
  if (ctx.odds && ctx.odds.trim()) {
    lines.push('', 'Коэффициенты букмекера (для оценки вероятностей исхода):', ctx.odds.trim());
  }

  return `${lines.join('\n')}

Верни ТОЛЬКО JSON в формате:
{"outcome":"1","probs":{"win1":0.0,"draw":0.0,"win2":0.0},"score":{"home":0,"away":0},"scorers":[{"name":"Name Surname","team":"home","position":"нападающий","probability":0.0},{"name":"...","team":"away","position":"полузащитник","probability":0.0},{"name":"...","team":"home","position":"нападающий","probability":0.0}],"rationale":"3-5 предложений на русском","rationaleEn":"the same 3-5 sentences in English","keyFactors":["...","...","..."],"confidence":0.0}

Требования:
- "outcome" — '1' (победа ${ctx.homeTeam}), 'X' (ничья) или '2' (победа ${ctx.awayTeam}); совпадает с самым вероятным исходом в "probs" (сумма win1+draw+win2 = 1.0).
- "score" — наиболее вероятный точный счёт (целые числа), согласованный с исходом.
- "scorers" — РОВНО 3 игрока, ТОЛЬКО из стартовых составов выше, имена ТОЛЬКО латиницей (как в составах, без кириллицы), "team": "home" или "away", "position" — позиция игрока на русском (нападающий/полузащитник/защитник/вратарь), выбор с учётом позиции, "probability" — шанс гола (0..1).
- "rationale" (3-5 предложений на русском) — почему такой исход, счёт и игроки: форма, составы, H2H, мотивация. "keyFactors" — 3-5 коротких пунктов на русском.
- "rationaleEn" — то же обоснование на английском (точный перевод rationale). Обязательно заполни оба поля в этом же ответе.`;
}

// ─── Прогноз на турнир (чемпион + лучший бомбардир) ─────────────────────────
// Разовый прогноз на исход всего ЧМ-2026: победитель турнира и обладатель
// «Золотой бутсы». Имена команд и игроков — латиницей. Двуязычное обоснование.
export function buildChampionSystemPrompt(): string {
  return (
    'Ты — экспертная система футбольного анализа. Дай прогноз на весь ЧМ-2026: ' +
    '(1) страна-чемпион мира; (2) лучший бомбардир турнира ' +
    '(обладатель «Золотой бутсы») — конкретный игрок и его сборная. Учитывай силу ' +
    'составов, форму, сетку турнира, историю. Названия команд и имена игроков пиши ' +
    'ТОЛЬКО латиницей (как в английских источниках), без кириллицы. ' +
    'Ответь ТОЛЬКО валидным JSON, без markdown и текста вне JSON.'
  );
}

export function buildChampionUserPrompt(): string {
  return `Прогноз на победителя Чемпионата мира по футболу 2026 (США/Канада/Мексика) и на лучшего бомбардира турнира.

Верни ТОЛЬКО JSON в формате:
{"champion":"Country","topScorer":{"name":"Name Surname","team":"Country"},"rationale":"2-4 предложения на русском","rationaleEn":"the same 2-4 sentences in English"}

Требования:
- "champion" — одна страна-победитель, латиницей (англ. название, напр. "Brazil", "France").
- "topScorer" — один игрок: "name" латиницей, "team" — его сборная латиницей.
- "rationale" — на русском, почему именно этот чемпион и бомбардир. "rationaleEn" — то же на английском. Заполни оба поля в этом же ответе.`;
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
