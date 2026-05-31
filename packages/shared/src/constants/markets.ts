export const MARKET_TYPES = [
  '1X2',
  'BTTS',
  'O_U_1_5',
  'O_U_2_5',
  'O_U_3_5',
  'DC',
  'CS_TOP3',
  'HANDICAP',
  'HOME_TOTAL',
  'AWAY_TOTAL',
] as const;

export const MARKET_LABELS: Record<(typeof MARKET_TYPES)[number], string> = {
  '1X2': '1X2',
  BTTS: 'Обе забьют',
  O_U_1_5: 'Тотал 1.5',
  O_U_2_5: 'Тотал 2.5',
  O_U_3_5: 'Тотал 3.5',
  DC: 'Двойной шанс',
  CS_TOP3: 'Точный счёт',
  HANDICAP: 'Гандикап',
  HOME_TOTAL: 'Тотал хозяев',
  AWAY_TOTAL: 'Тотал гостей',
};

export const FREE_PREDICTIONS_PER_DAY = 3;

export const CONFIDENCE_STAR_THRESHOLDS: [number, 1 | 2 | 3 | 4 | 5][] = [
  [0.85, 5],
  [0.7, 4],
  [0.55, 3],
  [0.4, 2],
  [0, 1],
];

export const VALUE_EDGE_THRESHOLD = 0.05;
