export interface MatchContext {
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string;
  awayTeamShort: string;
  league: string;
  country: string;
  round: string | null;
  date: string;
  homeForm?: string;     // e.g. "W W D L W"
  awayForm?: string;
  h2hSummary?: string;   // e.g. "3W 1D 2L, avg 2.8 goals"
  injuries?: string;     // e.g. "Home: Kane (knee), Away: -"
}

export function buildSystemPrompt(): string {
  return (
    'You are an expert football match analyst. ' +
    'You MUST respond with ONLY valid JSON — no markdown, no explanation text before or after.'
  );
}

export function buildUserPrompt(ctx: MatchContext): string {
  const contextLines = [
    `Match: ${ctx.homeTeam} vs ${ctx.awayTeam}`,
    `Competition: ${ctx.league} (${ctx.country})${ctx.round ? ', ' + ctx.round : ''}`,
    `Date: ${ctx.date}`,
  ];

  if (ctx.homeForm) contextLines.push(`Home form (last 5): ${ctx.homeForm}`);
  if (ctx.awayForm) contextLines.push(`Away form (last 5): ${ctx.awayForm}`);
  if (ctx.h2hSummary) contextLines.push(`H2H: ${ctx.h2hSummary}`);
  if (ctx.injuries) contextLines.push(`Injuries: ${ctx.injuries}`);

  return `${contextLines.join('\n')}

Predict this match. Return ONLY JSON matching this schema exactly:
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
  "rationale": "2-3 предложения на русском языке, основанные на данных матча.",
  "keyFactors": ["Фактор 1", "Фактор 2", "Фактор 3"],
  "confidence": 0.XX
}

Rules:
- Probabilities in EACH market must sum to exactly 1.0
- confidence is 0.0–1.0 (your certainty level)
- rationale and keyFactors MUST be in Russian
- recommendedOutcome must be the outcome with the highest expected value`;
}
