import type { LvsOutcome, LvsResultStatus, LvsScorer, LvsScorerResult, LvsSettlementView } from '../types/lvs';

export interface LvsActual {
  homeGoals: number;
  awayGoals: number;
  scorers: string[]; // имена игроков, забивших в матче (обе команды)
}

export interface LvsPredictionInput {
  outcome: LvsOutcome;
  scoreHome: number;
  scoreAway: number;
  scorers: LvsScorer[];
}

export function outcomeFromScore(home: number, away: number): LvsOutcome {
  return home > away ? '1' : home < away ? '2' : 'X';
}

// Нормализация имени для сопоставления забивших с предсказанными игроками:
// нижний регистр, без диакритики/пунктуации, сжатые пробелы.
function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // снимаем диакритику
    .toLowerCase()
    .replace(/[^a-zа-я0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Совпадение по фамилии/токенам: предсказанный игрок засчитывается, если хотя бы
// один значимый токен (≥3 символов) его имени присутствует среди забивших.
function nameMatches(predicted: string, actualNames: string[]): boolean {
  const p = normalize(predicted);
  if (!p) return false;
  const pTokens = p.split(' ').filter((t) => t.length >= 3);
  return actualNames.some((a) => {
    const n = normalize(a);
    if (!n) return false;
    if (n === p || n.includes(p) || p.includes(n)) return true;
    const aTokens = n.split(' ').filter((t) => t.length >= 3);
    return pTokens.some((pt) => aTokens.some((at) => at === pt));
  });
}

// Сверяет прогноз ЛВС с фактом. Статус «по исходу + бонусы»:
//  • won     — исход верный И (точный счёт верный ИЛИ ≥1 предсказанный игрок забил);
//  • partial — исход верный без бонусов ИЛИ исход неверный, но ≥1 игрок забил;
//  • lost    — ничего не угадано.
export function settleLvs(pred: LvsPredictionInput, actual: LvsActual): LvsSettlementView {
  const actualOutcome = outcomeFromScore(actual.homeGoals, actual.awayGoals);
  const outcomeHit = pred.outcome === actualOutcome;
  const scoreHit = pred.scoreHome === actual.homeGoals && pred.scoreAway === actual.awayGoals;

  const scorers: LvsScorerResult[] = pred.scorers.map((s) => ({
    name: s.name,
    team: s.team,
    scored: nameMatches(s.name, actual.scorers),
  }));
  const anyScorerHit = scorers.some((s) => s.scored);

  let resultStatus: LvsResultStatus;
  if (outcomeHit && (scoreHit || anyScorerHit)) resultStatus = 'won';
  else if (outcomeHit || anyScorerHit) resultStatus = 'partial';
  else resultStatus = 'lost';

  return {
    resultStatus,
    outcomeHit,
    scoreHit,
    actualOutcome,
    actualScore: { home: actual.homeGoals, away: actual.awayGoals },
    scorers,
    actualScorers: actual.scorers,
  };
}
