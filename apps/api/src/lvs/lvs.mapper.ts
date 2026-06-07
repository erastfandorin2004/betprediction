import * as schema from '@ai-score/db';
import type {
  LvsPredictionDetail,
  LvsHistoryItem,
  LvsScorer,
  LvsScorerResult,
  LvsModelForecast,
  LvsLineups,
  LvsTeamLineup,
  LvsOutcome,
  LvsResultStatus,
  LvsStatus,
} from '@ai-score/shared';

type LvsRow = typeof schema.lvsPredictions.$inferSelect;

export function outcomeLabel(o: LvsOutcome): string {
  return o === '1' ? 'П1' : o === '2' ? 'П2' : 'Ничья';
}

function asLineup(v: unknown): LvsTeamLineup | null {
  if (!v || typeof v !== 'object') return null;
  return v as LvsTeamLineup;
}

export function rowToLvsDetail(row: LvsRow): LvsPredictionDetail {
  const outcome = row.outcome as LvsOutcome;
  const home = asLineup(row.lineupsHome);
  const away = asLineup(row.lineupsAway);
  const lineups: LvsLineups | null = home && away ? { home, away } : null;

  const result =
    row.status === 'resolved' && row.resultStatus
      ? {
          resultStatus: row.resultStatus as LvsResultStatus,
          outcomeHit: !!row.outcomeHit,
          scoreHit: !!row.scoreHit,
          actualOutcome: (row.actualOutcome ?? 'X') as LvsOutcome,
          actualScore: { home: row.actualScoreHome ?? 0, away: row.actualScoreAway ?? 0 },
          scorers: (row.scorersResult as LvsScorerResult[] | null) ?? [],
        }
      : null;

  return {
    fixtureId: row.fixtureId,
    outcome,
    outcomeLabel: outcomeLabel(outcome),
    probs: { win1: row.probWin1, draw: row.probDraw, win2: row.probWin2 },
    score: { home: row.scoreHome, away: row.scoreAway },
    scorers: (row.scorers as LvsScorer[] | null) ?? [],
    confidence: row.confidence,
    stars: row.stars,
    rationale: row.rationale,
    summary: row.summary,
    odds: row.oddsBlock,
    modelViews: (row.modelViews as LvsModelForecast[] | null) ?? [],
    lineups,
    status: row.status as LvsStatus,
    result,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

export function rowToLvsHistory(row: LvsRow, match: string, kickoff: string): LvsHistoryItem {
  const predicted = row.outcome as LvsOutcome;
  const actual = (row.actualOutcome ?? 'X') as LvsOutcome;
  return {
    fixtureId: row.fixtureId,
    match,
    kickoff,
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    predictedOutcome: predicted,
    predictedOutcomeLabel: outcomeLabel(predicted),
    actualOutcome: actual,
    actualOutcomeLabel: outcomeLabel(actual),
    predictedScore: { home: row.scoreHome, away: row.scoreAway },
    actualScore: { home: row.actualScoreHome ?? 0, away: row.actualScoreAway ?? 0 },
    scorers: (row.scorersResult as LvsScorerResult[] | null) ?? [],
    resultStatus: (row.resultStatus ?? 'lost') as LvsResultStatus,
  };
}
