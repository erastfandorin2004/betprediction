"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VALUE_EDGE_THRESHOLD = exports.CONFIDENCE_STAR_THRESHOLDS = exports.FREE_PREDICTIONS_PER_DAY = exports.MARKET_LABELS = exports.MARKET_TYPES = void 0;
exports.MARKET_TYPES = [
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
];
exports.MARKET_LABELS = {
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
exports.FREE_PREDICTIONS_PER_DAY = 3;
exports.CONFIDENCE_STAR_THRESHOLDS = [
    [0.85, 5],
    [0.7, 4],
    [0.55, 3],
    [0.4, 2],
    [0, 1],
];
exports.VALUE_EDGE_THRESHOLD = 0.05;
//# sourceMappingURL=markets.js.map