import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { desc } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { VALUE_EDGE_THRESHOLD } from '@ai-score/shared';
import type {
  BacktestPick,
  BacktestModelView,
  BacktestSegmentStats,
  BacktestSummary,
} from '@ai-score/shared';
import { DatabaseService } from '../database/database.service';
import { LaozhangClient } from '../laozhang/laozhang.client';
import {
  buildSystemPrompt,
  buildUserPrompt,
  formatOddsBlock,
  type MatchContext,
} from '../predictions/prediction.prompts';
import {
  parseResults,
  type LlmResponse,
  type ParsedModelResult,
} from '../predictions/prediction.aggregator';
import {
  BACKTEST_MATCHES,
  BACKTEST_LABEL,
  type BacktestMatch,
} from './backtest.dataset';

// Каждый рынок, который можно рассчитать из финального счёта: как его называет
// модель (market + outcome), под каким ключом лежит коэффициент и как засчитать.
interface MarketSpec {
  market: string;
  oddsKey: string;
  modelOutcome: string;
  label: string;
  settle: (h: number, a: number) => boolean;
}

const MARKET_SPECS: MarketSpec[] = [
  { market: '1X2', oddsKey: '1', modelOutcome: '1', label: 'П1', settle: (h, a) => h > a },
  { market: '1X2', oddsKey: 'X', modelOutcome: 'X', label: 'Ничья', settle: (h, a) => h === a },
  { market: '1X2', oddsKey: '2', modelOutcome: '2', label: 'П2', settle: (h, a) => h < a },
  { market: 'DC', oddsKey: '1X', modelOutcome: '1X', label: 'Двойной шанс 1X', settle: (h, a) => h >= a },
  { market: 'DC', oddsKey: '12', modelOutcome: '12', label: 'Двойной шанс 12', settle: (h, a) => h !== a },
  { market: 'DC', oddsKey: 'X2', modelOutcome: 'X2', label: 'Двойной шанс X2', settle: (h, a) => h <= a },
  { market: 'BTTS', oddsKey: 'btts_yes', modelOutcome: 'yes', label: 'Обе забьют — Да', settle: (h, a) => h > 0 && a > 0 },
  { market: 'BTTS', oddsKey: 'btts_no', modelOutcome: 'no', label: 'Обе забьют — Нет', settle: (h, a) => !(h > 0 && a > 0) },
  { market: 'O_U_1_5', oddsKey: 'over_1_5', modelOutcome: 'over', label: 'Тотал больше 1.5', settle: (h, a) => h + a > 1.5 },
  { market: 'O_U_1_5', oddsKey: 'under_1_5', modelOutcome: 'under', label: 'Тотал меньше 1.5', settle: (h, a) => h + a < 1.5 },
  { market: 'O_U_2_5', oddsKey: 'over_2_5', modelOutcome: 'over', label: 'Тотал больше 2.5', settle: (h, a) => h + a > 2.5 },
  { market: 'O_U_2_5', oddsKey: 'under_2_5', modelOutcome: 'under', label: 'Тотал меньше 2.5', settle: (h, a) => h + a < 2.5 },
  { market: 'O_U_3_5', oddsKey: 'over_3_5', modelOutcome: 'over', label: 'Тотал больше 3.5', settle: (h, a) => h + a > 3.5 },
  { market: 'O_U_3_5', oddsKey: 'under_3_5', modelOutcome: 'under', label: 'Тотал меньше 3.5', settle: (h, a) => h + a < 3.5 },
];

const DEFAULT_MODELS = ['gpt-4o', 'claude-sonnet-4-6', 'gemini-2.5-flash-nothinking', 'deepseek-v3'];

interface Candidate {
  spec: MarketSpec;
  odds: number;
  modelProb: number;
  impliedProb: number;
  edge: number;
  agreement: number; // доля моделей, у которых этот исход — лучший в рынке
}

@Injectable()
export class BacktestService {
  private readonly logger = new Logger(BacktestService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
  ) {}

  async getLatest(): Promise<BacktestSummary | null> {
    const [row] = await this.db.db
      .select()
      .from(schema.backtests)
      .orderBy(desc(schema.backtests.createdAt))
      .limit(1);
    if (!row) return null;
    return {
      label: row.label,
      models: row.models,
      totalMatches: row.totalMatches,
      recommended: row.recommended,
      skipped: row.skipped,
      won: row.won,
      lost: row.lost,
      pushed: row.pushed,
      avgOdds: row.avgOdds,
      staked: row.staked,
      profit: row.profit,
      roi: row.roi,
      hitRate: row.hitRate,
      byMarket: row.byMarket as BacktestSegmentStats[],
      byLeague: row.byLeague as BacktestSegmentStats[],
      picks: row.picks as BacktestPick[],
      createdAt: row.createdAt.toISOString(),
    };
  }

  // Прогоняет логику value-bet по контрольной выборке и сохраняет результат.
  async run(): Promise<BacktestSummary> {
    const apiKey = this.config.get<string>('laozhang.apiKey') ?? '';
    if (!apiKey) throw new Error('LAOZHANG_API_KEY not set — cannot run backtest');

    const baseUrl = this.config.get<string>('laozhang.baseUrl');
    const models = (this.config.get<string>('laozhang.models') ?? DEFAULT_MODELS.join(','))
      .split(',').map((m) => m.trim()).filter(Boolean);
    const client = new LaozhangClient(apiKey, baseUrl, 90_000);

    this.logger.log(
      `Backtest: ${BACKTEST_MATCHES.length} matches × ${models.length} models (${models.join(', ')})`,
    );

    const picks: BacktestPick[] = [];
    for (const match of BACKTEST_MATCHES) {
      const pick = await this.analyzeMatch(client, models, match);
      picks.push(pick);
      this.logger.log(
        `  ${match.home} vs ${match.away}: ` +
        (pick.recommended
          ? `${pick.outcomeLabel} @ ${pick.odds?.toFixed(2)} → ${pick.result.toUpperCase()} (счёт ${pick.actualResult})`
          : `ПРОПУСК (нет value), счёт ${pick.actualResult}`),
      );
      await sleep(1000);
    }

    const summary = aggregateBacktest(picks, models);
    await this.persist(summary);
    this.logger.log(
      `Backtest done: ${summary.won}/${summary.recommended} зашло, ` +
      `ROI ${(summary.roi * 100).toFixed(1)}%, профит ${summary.profit.toFixed(2)}u`,
    );
    return summary;
  }

  private async analyzeMatch(
    client: LaozhangClient,
    models: string[],
    match: BacktestMatch,
  ): Promise<BacktestPick> {
    const ctx: MatchContext = {
      homeTeam: match.home,
      awayTeam: match.away,
      homeTeamShort: match.home,
      awayTeamShort: match.away,
      league: match.league,
      country: match.country,
      round: match.round ?? null,
      date: match.date,
      ...match.context,
      odds: formatOddsBlock(match.odds),
    };

    const messages = [
      { role: 'system' as const, content: buildSystemPrompt() },
      { role: 'user' as const, content: buildUserPrompt(ctx) },
    ];

    const results = await client.fanOut(models, messages);
    const perModel = parseResults(results);
    const valid = perModel.filter((p) => p.parsed).map((p) => p.parsed!);

    const { homeGoals, awayGoals } = match.actual;
    const actualResult = `${homeGoals}:${awayGoals}`;

    if (!valid.length) {
      this.logger.warn(`All models failed for ${match.id}`);
      return skipPick(match, actualResult, null, '', [], buildModelViews(perModel, null), null);
    }

    const best = pickBestValue(valid, match.odds);
    const rationale = pickRationale(valid);
    const keyFactors = mergeKeyFactors(valid);
    const modelViews = buildModelViews(perModel, best?.spec ?? null);

    if (!best || best.edge < VALUE_EDGE_THRESHOLD) {
      const decision = best
        ? `Итог: ПРОПУСК — лучший рынок «${best.spec.label}» даёт преимущество всего +${(best.edge * 100).toFixed(1)}% (ниже порога).`
        : 'Итог: ПРОПУСК — ни по одному рынку нет преимущества над линией букмекера.';
      const summary = await this.synthesize(client, models[0]!, match, modelViews, decision);
      return skipPick(match, actualResult, best, rationale, keyFactors, modelViews, summary);
    }

    const won = best.spec.settle(homeGoals, awayGoals);
    const stars = toStars(0.4 + best.agreement * 0.35 + Math.min(best.edge, 0.2) / 0.2 * 0.25);
    const agreeing = Math.round(best.agreement * valid.length);
    const decision = `Итог: СТАВКА на «${best.spec.label}» @ ${best.odds.toFixed(2)} ` +
      `(вероятность модели ${(best.modelProb * 100).toFixed(0)}% против ${(best.impliedProb * 100).toFixed(0)}% у букмекера, value +${(best.edge * 100).toFixed(1)}%).`;
    const summary = await this.synthesize(client, models[0]!, match, modelViews, decision);

    return {
      match: `${match.home} — ${match.away}`,
      league: match.league,
      date: match.date,
      recommended: true,
      market: best.spec.market,
      outcome: best.spec.modelOutcome,
      outcomeLabel: best.spec.label,
      modelProbability: round(best.modelProb),
      impliedProbability: round(best.impliedProb),
      valueEdge: round(best.edge),
      odds: best.odds,
      stars,
      result: won ? 'won' : 'lost',
      actualResult,
      rationale,
      keyFactors,
      consensus: `${agreeing} из ${valid.length} моделей за «${best.spec.label}», value +${(best.edge * 100).toFixed(1)}%`,
      summary,
      models: modelViews,
    };
  }

  // Синтез: одна модель получает прогнозы ВСЕХ моделей и итоговое решение и
  // формулирует общий вывод — где модели согласны, где расходятся и почему такой итог.
  private async synthesize(
    client: LaozhangClient,
    model: string,
    match: BacktestMatch,
    views: BacktestModelView[],
    decision: string,
  ): Promise<string | null> {
    const opinions = views
      .filter((v) => !v.error)
      .map((v) => {
        const prob = v.probability != null ? `, оценка по итоговому исходу ${Math.round(v.probability * 100)}%` : '';
        const conf = v.confidence != null ? `, уверенность ${Math.round(v.confidence * 100)}%` : '';
        return `- ${v.modelId}: выбирает «${v.ownOutcomeLabel ?? '—'}»${conf}${prob}. ${v.rationale ?? ''}`.trim();
      })
      .join('\n');
    if (!opinions) return null;

    const messages = [
      {
        role: 'system' as const,
        content:
          'Ты — главный аналитик, объединяющий мнения нескольких независимых AI-моделей в один консенсус. ' +
          'Верни ТОЛЬКО связный текст на русском (3–4 предложения), без JSON и markdown.',
      },
      {
        role: 'user' as const,
        content:
          `Матч: ${match.home} — ${match.away} (${match.league}).\n\n` +
          `Прогнозы моделей:\n${opinions}\n\n${decision}\n\n` +
          'Сформулируй ОБЩЕЕ мнение всех моделей: в чём они согласны, в чём расходятся, ' +
          'насколько единодушен консенсус и почему итоговое решение именно такое.',
      },
    ];

    const res = await client.complete({ model, messages, max_tokens: 450, temperature: 0.3 });
    if (res.error || !res.content.trim()) return null;
    return res.content.trim().slice(0, 700);
  }

  private async persist(s: BacktestSummary): Promise<void> {
    await this.db.db.insert(schema.backtests).values({
      label: s.label,
      models: s.models,
      totalMatches: s.totalMatches,
      recommended: s.recommended,
      skipped: s.skipped,
      won: s.won,
      lost: s.lost,
      pushed: s.pushed,
      avgOdds: s.avgOdds,
      staked: s.staked,
      profit: s.profit,
      roi: s.roi,
      hitRate: s.hitRate,
      byMarket: s.byMarket,
      byLeague: s.byLeague,
      picks: s.picks,
    });
  }
}

// ── Чистые функции (тестируемы независимо от Nest/БД) ───────────────────────

function pickBestValue(responses: LlmResponse[], odds: Record<string, number>): Candidate | null {
  const n = responses.length;
  const minPresence = Math.ceil(n / 2);
  let best: Candidate | null = null;

  for (const spec of MARKET_SPECS) {
    const price = odds[spec.oddsKey];
    if (!price) continue;

    // вероятности этого исхода по всем моделям, где рынок присутствует
    const probs: number[] = [];
    let topCount = 0;
    for (const r of responses) {
      const mkt = r.markets.find((m) => m.market === spec.market);
      if (!mkt) continue;
      const out = mkt.outcomes.find((o) => o.outcome === spec.modelOutcome);
      if (!out) continue;
      probs.push(out.probability);
      const maxProb = Math.max(...mkt.outcomes.map((o) => o.probability));
      if (out.probability >= maxProb - 1e-9) topCount += 1;
    }
    if (probs.length < minPresence) continue;

    const modelProb = probs.reduce((a, b) => a + b, 0) / probs.length;
    const impliedProb = 1 / price;
    const edge = modelProb - impliedProb;
    const agreement = topCount / n;

    if (!best || edge > best.edge) {
      best = { spec, odds: price, modelProb, impliedProb, edge, agreement };
    }
  }

  return best;
}

function aggregateBacktest(picks: BacktestPick[], models: string[]): BacktestSummary {
  const recommendedPicks = picks.filter((p) => p.recommended);
  const won = recommendedPicks.filter((p) => p.result === 'won').length;
  const lost = recommendedPicks.filter((p) => p.result === 'lost').length;
  const pushed = recommendedPicks.filter((p) => p.result === 'push').length;
  const staked = recommendedPicks.length;
  const profit = recommendedPicks.reduce((sum, p) => {
    if (p.result === 'won') return sum + ((p.odds ?? 1) - 1);
    if (p.result === 'lost') return sum - 1;
    return sum; // push
  }, 0);
  const avgOdds = staked > 0
    ? recommendedPicks.reduce((s, p) => s + (p.odds ?? 0), 0) / staked
    : 0;

  return {
    label: BACKTEST_LABEL,
    models,
    totalMatches: picks.length,
    recommended: recommendedPicks.length,
    skipped: picks.length - recommendedPicks.length,
    won,
    lost,
    pushed,
    avgOdds: round(avgOdds),
    staked,
    profit: round(profit),
    roi: staked > 0 ? round(profit / staked) : 0,
    hitRate: staked > 0 ? round(won / staked) : 0,
    byMarket: segment(recommendedPicks, (p) => p.market ?? '—'),
    byLeague: segment(recommendedPicks, (p) => p.league),
    picks,
    createdAt: new Date().toISOString(),
  };
}

function segment(picks: BacktestPick[], keyFn: (p: BacktestPick) => string): BacktestSegmentStats[] {
  const groups = new Map<string, BacktestPick[]>();
  for (const p of picks) {
    const k = keyFn(p);
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(p);
  }
  return [...groups.entries()]
    .map(([key, list]) => {
      const won = list.filter((p) => p.result === 'won').length;
      const lost = list.filter((p) => p.result === 'lost').length;
      const profit = list.reduce(
        (s, p) => s + (p.result === 'won' ? (p.odds ?? 1) - 1 : p.result === 'lost' ? -1 : 0),
        0,
      );
      return {
        key,
        bets: list.length,
        won,
        lost,
        profit: round(profit),
        roi: list.length > 0 ? round(profit / list.length) : 0,
      };
    })
    .sort((a, b) => b.bets - a.bets);
}

// Пропуск: фиксируем ЛУЧШИЙ рассмотренный рынок и почему он не дотянул до порога
// value — чтобы на сайте было видно обоснование отказа, а не просто «нет value».
function skipPick(
  match: BacktestMatch,
  actualResult: string,
  best: Candidate | null,
  rationale: string,
  keyFactors: string[],
  models: BacktestModelView[],
  summary: string | null,
): BacktestPick {
  const thresholdPct = (VALUE_EDGE_THRESHOLD * 100).toFixed(0);
  const reason = best
    ? `Лучший рассмотренный рынок — «${best.spec.label}» @ ${best.odds.toFixed(2)}: вероятность модели ` +
      `${(best.modelProb * 100).toFixed(0)}% против ${(best.impliedProb * 100).toFixed(0)}% у букмекера, ` +
      `преимущество всего +${(best.edge * 100).toFixed(1)}% (< порога ${thresholdPct}%). Ставка пропущена.`
    : 'Ни по одному рынку нет преимущества над линией букмекера — ставка пропущена.';

  return {
    match: `${match.home} — ${match.away}`,
    league: match.league,
    date: match.date,
    recommended: false,
    market: best?.spec.market ?? null,
    outcome: best?.spec.modelOutcome ?? null,
    outcomeLabel: best?.spec.label ?? null,
    modelProbability: best ? round(best.modelProb) : null,
    impliedProbability: best ? round(best.impliedProb) : null,
    valueEdge: best ? round(best.edge) : null,
    odds: best?.odds ?? null,
    stars: null,
    result: 'skip',
    actualResult,
    rationale: best ? `${reason}\n\n${rationale}`.trim() : reason,
    keyFactors,
    consensus: null,
    summary,
    models,
  };
}

// Прогноз каждой модели по выбранному рынку: её вероятность нужного исхода,
// собственный выбор модели, согласие с итогом и индивидуальное обоснование.
function buildModelViews(perModel: ParsedModelResult[], spec: MarketSpec | null): BacktestModelView[] {
  return perModel.map((pm) => {
    if (!pm.parsed) {
      return {
        modelId: pm.modelId,
        probability: null,
        ownMarket: null,
        ownOutcomeLabel: null,
        confidence: null,
        agreed: false,
        rationale: null,
        error: pm.error,
      };
    }
    const r = pm.parsed;
    let probability: number | null = null;
    let agreed = false;
    if (spec) {
      const mkt = r.markets.find((m) => m.market === spec.market);
      const out = mkt?.outcomes.find((o) => o.outcome === spec.modelOutcome);
      if (out) {
        probability = round(out.probability);
        const maxProb = Math.max(...mkt!.outcomes.map((o) => o.probability));
        agreed = out.probability >= maxProb - 1e-9;
      }
    }
    return {
      modelId: pm.modelId,
      probability,
      ownMarket: r.recommendedMarket,
      ownOutcomeLabel: labelFor(r.recommendedMarket, r.recommendedOutcome),
      confidence: round(r.confidence),
      agreed,
      rationale: r.rationale ?? null,
      error: null,
    };
  });
}

// Человекочитаемая подпись для пары (рынок, исход), которую рекомендовала модель.
function labelFor(market: string, outcome: string): string {
  const spec = MARKET_SPECS.find((s) => s.market === market && s.modelOutcome === outcome);
  if (spec) return spec.label;
  return `${market} · ${outcome}`;
}

function pickRationale(responses: LlmResponse[]): string {
  return responses
    .map((r) => r.rationale ?? '')
    .filter((s) => s.length > 20)
    .sort((a, b) => b.length - a.length)[0] ?? '';
}

function mergeKeyFactors(responses: LlmResponse[]): string[] {
  return [...new Set(responses.flatMap((r) => r.keyFactors ?? []).filter(Boolean))].slice(0, 5);
}

function toStars(confidence: number): 1 | 2 | 3 | 4 | 5 {
  if (confidence >= 0.85) return 5;
  if (confidence >= 0.7) return 4;
  if (confidence >= 0.55) return 3;
  if (confidence >= 0.4) return 2;
  return 1;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
