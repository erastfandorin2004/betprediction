import type { PredictionMarket, MarketOutcome } from '../types/prediction';
import type { MarketCheck, PredictionSettlement, SettlementStatus } from '../types/prediction';

export interface ActualResult {
  homeGoals: number;
  awayGoals: number;
  corners: number | null; // total corners in the match
  cards: number | null;   // total cards (yellow + red)
}

const MARKET_NAMES: Record<string, string> = {
  '1X2': 'Исход (1X2)',
  DC: 'Двойной шанс',
  BTTS: 'Обе забьют',
  O_U_1_5: 'Тотал голов 1.5',
  O_U_2_5: 'Тотал голов 2.5',
  O_U_3_5: 'Тотал голов 3.5',
  HOME_TOTAL: 'Инд. тотал хозяев',
  AWAY_TOTAL: 'Инд. тотал гостей',
  CORNERS_OU: 'Тотал угловых',
  CARDS_OU: 'Тотал карточек',
};

// Главный прогноз модели по рынку — исход с наибольшей вероятностью.
function topOutcome(m: PredictionMarket): MarketOutcome | null {
  if (!m.outcomes.length) return null;
  return m.outcomes.reduce((best, o) => (o.probability > best.probability ? o : best), m.outcomes[0]!);
}

function parseLine(label: string): number | null {
  const match = label.match(/(\d+(?:[.,]\d+)?)/);
  return match ? parseFloat(match[1]!.replace(',', '.')) : null;
}

function lineForMarket(market: string, label: string): number | null {
  if (market === 'O_U_1_5') return 1.5;
  if (market === 'O_U_2_5') return 2.5;
  if (market === 'O_U_3_5') return 3.5;
  return parseLine(label); // HOME/AWAY_TOTAL, CORNERS_OU, CARDS_OU — line is in the label
}

// over/under helper → won/lost/push (push when total === line exactly).
function overUnder(total: number, line: number, isOver: boolean): SettlementStatus {
  if (total === line) return 'push';
  const over = total > line;
  return (isOver ? over : !over) ? 'won' : 'lost';
}

function checkMarket(market: PredictionMarket, actual: ActualResult): MarketCheck | null {
  const pick = topOutcome(market);
  if (!pick) return null;
  const { homeGoals: h, awayGoals: a } = actual;
  const totalGoals = h + a;
  const marketLabel = MARKET_NAMES[market.market] ?? market.market;
  const base = {
    market: market.market,
    marketLabel,
    predictedLabel: pick.label,
    predictedProbability: pick.probability,
  };

  const make = (status: SettlementStatus, actualStr: string, explanation: string): MarketCheck => ({
    ...base, actual: actualStr, status, explanation,
  });

  switch (market.market) {
    case '1X2': {
      const winner = h > a ? '1' : h < a ? '2' : 'X';
      const status: SettlementStatus = pick.outcome === winner ? 'won' : 'lost';
      const res = h > a ? 'победа хозяев' : h < a ? 'победа гостей' : 'ничья';
      return make(status, `${h}:${a} (${res})`, `Исход матча — ${res}.`);
    }
    case 'DC': {
      const ok =
        (pick.outcome === '1X' && h >= a) ||
        (pick.outcome === '12' && h !== a) ||
        (pick.outcome === 'X2' && h <= a);
      return make(ok ? 'won' : 'lost', `${h}:${a}`, `Двойной шанс «${pick.label}» при счёте ${h}:${a}.`);
    }
    case 'BTTS': {
      const both = h > 0 && a > 0;
      const ok = (pick.outcome === 'yes') === both;
      return make(ok ? 'won' : 'lost', both ? 'обе забили' : 'забили не обе',
        `Хозяева ${h}, гости ${a} — ${both ? 'обе команды забили' : 'забили не обе'}.`);
    }
    case 'O_U_1_5':
    case 'O_U_2_5':
    case 'O_U_3_5': {
      const line = lineForMarket(market.market, pick.label)!;
      const isOver = pick.outcome === 'over';
      const status = overUnder(totalGoals, line, isOver);
      return make(status, `${totalGoals} ${goalWord(totalGoals)}`,
        `Всего голов ${totalGoals} ${status === 'push' ? '=' : totalGoals > line ? '>' : '<'} ${line}.`);
    }
    case 'HOME_TOTAL':
    case 'AWAY_TOTAL': {
      const line = lineForMarket(market.market, pick.label);
      if (line == null) return make('unknown', '—', 'Линия не распознана.');
      const goals = market.market === 'HOME_TOTAL' ? h : a;
      const isOver = pick.outcome === 'over';
      const status = overUnder(goals, line, isOver);
      const who = market.market === 'HOME_TOTAL' ? 'Хозяева' : 'Гости';
      return make(status, `${goals} ${goalWord(goals)}`,
        `${who} забили ${goals} ${status === 'push' ? '=' : goals > line ? '>' : '<'} ${line}.`);
    }
    case 'CORNERS_OU': {
      if (actual.corners == null) return make('unknown', 'нет данных', 'Статистика угловых недоступна.');
      const line = lineForMarket(market.market, pick.label);
      if (line == null) return make('unknown', `${actual.corners}`, 'Линия не распознана.');
      const status = overUnder(actual.corners, line, pick.outcome === 'over');
      return make(status, `${actual.corners} угловых`,
        `В матче ${actual.corners} угловых ${status === 'push' ? '=' : actual.corners > line ? '>' : '<'} ${line}.`);
    }
    case 'CARDS_OU': {
      if (actual.cards == null) return make('unknown', 'нет данных', 'Статистика карточек недоступна.');
      const line = lineForMarket(market.market, pick.label);
      if (line == null) return make('unknown', `${actual.cards}`, 'Линия не распознана.');
      const status = overUnder(actual.cards, line, pick.outcome === 'over');
      return make(status, `${actual.cards} карточек`,
        `В матче ${actual.cards} карточек ${status === 'push' ? '=' : actual.cards > line ? '>' : '<'} ${line}.`);
    }
    default:
      return null;
  }
}

function goalWord(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'гол';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'гола';
  return 'голов';
}

export function settlePrediction(
  markets: PredictionMarket[],
  recommendedMarket: string,
  recommendedOutcome: string,
  actual: ActualResult,
): PredictionSettlement {
  const checks: MarketCheck[] = [];
  for (const m of markets) {
    const c = checkMarket(m, actual);
    if (c) checks.push(c);
  }

  // Main check = the recommended (market, outcome) pick.
  const mainMarket = markets.find((m) => m.market === recommendedMarket);
  const mainCheck =
    (mainMarket && checkMarket({ ...mainMarket, outcomes: pickAsTop(mainMarket, recommendedOutcome) }, actual)) ??
    checks[0]!;
  const mainStatus: 'won' | 'lost' = mainCheck.status === 'won' ? 'won' : 'lost';

  const settled = checks.filter((c) => c.status === 'won' || c.status === 'lost');
  const wonCount = settled.filter((c) => c.status === 'won').length;
  const total = settled.length;

  const overall: PredictionSettlement['overall'] =
    mainStatus === 'won' ? 'won' : wonCount > 0 ? 'partial' : 'lost';

  const { homeGoals: h, awayGoals: a } = actual;
  return {
    resolvedAt: new Date().toISOString(),
    finalScore: { home: h, away: a },
    winner: h > a ? 'home' : h < a ? 'away' : 'draw',
    mainStatus,
    overall,
    wonCount,
    total,
    mainCheck,
    checks,
    stats: { corners: actual.corners, cards: actual.cards },
  };
}

// Force a market's recommended outcome to be the "top" one so checkMarket settles it.
function pickAsTop(m: PredictionMarket, outcome: string): MarketOutcome[] {
  const found = m.outcomes.find((o) => o.outcome === outcome);
  if (!found) return m.outcomes;
  return [{ ...found, probability: 1 }, ...m.outcomes.filter((o) => o.outcome !== outcome)];
}
