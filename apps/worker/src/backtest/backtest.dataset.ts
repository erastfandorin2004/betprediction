import type { MatchContext } from '../predictions/prediction.prompts';

// ── Контрольная выборка для бэктеста (spec §9) ──────────────────────────────
// Фиксированный набор из 20 завершённых матчей: 7 АПЛ + 7 Лиги чемпионов + 6
// Эредивизи. Это ДЕМОНСТРАЦИОННАЯ выборка для проверки ЛОГИКИ анализа: модель
// получает только предматчевый контекст и коэффициенты (без счёта), формирует
// ставку, после чего она сверяется с `actual`. Коэффициенты и счёт —
// приближённые исторические данные, заданы заранее и неизменны.

// Доп. рынки с линией: угловые, карточки (нужно фактическое число для расчёта),
// индивидуальные тоталы команд (рассчитываются из счёта). Линии/коэффициенты/факт —
// такие же демо-данные, как и счёт.
export interface MatchExtras {
  corners?: { line: number; over: number; under: number; actual: number };
  cards?: { line: number; over: number; under: number; actual: number };
  homeTotal?: { line: number; over: number; under: number };
  awayTotal?: { line: number; over: number; under: number };
}

export interface BacktestMatch {
  id: string;
  league: string;
  country: string;
  date: string;
  round?: string;
  home: string;
  away: string;
  context: Partial<MatchContext>;
  // Коэффициенты букмекера по рынкам, которые можно рассчитать из финального счёта.
  // Ключи: 1 X 2 | 1X 12 X2 | btts_yes btts_no | over/under_1_5 _2_5 _3_5
  odds: Record<string, number>;
  actual: { homeGoals: number; awayGoals: number };
  extras?: MatchExtras;
}

export const BACKTEST_LABEL = 'Контрольная выборка · 20 матчей (АПЛ 7 · ЛЧ 7 · Эредивизи 6)';

export const BACKTEST_MATCHES: BacktestMatch[] = [
  // ───────────────────────── Англия · АПЛ (7) ─────────────────────────
  {
    id: 'epl-1',
    league: 'Английская Премьер-лига',
    country: 'Англия',
    home: 'Manchester City',
    away: 'Brentford',
    date: '2024-02-05',
    context: {
      homeForm: 'W W W D W', awayForm: 'L D L W L',
      homeTablePos: '1-е место, чемпион гонки за титул',
      awayTablePos: '14-е место, зона безопасности',
      motivation: 'Хозяева бьются за титул, дома почти не теряют очки',
      h2hSummary: 'Сити выиграл 4 из 5 последних, в среднем 3.4 гола',
      attackDefence: 'Сити дома 2.8 гол/матч, 0.7 пропуск; Брентфорд в гостях 1.1 / 1.7',
      style: 'Сити доминирует во владении, Брентфорд играет вторым номером',
    },
    odds: { '1': 1.22, X: 7.0, '2': 12.0, '1X': 1.05, '12': 1.11, X2: 4.3, btts_yes: 2.05, btts_no: 1.72, over_2_5: 1.40, under_2_5: 2.85, over_1_5: 1.10, under_1_5: 6.5, over_3_5: 2.20, under_3_5: 1.62 },
    actual: { homeGoals: 1, awayGoals: 0 },
  },
  {
    id: 'epl-2',
    league: 'Английская Премьер-лига',
    country: 'Англия',
    home: 'Arsenal',
    away: 'Tottenham',
    date: '2024-04-28',
    round: 'Северное лондонское дерби',
    context: {
      homeForm: 'W W W W W', awayForm: 'W L W D W',
      homeTablePos: '1-е место, борьба за титул',
      awayTablePos: '5-е место, борьба за топ-4',
      importance: 'Дерби, обе команды максимально мотивированы',
      h2hSummary: 'Очень открытые дерби, в среднем 3.1 гола, BTTS в 4 из 5',
      attackDefence: 'Арсенал дома 2.6 / 0.8; Тоттенхэм в гостях 1.9 / 1.6',
      style: 'Обе команды высоко прессингуют, много пространства',
    },
    odds: { '1': 1.65, X: 4.2, '2': 4.6, '1X': 1.18, '12': 1.22, X2: 2.20, btts_yes: 1.55, btts_no: 2.35, over_2_5: 1.55, under_2_5: 2.45, over_1_5: 1.18, under_1_5: 4.8, over_3_5: 2.45, under_3_5: 1.52 },
    actual: { homeGoals: 3, awayGoals: 2 },
  },
  {
    id: 'epl-3',
    league: 'Английская Премьер-лига',
    country: 'Англия',
    home: 'Liverpool',
    away: 'Manchester United',
    date: '2023-12-17',
    context: {
      homeForm: 'W W D W W', awayForm: 'L W L W L',
      homeTablePos: '1-е место',
      awayTablePos: '7-е место, нестабильны',
      importance: 'Принципиальное противостояние',
      h2hSummary: 'Дома Ливерпуль громил МЮ (7:0 в прошлом сезоне)',
      injuries: 'У МЮ кадровые проблемы в обороне',
      attackDefence: 'Ливерпуль дома 2.7 / 0.9; МЮ в гостях 1.2 / 1.5',
      style: 'Ливерпуль гегенпрессинг; МЮ садится в оборону',
    },
    odds: { '1': 1.55, X: 4.4, '2': 5.5, '1X': 1.15, '12': 1.20, X2: 2.45, btts_yes: 1.70, btts_no: 2.05, over_2_5: 1.62, under_2_5: 2.30, over_1_5: 1.22, under_1_5: 4.3, over_3_5: 2.60, under_3_5: 1.48 },
    actual: { homeGoals: 0, awayGoals: 0 },
  },
  {
    id: 'epl-4',
    league: 'Английская Премьер-лига',
    country: 'Англия',
    home: 'Newcastle',
    away: 'Chelsea',
    date: '2023-11-25',
    context: {
      homeForm: 'W D L W W', awayForm: 'D L W D L',
      homeTablePos: '6-е место, сильная домашняя серия',
      awayTablePos: '10-е место, нестабильный сезон',
      motivation: 'Ньюкасл дома играет агрессивно и быстро',
      h2hSummary: 'Дома Ньюкасл обыграл Челси в прошлом сезоне крупно',
      attackDefence: 'Ньюкасл дома 2.4 / 1.0; Челси в гостях 1.4 / 1.5',
      style: 'Высокий темп, много ударов с обеих сторон',
    },
    odds: { '1': 2.00, X: 3.7, '2': 3.6, '1X': 1.30, '12': 1.28, X2: 1.82, btts_yes: 1.62, btts_no: 2.20, over_2_5: 1.66, under_2_5: 2.20, over_1_5: 1.25, under_1_5: 4.0, over_3_5: 2.55, under_3_5: 1.50 },
    actual: { homeGoals: 4, awayGoals: 1 },
  },
  {
    id: 'epl-5',
    league: 'Английская Премьер-лига',
    country: 'Англия',
    home: 'Aston Villa',
    away: 'Brighton',
    date: '2024-01-30',
    context: {
      homeForm: 'W W D W L', awayForm: 'D D L D W',
      homeTablePos: '4-е место, борьба за ЛЧ',
      awayTablePos: '8-е место',
      motivation: 'Вилла дома очень сильна (Эмери), бьётся за топ-4',
      h2hSummary: 'Результативные матчи, BTTS в 3 из 4',
      attackDefence: 'Вилла дома 2.5 / 1.1; Брайтон в гостях 1.6 / 1.5',
      style: 'Обе команды владеют мячом и идут вперёд',
    },
    odds: { '1': 1.80, X: 3.9, '2': 4.2, '1X': 1.24, '12': 1.26, X2: 2.05, btts_yes: 1.50, btts_no: 2.45, over_2_5: 1.50, under_2_5: 2.55, over_1_5: 1.16, under_1_5: 5.0, over_3_5: 2.30, under_3_5: 1.58 },
    actual: { homeGoals: 2, awayGoals: 1 },
  },
  {
    id: 'epl-6',
    league: 'Английская Премьер-лига',
    country: 'Англия',
    home: 'West Ham',
    away: 'Everton',
    date: '2024-03-30',
    context: {
      homeForm: 'L D W L D', awayForm: 'L D L D L',
      homeTablePos: '9-е место, середина',
      awayTablePos: '16-е место, борьба за выживание (вычет очков)',
      motivation: 'Эвертону очки важнее для спасения; Вест Хэм без явной цели',
      h2hSummary: 'Малорезультативные вязкие матчи, часто ТМ 2.5',
      attackDefence: 'Вест Хэм дома 1.5 / 1.5; Эвертон в гостях 0.9 / 1.3',
      style: 'Эвертон закрывается, мало моментов',
    },
    odds: { '1': 1.95, X: 3.5, '2': 4.0, '1X': 1.26, '12': 1.32, X2: 1.90, btts_yes: 1.95, btts_no: 1.80, over_2_5: 2.05, under_2_5: 1.78, over_1_5: 1.40, under_1_5: 2.9, over_3_5: 3.40, under_3_5: 1.32 },
    actual: { homeGoals: 1, awayGoals: 0 },
  },
  {
    id: 'epl-7',
    league: 'Английская Премьер-лига',
    country: 'Англия',
    home: 'Wolverhampton',
    away: 'Crystal Palace',
    date: '2024-02-03',
    context: {
      homeForm: 'W L W D L', awayForm: 'L D L L D',
      homeTablePos: '11-е место',
      awayTablePos: '15-е место, в кризисе перед сменой тренера',
      motivation: 'Обе команды без турнирных задач, средний настрой',
      h2hSummary: 'Близкие низовые матчи, часто ничьи',
      attackDefence: 'Вулвз дома 1.6 / 1.4; Пэлас в гостях 1.0 / 1.6',
      style: 'Палас осторожен в гостях, мало забивает',
    },
    odds: { '1': 1.90, X: 3.5, '2': 4.2, '1X': 1.24, '12': 1.30, X2: 1.92, btts_yes: 1.85, btts_no: 1.90, over_2_5: 2.00, under_2_5: 1.80, over_1_5: 1.38, under_1_5: 3.0, over_3_5: 3.30, under_3_5: 1.33 },
    actual: { homeGoals: 3, awayGoals: 2 },
  },

  // ───────────────────────── Лига чемпионов (7) ─────────────────────────
  {
    id: 'ucl-1',
    league: 'Лига чемпионов УЕФА',
    country: 'Европа',
    home: 'Real Madrid',
    away: 'Manchester City',
    date: '2024-04-09',
    round: '1/4 финала, первый матч',
    context: {
      homeForm: 'W W W D W', awayForm: 'W W W W D',
      importance: 'Плей-офф ЛЧ, два топ-фаворита турнира',
      h2hSummary: 'Прошлые дуэли крайне результативны, BTTS в 4 из 5',
      attackDefence: 'Оба клуба забивают много, обороны рискуют',
      style: 'Открытый футбол на встречных курсах',
      congestion: 'Плотный календарь у обеих команд',
    },
    odds: { '1': 2.55, X: 3.7, '2': 2.55, '1X': 1.50, '12': 1.27, X2: 1.50, btts_yes: 1.50, btts_no: 2.45, over_2_5: 1.55, under_2_5: 2.40, over_1_5: 1.20, under_1_5: 4.6, over_3_5: 2.35, under_3_5: 1.55 },
    actual: { homeGoals: 3, awayGoals: 3 },
  },
  {
    id: 'ucl-2',
    league: 'Лига чемпионов УЕФА',
    country: 'Европа',
    home: 'Bayern Munich',
    away: 'Paris Saint-Germain',
    date: '2023-12-12',
    round: 'Групповой этап',
    context: {
      homeForm: 'W W D W W', awayForm: 'W D W L W',
      importance: 'Решающий тур группы',
      h2hSummary: 'Очень результативные очные встречи',
      attackDefence: 'Бавария дома 3.0 / 1.0; ПСЖ в гостях 1.8 / 1.4',
      style: 'Обе атакующие, много моментов',
    },
    odds: { '1': 1.70, X: 4.2, '2': 4.3, '1X': 1.20, '12': 1.22, X2: 2.15, btts_yes: 1.50, btts_no: 2.45, over_2_5: 1.45, under_2_5: 2.70, over_1_5: 1.14, under_1_5: 5.6, over_3_5: 2.05, under_3_5: 1.72 },
    actual: { homeGoals: 1, awayGoals: 0 },
  },
  {
    id: 'ucl-3',
    league: 'Лига чемпионов УЕФА',
    country: 'Европа',
    home: 'Barcelona',
    away: 'Napoli',
    date: '2024-03-12',
    round: '1/8 финала, ответный матч',
    context: {
      homeForm: 'W W D W L', awayForm: 'D L W D D',
      importance: 'Решающий матч плей-офф (после ничьей 1:1)',
      h2hSummary: 'Первый матч 1:1, обе забили',
      attackDefence: 'Барса дома 2.6 / 1.0; Наполи в гостях 1.3 / 1.4',
      style: 'Барса владеет мячом, Наполи на контратаках',
    },
    odds: { '1': 1.55, X: 4.3, '2': 5.5, '1X': 1.14, '12': 1.21, X2: 2.45, btts_yes: 1.65, btts_no: 2.10, over_2_5: 1.55, under_2_5: 2.40, over_1_5: 1.20, under_1_5: 4.6, over_3_5: 2.35, under_3_5: 1.55 },
    actual: { homeGoals: 4, awayGoals: 2 },
  },
  {
    id: 'ucl-4',
    league: 'Лига чемпионов УЕФА',
    country: 'Европа',
    home: 'Inter',
    away: 'Atletico Madrid',
    date: '2024-02-20',
    round: '1/8 финала, первый матч',
    context: {
      homeForm: 'W W W D W', awayForm: 'W L W D W',
      importance: 'Плей-офф ЛЧ, две очень прагматичные команды',
      h2hSummary: 'Обе обороны топ-уровня, ожидается мало голов',
      attackDefence: 'Интер дома 2.0 / 0.6; Атлетико в гостях 1.1 / 1.0',
      style: 'Низкий темп, борьба, мало моментов — частые ТМ 2.5',
    },
    odds: { '1': 1.95, X: 3.3, '2': 4.4, '1X': 1.24, '12': 1.35, X2: 1.88, btts_yes: 2.05, btts_no: 1.72, over_2_5: 2.20, under_2_5: 1.66, over_1_5: 1.50, under_1_5: 2.6, over_3_5: 3.80, under_3_5: 1.26 },
    actual: { homeGoals: 1, awayGoals: 0 },
  },
  {
    id: 'ucl-5',
    league: 'Лига чемпионов УЕФА',
    country: 'Европа',
    home: 'Arsenal',
    away: 'Porto',
    date: '2024-03-12',
    round: '1/8 финала, ответный матч',
    context: {
      homeForm: 'W W W W W', awayForm: 'W D L W D',
      importance: 'Решающий матч (после 0:1 на выезде)',
      motivation: 'Арсеналу нужно отыгрываться, мощное давление дома',
      h2hSummary: 'Первый матч 0:1 в пользу Порту',
      attackDefence: 'Арсенал дома 2.7 / 0.6; Порту в гостях 0.9 / 1.2',
      style: 'Арсенал доминирует, Порту садится глубоко',
    },
    odds: { '1': 1.40, X: 4.8, '2': 7.5, '1X': 1.08, '12': 1.18, X2: 3.0, btts_yes: 2.00, btts_no: 1.75, over_2_5: 1.62, under_2_5: 2.30, over_1_5: 1.22, under_1_5: 4.3, over_3_5: 2.55, under_3_5: 1.50 },
    actual: { homeGoals: 1, awayGoals: 0 },
  },
  {
    id: 'ucl-6',
    league: 'Лига чемпионов УЕФА',
    country: 'Европа',
    home: 'Borussia Dortmund',
    away: 'PSV Eindhoven',
    date: '2024-03-13',
    round: '1/8 финала, ответный матч',
    context: {
      homeForm: 'W D W L W', awayForm: 'W W W D W',
      importance: 'Решающий матч (после 1:1)',
      h2hSummary: 'Первый матч 1:1, обе забили',
      attackDefence: 'Дортмунд дома 2.3 / 1.3; ПСВ в гостях 1.7 / 1.3',
      style: 'Обе команды атакующие, открытый футбол',
    },
    odds: { '1': 1.72, X: 4.0, '2': 4.2, '1X': 1.20, '12': 1.22, X2: 2.10, btts_yes: 1.55, btts_no: 2.35, over_2_5: 1.50, under_2_5: 2.55, over_1_5: 1.16, under_1_5: 5.0, over_3_5: 2.25, under_3_5: 1.60 },
    actual: { homeGoals: 2, awayGoals: 0 },
  },
  {
    id: 'ucl-7',
    league: 'Лига чемпионов УЕФА',
    country: 'Европа',
    home: 'Lazio',
    away: 'Bayern Munich',
    date: '2024-02-14',
    round: '1/8 финала, первый матч',
    context: {
      homeForm: 'W L D W L', awayForm: 'W W D L W',
      importance: 'Плей-офф ЛЧ, Бавария фаворит',
      h2hSummary: 'Бавария обычно доминирует, но Лацио дома цепкий',
      injuries: 'У Баварии кадровые потери в центре обороны',
      attackDefence: 'Лацио дома 1.5 / 1.0; Бавария в гостях 2.4 / 1.2',
      style: 'Лацио в обороне и контратаках против владения Баварии',
    },
    odds: { '1': 3.7, X: 3.6, '2': 1.95, '1X': 1.80, '12': 1.28, X2: 1.28, btts_yes: 1.62, btts_no: 2.20, over_2_5: 1.66, under_2_5: 2.20, over_1_5: 1.25, under_1_5: 4.0, over_3_5: 2.55, under_3_5: 1.50 },
    actual: { homeGoals: 1, awayGoals: 0 },
  },

  // ───────────────────────── Голландия · Эредивизи (6) ─────────────────────────
  {
    id: 'ere-1',
    league: 'Эредивизи',
    country: 'Голландия',
    home: 'Ajax',
    away: 'Feyenoord',
    date: '2024-03-31',
    round: 'De Klassieker',
    context: {
      homeForm: 'L D W L D', awayForm: 'W W W D W',
      homeTablePos: '5-е место, провальный сезон',
      awayTablePos: '2-е место, борьба за титул',
      importance: 'Главное дерби страны, высокий накал',
      h2hSummary: 'Очень результативные дерби, BTTS в 4 из 5',
      attackDefence: 'Аякс дома 2.0 / 1.4; Фейеноорд в гостях 2.1 / 1.0',
      style: 'Обе команды атакуют, дерби обычно открытые',
    },
    odds: { '1': 2.45, X: 3.8, '2': 2.55, '1X': 1.48, '12': 1.25, X2: 1.52, btts_yes: 1.50, btts_no: 2.45, over_2_5: 1.50, under_2_5: 2.55, over_1_5: 1.16, under_1_5: 5.0, over_3_5: 2.20, under_3_5: 1.62 },
    actual: { homeGoals: 1, awayGoals: 6 },
  },
  {
    id: 'ere-2',
    league: 'Эредивизи',
    country: 'Голландия',
    home: 'PSV Eindhoven',
    away: 'AZ Alkmaar',
    date: '2024-02-25',
    context: {
      homeForm: 'W W W W W', awayForm: 'W L W W D',
      homeTablePos: '1-е место, идут без поражений',
      awayTablePos: '4-е место',
      motivation: 'ПСВ дома сметает всех, гонятся за чемпионством',
      h2hSummary: 'Дома ПСВ выигрывал крупно, много голов',
      attackDefence: 'ПСВ дома 3.4 / 0.6; АЗ в гостях 1.5 / 1.3',
      style: 'ПСВ высоко прессингует и быстро атакует',
    },
    odds: { '1': 1.40, X: 5.0, '2': 6.5, '1X': 1.10, '12': 1.16, X2: 3.0, btts_yes: 1.62, btts_no: 2.20, over_2_5: 1.36, under_2_5: 3.0, over_1_5: 1.10, under_1_5: 6.5, over_3_5: 1.85, under_3_5: 1.90 },
    actual: { homeGoals: 3, awayGoals: 0 },
  },
  {
    id: 'ere-3',
    league: 'Эредивизи',
    country: 'Голландия',
    home: 'Feyenoord',
    away: 'Twente',
    date: '2024-04-07',
    context: {
      homeForm: 'W W D W W', awayForm: 'W D W L D',
      homeTablePos: '2-е место',
      awayTablePos: '3-е место, борьба за ЛЧ-квалификацию',
      motivation: 'Обе команды бьются за еврокубки',
      h2hSummary: 'Дома Фейеноорд силён, но Твенте цепкий',
      attackDefence: 'Фейеноорд дома 2.6 / 0.8; Твенте в гостях 1.4 / 1.1',
      style: 'Фейеноорд владеет, Твенте играет компактно',
    },
    odds: { '1': 1.50, X: 4.4, '2': 5.8, '1X': 1.13, '12': 1.20, X2: 2.55, btts_yes: 1.75, btts_no: 2.00, over_2_5: 1.55, under_2_5: 2.40, over_1_5: 1.20, under_1_5: 4.6, over_3_5: 2.35, under_3_5: 1.55 },
    actual: { homeGoals: 2, awayGoals: 2 },
  },
  {
    id: 'ere-4',
    league: 'Эредивизи',
    country: 'Голландия',
    home: 'AZ Alkmaar',
    away: 'Ajax',
    date: '2024-04-14',
    context: {
      homeForm: 'W W D W W', awayForm: 'L D W L W',
      homeTablePos: '4-е место, отличная домашняя форма',
      awayTablePos: '5-е место, нестабильны на выезде',
      motivation: 'АЗ дома играет агрессивно, борьба за еврокубки',
      h2hSummary: 'Дома АЗ обыгрывал Аякс в этом сезоне',
      attackDefence: 'АЗ дома 2.5 / 1.0; Аякс в гостях 1.4 / 1.6',
      style: 'АЗ прессингует, Аякс уязвим в обороне',
    },
    odds: { '1': 2.00, X: 3.7, '2': 3.5, '1X': 1.30, '12': 1.27, X2: 1.80, btts_yes: 1.55, btts_no: 2.35, over_2_5: 1.55, under_2_5: 2.40, over_1_5: 1.18, under_1_5: 4.8, over_3_5: 2.30, under_3_5: 1.58 },
    actual: { homeGoals: 2, awayGoals: 1 },
  },
  {
    id: 'ere-5',
    league: 'Эредивизи',
    country: 'Голландия',
    home: 'Twente',
    away: 'PSV Eindhoven',
    date: '2024-05-05',
    context: {
      homeForm: 'W W D W W', awayForm: 'W W W D W',
      homeTablePos: '3-е место, крепкая оборона',
      awayTablePos: '1-е место, уже чемпионы',
      motivation: 'ПСВ уже чемпион — возможна ротация и расслабленность',
      rotation: 'ПСВ может ротировать состав после оформления титула',
      h2hSummary: 'Твенте дома даёт бой, иногда отбирает очки',
      attackDefence: 'Твенте дома 1.9 / 0.7; ПСВ в гостях 2.6 / 0.9',
      style: 'Твенте компактно, ПСВ владеет',
    },
    odds: { '1': 3.1, X: 3.7, '2': 2.15, '1X': 1.68, '12': 1.27, X2: 1.36, btts_yes: 1.62, btts_no: 2.20, over_2_5: 1.55, under_2_5: 2.40, over_1_5: 1.20, under_1_5: 4.6, over_3_5: 2.35, under_3_5: 1.55 },
    actual: { homeGoals: 2, awayGoals: 1 },
  },
  {
    id: 'ere-6',
    league: 'Эредивизи',
    country: 'Голландия',
    home: 'Sparta Rotterdam',
    away: 'Utrecht',
    date: '2024-04-21',
    context: {
      homeForm: 'D L W D L', awayForm: 'W D D L W',
      homeTablePos: '7-е место',
      awayTablePos: '8-е место, борьба за плей-офф еврокубков',
      motivation: 'Утрехту очки важнее для плей-офф зоны',
      h2hSummary: 'Равные средние матчи, часто обе забивают',
      attackDefence: 'Спарта дома 1.5 / 1.3; Утрехт в гостях 1.5 / 1.4',
      style: 'Открытый средний по уровню футбол',
    },
    odds: { '1': 2.35, X: 3.4, '2': 2.95, '1X': 1.40, '12': 1.30, X2: 1.58, btts_yes: 1.65, btts_no: 2.10, over_2_5: 1.80, under_2_5: 1.95, over_1_5: 1.30, under_1_5: 3.4, over_3_5: 2.90, under_3_5: 1.40 },
    actual: { homeGoals: 1, awayGoals: 1 },
  },
];

// Доп. рынки по id матча: тоталы угловых/карточек (с фактом для расчёта) и
// индивидуальные тоталы команд (рассчитываются из счёта). Демо-данные.
const BACKTEST_EXTRAS: Record<string, MatchExtras> = {
  'epl-1': { corners: { line: 10.5, over: 1.85, under: 1.95, actual: 11 }, cards: { line: 3.5, over: 1.95, under: 1.85, actual: 3 }, homeTotal: { line: 1.5, over: 1.72, under: 2.05 }, awayTotal: { line: 0.5, over: 1.95, under: 1.80 } },
  'epl-2': { corners: { line: 10.5, over: 1.80, under: 2.00, actual: 12 }, cards: { line: 4.5, over: 1.80, under: 2.00, actual: 6 }, homeTotal: { line: 1.5, over: 1.90, under: 1.90 }, awayTotal: { line: 1.5, over: 2.30, under: 1.60 } },
  'epl-3': { corners: { line: 11.5, over: 1.90, under: 1.90, actual: 9 }, cards: { line: 3.5, over: 1.85, under: 1.95, actual: 4 }, homeTotal: { line: 1.5, over: 1.85, under: 1.95 }, awayTotal: { line: 0.5, over: 1.70, under: 2.10 } },
  'epl-4': { corners: { line: 10.5, over: 1.85, under: 1.95, actual: 12 }, cards: { line: 4.5, over: 1.90, under: 1.90, actual: 5 }, homeTotal: { line: 1.5, over: 1.65, under: 2.20 }, awayTotal: { line: 1.5, over: 2.40, under: 1.55 } },
  'epl-5': { corners: { line: 10.5, over: 1.90, under: 1.90, actual: 10 }, cards: { line: 3.5, over: 1.95, under: 1.85, actual: 4 }, homeTotal: { line: 1.5, over: 1.80, under: 2.00 }, awayTotal: { line: 1.5, over: 2.45, under: 1.52 } },
  'epl-6': { corners: { line: 9.5, over: 1.90, under: 1.90, actual: 8 }, cards: { line: 3.5, over: 1.80, under: 2.00, actual: 5 }, homeTotal: { line: 1.5, over: 2.05, under: 1.75 }, awayTotal: { line: 0.5, over: 2.05, under: 1.72 } },
  'epl-7': { corners: { line: 9.5, over: 1.85, under: 1.95, actual: 11 }, cards: { line: 4.5, over: 1.95, under: 1.85, actual: 4 }, homeTotal: { line: 1.5, over: 1.95, under: 1.85 }, awayTotal: { line: 1.5, over: 2.45, under: 1.52 } },

  'ucl-1': { corners: { line: 9.5, over: 1.85, under: 1.95, actual: 10 }, cards: { line: 3.5, over: 1.90, under: 1.90, actual: 4 }, homeTotal: { line: 1.5, over: 1.80, under: 2.00 }, awayTotal: { line: 1.5, over: 1.95, under: 1.85 } },
  'ucl-2': { corners: { line: 10.5, over: 1.80, under: 2.00, actual: 13 }, cards: { line: 3.5, over: 1.95, under: 1.85, actual: 3 }, homeTotal: { line: 1.5, over: 1.72, under: 2.05 }, awayTotal: { line: 1.5, over: 2.30, under: 1.58 } },
  'ucl-3': { corners: { line: 9.5, over: 1.85, under: 1.95, actual: 11 }, cards: { line: 4.5, over: 1.85, under: 1.95, actual: 5 }, homeTotal: { line: 1.5, over: 1.70, under: 2.10 }, awayTotal: { line: 1.5, over: 2.35, under: 1.55 } },
  'ucl-4': { corners: { line: 8.5, over: 1.90, under: 1.90, actual: 8 }, cards: { line: 4.5, over: 1.75, under: 2.05, actual: 6 }, homeTotal: { line: 1.5, over: 2.00, under: 1.78 }, awayTotal: { line: 0.5, over: 1.85, under: 1.90 } },
  'ucl-5': { corners: { line: 9.5, over: 1.80, under: 2.00, actual: 12 }, cards: { line: 3.5, over: 1.90, under: 1.90, actual: 4 }, homeTotal: { line: 1.5, over: 1.85, under: 1.95 }, awayTotal: { line: 0.5, over: 2.10, under: 1.70 } },
  'ucl-6': { corners: { line: 10.5, over: 1.90, under: 1.90, actual: 11 }, cards: { line: 3.5, over: 1.85, under: 1.95, actual: 4 }, homeTotal: { line: 1.5, over: 1.90, under: 1.90 }, awayTotal: { line: 1.5, over: 2.15, under: 1.65 } },
  'ucl-7': { corners: { line: 9.5, over: 1.90, under: 1.90, actual: 9 }, cards: { line: 4.5, over: 1.80, under: 2.00, actual: 6 }, homeTotal: { line: 0.5, over: 1.80, under: 2.00 }, awayTotal: { line: 1.5, over: 2.10, under: 1.70 } },

  'ere-1': { corners: { line: 10.5, over: 1.85, under: 1.95, actual: 12 }, cards: { line: 3.5, over: 1.90, under: 1.90, actual: 5 }, homeTotal: { line: 1.5, over: 1.95, under: 1.85 }, awayTotal: { line: 1.5, over: 1.90, under: 1.90 } },
  'ere-2': { corners: { line: 10.5, over: 1.80, under: 2.00, actual: 13 }, cards: { line: 3.5, over: 1.95, under: 1.85, actual: 3 }, homeTotal: { line: 2.5, over: 1.95, under: 1.85 }, awayTotal: { line: 0.5, over: 2.10, under: 1.70 } },
  'ere-3': { corners: { line: 10.5, over: 1.90, under: 1.90, actual: 11 }, cards: { line: 3.5, over: 1.85, under: 1.95, actual: 4 }, homeTotal: { line: 1.5, over: 1.75, under: 2.05 }, awayTotal: { line: 1.5, over: 2.30, under: 1.58 } },
  'ere-4': { corners: { line: 10.5, over: 1.90, under: 1.90, actual: 10 }, cards: { line: 3.5, over: 1.90, under: 1.90, actual: 4 }, homeTotal: { line: 1.5, over: 1.90, under: 1.90 }, awayTotal: { line: 1.5, over: 2.10, under: 1.70 } },
  'ere-5': { corners: { line: 9.5, over: 1.85, under: 1.95, actual: 10 }, cards: { line: 3.5, over: 1.90, under: 1.90, actual: 4 }, homeTotal: { line: 1.5, over: 2.05, under: 1.75 }, awayTotal: { line: 1.5, over: 2.00, under: 1.80 } },
  'ere-6': { corners: { line: 9.5, over: 1.90, under: 1.90, actual: 9 }, cards: { line: 4.5, over: 1.85, under: 1.95, actual: 5 }, homeTotal: { line: 1.5, over: 2.10, under: 1.70 }, awayTotal: { line: 1.5, over: 2.05, under: 1.75 } },
};

for (const m of BACKTEST_MATCHES) {
  m.extras = BACKTEST_EXTRAS[m.id];
}
