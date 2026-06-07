import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import {
  LaozhangClient,
  buildSystemPrompt,
  buildUserPrompt,
  llmPredictionResponseSchema,
  MARKET_LABELS,
  type MatchContext,
  type ModelCallResult,
} from '@ai-score/shared';
import type { PredictionDetail, ModelConsensus, ModelForecast, BetPick, MarketType } from '@ai-score/shared';
import type { MatchLineupsOut } from '../providers/api-football/api-football.adapter';
import { DatabaseService } from '../database/database.service';
import { PredictionsService } from './predictions.service';
import { FixturesService } from '../fixtures/fixtures.service';
import { InjuriesAdapter } from '../providers/injuries/injuries.adapter';
import { OddsAdapter } from '../providers/odds/odds.adapter';

// Минимальная форма матча из провайдерского контекста (mapH2HFixture).
interface ProviderFixture {
  date?: string;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  scoreHome?: number | null;
  scoreAway?: number | null;
}

type LlmResponse = ReturnType<typeof llmPredictionResponseSchema.parse>;
type AggMarket = {
  market: string;
  outcomes: { label: string; outcome: string; probability: number; isRecommended: boolean }[];
  isLocked: boolean;
};

// grok-4 — laozhang-алиас Grok 4.3 (литералы grok-4.3/grok-4-3 не резолвятся).
const DEFAULT_MODELS = ['gpt-5.1', 'grok-4', 'claude-opus-4-8', 'deepseek-chat'];
// Дешёвая быстрая модель для синтеза общего вывода (экономия токенов).
const SYNTH_MODEL = 'gemini-2.5-flash-nothinking';

@Injectable()
export class AiAnalysisService {
  private readonly logger = new Logger(AiAnalysisService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly predictions: PredictionsService,
    private readonly fixtures: FixturesService,
    private readonly injuries: InjuriesAdapter,
    private readonly odds: OddsAdapter,
  ) {}

  // On-demand full AI analysis for a single fixture (the "AI-прогноз" button).
  // Test phase: free, no token charge (see config.predictions.tokensEnabled).
  async analyze(fixtureId: number): Promise<PredictionDetail> {
    const apiKey = this.config.get<string>('laozhang.apiKey') ?? '';
    if (!apiKey) throw new NotFoundException('LAOZHANG_API_KEY is not configured');

    const built = await this.buildContext(fixtureId);
    if (!built) throw new NotFoundException(`Fixture ${fixtureId} not found`);
    const { ctx, oddsMap } = built;

    // TODO(tokens): when config.predictions.tokensEnabled — verify & charge
    // config.predictions.aiCostTokens here before running the analysis.

    const baseUrl = this.config.get<string>('laozhang.baseUrl');
    const models = (this.config.get<string>('laozhang.models') ?? DEFAULT_MODELS.join(','))
      .split(',').map((m) => m.trim()).filter(Boolean);
    const client = new LaozhangClient(apiKey, baseUrl, 120_000);

    this.logger.log(`AI analysis: ${ctx.homeTeam} vs ${ctx.awayTeam} × ${models.length} models`);
    const results = await client.fanOut(models, [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(ctx) },
    ]);

    const parsed = parseWithModel(results);
    const valid = parsed.filter((p) => p.parsed).map((p) => p.parsed!);
    this.logger.log(`AI analysis: ${valid.length}/${results.length} models responded for ${fixtureId}`);
    if (!valid.length) throw new NotFoundException('All AI models failed to produce a prediction');

    const agg = aggregate(valid, results.length);
    const modelViews = buildModelViews(parsed, agg.recommendedMarket, agg.recommendedOutcome);

    // Select the 1–3 strongest bets for THIS match (prob + real odds + value).
    // Учитываем КОНКРЕТНЫЕ рекомендации моделей (с линией), а не только усреднённый
    // консенсус — чтобы лучший предложенный вариант выносился наверх, без расхождения
    // «сверху риск, снизу ставка».
    const selectedBets = selectBets(agg.markets, oddsMap, valid);
    const primary = selectedBets[0] ?? null;
    const riskNote = selectedBets.length ? null : buildRiskNote(agg);

    const summary = await this.synthesize(client, SYNTH_MODEL, ctx, modelViews, agg);

    // The hero recommendation follows the primary selected bet when one passes
    // the thresholds; otherwise it falls back to the ensemble's majority pick.
    const recommendedMarket = primary?.market ?? agg.recommendedMarket;
    const recommendedOutcome = primary?.outcome ?? agg.recommendedOutcome;
    const probability = primary?.probability ?? agg.probability;
    const recLabel = agg.markets
      .find((m) => m.market === recommendedMarket)
      ?.outcomes.find((o) => o.outcome === recommendedOutcome)?.label;
    const recOdds = primary?.odds ?? oddsMap[oddsKeyFor(recommendedMarket, recommendedOutcome, recLabel)];
    const impliedProbability = primary?.impliedProbability ?? (recOdds ? round(1 / recOdds) : null);
    const valueEdge = primary?.valueEdge ?? (impliedProbability != null ? round(probability - impliedProbability) : null);

    this.logger.log(
      selectedBets.length
        ? `Selected ${selectedBets.length} bet(s) for ${fixtureId}; primary ${recommendedMarket}/${recommendedOutcome} @ ${Math.round(probability * 100)}%`
        : `No qualifying bet for ${fixtureId} — flagged high risk`,
    );

    // Persist as an immutable-style snapshot; re-running replaces the prior one.
    await this.db.db.delete(schema.predictions).where(eq(schema.predictions.fixtureId, fixtureId));
    const [row] = await this.db.db
      .insert(schema.predictions)
      .values({
        fixtureId,
        markets: agg.markets as unknown[],
        recommendedMarket,
        recommendedOutcome,
        probability,
        confidence: agg.confidence,
        stars: agg.stars,
        modelConsensus: agg.modelConsensus as unknown,
        modelViews: modelViews as unknown[],
        summary,
        rationale: agg.rationale,
        keyFactors: agg.keyFactors,
        valueEdge,
        impliedProbability,
        selectedBets: selectedBets as unknown[],
        riskNote,
        status: 'pending',
      })
      .returning();

    return this.predictions.toDetail(row!, false);
  }

  // Синтез: одна модель объединяет прогнозы всех моделей в общий вывод.
  private async synthesize(
    client: LaozhangClient,
    model: string,
    ctx: MatchContext,
    views: ModelForecast[],
    agg: Aggregated,
  ): Promise<string | null> {
    // Компактный вход: выбор каждой модели + укороченное обоснование (экономия токенов).
    const opinions = views
      .filter((v) => !v.error)
      .map((v) => {
        const prob = v.probability != null ? ` (${Math.round(v.probability * 100)}%)` : '';
        const why = (v.rationale ?? '').slice(0, 140);
        return `- ${v.modelId}: «${v.ownOutcomeLabel ?? '—'}»${prob}. ${why}`.trim();
      })
      .join('\n');
    if (!opinions) return null;

    const decision = `Итог ансамбля: «${labelFor(agg.recommendedMarket, agg.recommendedOutcome)}» (${Math.round(agg.probability * 100)}%).`;
    const res = await client.complete({
      model,
      messages: [
        {
          role: 'system',
          content: 'Объедини мнения AI-моделей в один вывод. Только связный текст на русском, 2–3 предложения, без markdown.',
        },
        {
          role: 'user',
          content: `${ctx.homeTeam} — ${ctx.awayTeam}.\nМодели:\n${opinions}\n${decision}\nВ чём модели согласны/расходятся и почему такой итог.`,
        },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });
    if (res.error || !res.content.trim()) return null;
    return res.content.trim().slice(0, 600);
  }

  private async buildContext(fixtureId: number): Promise<{ ctx: MatchContext; oddsMap: Record<string, number> } | null> {
    const [fixture] = await this.db.db
      .select()
      .from(schema.fixtures)
      .where(eq(schema.fixtures.id, fixtureId))
      .limit(1);
    if (!fixture) return null;

    const [home] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.homeTeamId)).limit(1);
    const [away] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.awayTeamId)).limit(1);
    const [league] = await this.db.db.select().from(schema.leagues).where(eq(schema.leagues.id, fixture.leagueId)).limit(1);
    if (!home || !away || !league) return null;

    const isFriendly = /friendl|товарищ/i.test(`${league.name} ${league.type ?? ''}`);
    const ctx: MatchContext = {
      homeTeam: home.name,
      awayTeam: away.name,
      homeTeamShort: home.shortName || home.name,
      awayTeamShort: away.shortName || away.name,
      league: league.name,
      country: league.country ?? '',
      round: fixture.round,
      date: fixture.startsAt.toISOString().slice(0, 10),
      importance: isFriendly ? 'Товарищеский матч — невысокие ставки, возможна ротация составов' : undefined,
    };

    // Enrich with live provider data (form, H2H, lineups). Best-effort — the
    // provider may be rate-limited or have no data for this fixture.
    try {
      const c = (await this.fixtures.findContext(fixtureId, 'ru')) as Record<string, unknown>;
      const homeFlash = (c['homeFormFlash'] as ProviderFixture[] | undefined) ?? [];
      const awayFlash = (c['awayFormFlash'] as ProviderFixture[] | undefined) ?? [];
      const h2hAll = (c['h2hAll'] as ProviderFixture[] | undefined) ?? [];
      const lineups = (c['lineups'] as MatchLineupsOut | null) ?? null;
      const homeCoach = (c['homeCoach'] as { name?: string } | null)?.name;
      const awayCoach = (c['awayCoach'] as { name?: string } | null)?.name;

      const homeForm = formString(homeFlash, home.name);
      const awayForm = formString(awayFlash, away.name);
      if (homeForm) ctx.homeForm = homeForm;
      if (awayForm) ctx.awayForm = awayForm;

      const h2h = h2hSummary(h2hAll, home.name);
      if (h2h) ctx.h2hSummary = h2h;

      const coaches = [
        homeCoach ? `${home.shortName || home.name}: ${homeCoach}` : null,
        awayCoach ? `${away.shortName || away.name}: ${awayCoach}` : null,
      ].filter(Boolean);
      if (coaches.length) ctx.coaches = coaches.join('; ');

      if (lineups) {
        const lineupText = lineupsSummary(lineups, home.shortName || home.name, away.shortName || away.name);
        if (lineupText) ctx.lineups = lineupText;
      }
    } catch (err) {
      this.logger.warn(`Provider context unavailable for ${fixtureId}: ${err instanceof Error ? err.message : err}`);
    }

    // Dedicated injuries/suspensions feed (API-Football). Overrides the
    // lineup-derived list when available (it's richer and works pre-match).
    try {
      const season = fixture.startsAt.getUTCFullYear();
      const inj = await this.injuries.getInjuries(
        home.name, away.name, season,
        home.shortName || home.name, away.shortName || away.name,
      );
      if (inj) ctx.injuries = inj;
    } catch (err) {
      this.logger.warn(`Injuries feed unavailable for ${fixtureId}: ${err instanceof Error ? err.message : err}`);
    }

    // Live bookmaker line — fed to the model for value detection vs implied prob.
    let oddsMap: Record<string, number> = {};
    try {
      const line = await this.odds.getOdds(home.name, away.name);
      oddsMap = line.map;
      if (line.block) ctx.odds = line.block;
    } catch (err) {
      this.logger.warn(`Odds unavailable for ${fixtureId}: ${err instanceof Error ? err.message : err}`);
    }

    return { ctx, oddsMap };
  }
}

// Map a (market, outcome) to the odds-map key used by the live line. Для рынков
// с линией (инд. тоталы/угловые/карточки) линия берётся из label ставки.
function oddsKeyFor(market: string, outcome: string, label?: string): string {
  if (market === '1X2') return outcome; // '1' | 'X' | '2'
  if (market === 'DC') return outcome; // '1X' | '12' | 'X2'
  if (market === 'BTTS') return `btts_${outcome}`; // btts_yes | btts_no
  if (market === 'O_U_1_5') return `${outcome}_1_5`;
  if (market === 'O_U_2_5') return `${outcome}_2_5`;
  if (market === 'O_U_3_5') return `${outcome}_3_5`;
  if (market === 'HOME_TOTAL' || market === 'AWAY_TOTAL' || market === 'CORNERS_OU' || market === 'CARDS_OU') {
    const line = parseLine(label);
    return line ? `${market}:${outcome}:${line}` : `${market}:${outcome}:?`;
  }
  return `${market}:${outcome}`;
}

// Достаём линию (напр. «2.5») из лейбла исхода: «Больше 2.5», «ТБ 9.5», «Тотал хозяев — Больше 1.5».
function parseLine(label?: string): string | null {
  if (!label) return null;
  const m = label.match(/(\d+(?:[.,]\d+)?)/);
  return m ? m[1]!.replace(',', '.') : null;
}

// ── Bet selection ───────────────────────────────────────────────────────────
// Ищем 1–3 ЛУЧШИХ ставки по ВСЕЙ линии букмекера, а не только по исходу матча.
// Все рынки конкурируют наравне (исход, двойной шанс, тоталы голов и инд., обе
// забьют, угловые, карточки) — выбор value-first:
//  • value-ставка: перевес (edge) ≥ 5% при вероятности ≥ 52% и коэф. 1.5–6.0;
//  • уверенный фаворит: вероятность ≥ 68% и коэф. ≥ 1.55 (даже без большого перевеса);
//  • рынок без живого коэффициента — только при вероятности ≥ 65%;
//  • ранжируем по силе (перевес + бонус за вероятность): первым идёт самый
//    сильный рынок — угловые/карточки/тотал/исход, что окажется выгоднее;
//  • если ничего не проходит — ставок нет (вызывающий помечает высокий риск).
const MIN_EDGE = 0.05;
const VALUE_MIN_PROB = 0.52;
const FAV_MIN_PROB = 0.68;
const FAV_MIN_ODDS = 1.55;
const MIN_ODDS = 1.5;
const MAX_ODDS = 6.0;
const NO_ODDS_MIN_PROB = 0.65;
// Рынки, которые без реального коэффициента почти всегда низкокоэффициентные —
// не предлагаем их «вслепую».
const NO_ODDS_INELIGIBLE = new Set(['DC', 'O_U_1_5']);

// Кандидат ставки, сгруппированный по (рынок + исход + линия). Источник — сначала
// собственные рекомендации моделей (с конкретной линией), затем агрегат-консенсус
// как добор. support = сколько моделей реально это предложили (для приоритета
// согласованных ставок и устранения расхождения «сверху риск — снизу ставка»).
interface BetCand {
  market: string;
  marketLabel: string;
  outcome: string;
  label: string;
  probs: number[];
  support: number;
}

function selectBets(
  markets: AggMarket[],
  oddsMap: Record<string, number>,
  modelResponses: LlmResponse[],
): BetPick[] {
  const byKey = new Map<string, BetCand>();
  const add = (market: string, outcome: string, label: string, prob: number, isModelPick: boolean) => {
    const line = parseLine(label) ?? '';
    const key = `${market}|${outcome}|${line}`;
    let e = byKey.get(key);
    if (!e) {
      e = { market, outcome, label, marketLabel: (MARKET_LABELS as Record<string, string>)[market] ?? market, probs: [], support: 0 };
      byKey.set(key, e);
    }
    e.probs.push(prob);
    if (isModelPick) e.support += 1;
  };

  // 1) Конкретный выбор каждой модели (с её линией и вероятностью).
  for (const r of modelResponses) {
    const mk = r.markets.find((m) => m.market === r.recommendedMarket);
    const oc = mk?.outcomes.find((o) => o.outcome === r.recommendedOutcome);
    if (mk && oc) add(mk.market, oc.outcome, oc.label, oc.probability, true);
  }
  // 2) Консенсус-топ по каждому рынку — добор (заполняет ключи, которых ещё нет).
  for (const m of markets) {
    if (!m.outcomes.length) continue;
    const top = m.outcomes.reduce((b, o) => (o.probability > b.probability ? o : b));
    add(m.market, top.outcome, top.label, top.probability, false);
  }

  const candidates: (BetPick & { _support: number })[] = [];
  for (const e of byKey.values()) {
    const prob = e.probs.reduce((a, b) => a + b, 0) / e.probs.length;
    const realOdds = oddsMap[oddsKeyFor(e.market, e.outcome, e.label)];
    if (realOdds != null) {
      if (realOdds < MIN_ODDS || realOdds > MAX_ODDS) continue;
      const implied = round(1 / realOdds);
      const edge = round(prob - implied);
      const isValue = edge >= MIN_EDGE && prob >= VALUE_MIN_PROB;
      const isFavourite = prob >= FAV_MIN_PROB && realOdds >= FAV_MIN_ODDS;
      if (!isValue && !isFavourite) continue;
      candidates.push({
        market: e.market as MarketType, marketLabel: e.marketLabel, outcome: e.outcome, label: e.label,
        probability: round(prob), odds: realOdds, impliedProbability: implied, valueEdge: edge,
        isPrimary: false, _support: e.support,
      });
    } else {
      if (NO_ODDS_INELIGIBLE.has(e.market) || prob < NO_ODDS_MIN_PROB) continue;
      candidates.push({
        market: e.market as MarketType, marketLabel: e.marketLabel, outcome: e.outcome, label: e.label,
        probability: round(prob), odds: null, impliedProbability: null, valueEdge: null,
        isPrimary: false, _support: e.support,
      });
    }
  }

  // Сила = перевес (value) + бонус за поддержку моделей + бонус за вероятность.
  // Так согласованная value-ставка (на угловые/карточки/тотал) выходит наверх,
  // а низкий фаворит без перевеса — нет. Ставки без коэф. — в конце.
  const strength = (b: BetPick & { _support: number }) =>
    (b.valueEdge ?? 0) + 0.05 * b._support + 0.06 * (b.probability - 0.5);
  candidates.sort((a, b) => {
    const av = a.valueEdge != null;
    const bv = b.valueEdge != null;
    if (av && bv) return strength(b) - strength(a);
    if (av) return -1;
    if (bv) return 1;
    return strength(b) - strength(a);
  });

  // Не больше одной ставки на рынок: берём сильнейшее направление/линию, иначе
  // в блоке появлялись бы противоположные исходы одного рынка (Меньше и Больше).
  const top3: BetPick[] = [];
  const usedMarkets = new Set<string>();
  for (const c of candidates) {
    if (usedMarkets.has(c.market)) continue;
    usedMarkets.add(c.market);
    const { _support, ...b } = c;
    top3.push(b as BetPick);
    if (top3.length === 3) break;
  }
  if (top3[0]) top3[0].isPrimary = true;
  return top3;
}

// Пояснение для случая «нормальной ставки нет» — показываем вместо рекомендации.
function buildRiskNote(agg: Aggregated): string {
  const best = agg.markets
    .map((m) => (m.outcomes.length ? m.outcomes.reduce((b, o) => (o.probability > b.probability ? o : b)) : null))
    .filter((o): o is NonNullable<typeof o> => o !== null)
    .sort((a, b) => b.probability - a.probability)[0];
  const hint = best
    ? ` Самый вероятный исход — «${best.label}» (${Math.round(best.probability * 100)}%), но по нему нет приемлемого сочетания коэффициента и перевеса.`
    : '';
  return (
    'Проанализировали всю линию — исход, двойной шанс, тоталы голов и индивидуальные, обе забьют, ' +
    'угловые, карточки — но нигде нет ставки с нормальным коэффициентом (1.5–6.0), перевесом (от 5%) ' +
    `и вероятностью прохода. Такой матч лучше пропустить.${hint}`
  );
}

// ── Pure aggregation (all markets the ensemble returned → PredictionDetail) ──

interface ParsedModel {
  modelId: string;
  parsed: LlmResponse | null;
  error: string | null;
}

function parseWithModel(results: ModelCallResult[]): ParsedModel[] {
  return results.map((r) => {
    if (r.error) return { modelId: r.modelId, parsed: null, error: r.error };
    try {
      return { modelId: r.modelId, parsed: llmPredictionResponseSchema.parse(JSON.parse(extractJson(r.content))), error: null };
    } catch (err) {
      return { modelId: r.modelId, parsed: null, error: err instanceof Error ? err.message.slice(0, 200) : 'parse error' };
    }
  });
}

// Прогноз каждой модели по итоговому рынку/исходу: её вероятность, собственный
// выбор, согласие с итогом и индивидуальное обоснование.
function buildModelViews(parsed: ParsedModel[], recMarket: string, recOutcome: string): ModelForecast[] {
  return parsed.map((pm) => {
    if (!pm.parsed) {
      return { modelId: pm.modelId, probability: null, ownMarket: null, ownOutcomeLabel: null, confidence: null, agreed: false, rationale: null, error: pm.error };
    }
    const r = pm.parsed;
    let probability: number | null = null;
    let agreed = false;
    const mkt = r.markets.find((m) => m.market === recMarket);
    const out = mkt?.outcomes.find((o) => o.outcome === recOutcome);
    if (out && mkt) {
      probability = round(out.probability);
      const maxProb = Math.max(...mkt.outcomes.map((o) => o.probability));
      agreed = out.probability >= maxProb - 1e-9;
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

const OUTCOME_NAMES: Record<string, string> = {
  '1': 'П1', X: 'Ничья', '2': 'П2', '1X': '1X', '12': '12', X2: 'X2',
  yes: 'Да', no: 'Нет', over: 'Больше', under: 'Меньше',
};
function labelFor(market: string, outcome: string): string {
  const o = OUTCOME_NAMES[outcome] ?? outcome;
  if (market === '1X2') return o;
  const m = (MARKET_LABELS as Record<string, string>)[market] ?? market;
  return `${m} — ${o}`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// Достаём первый СБАЛАНСИРОВАННЫЙ JSON-объект, игнорируя текст вокруг и после
// него (claude иногда дописывает фразу после JSON — это роняло парс). Учитываем
// строки/экранирование, чтобы не считать скобки внутри текстовых значений.
function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1]!.trim();
  const start = s.indexOf('{');
  if (start === -1) return s;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
    } else if (ch === '"') inStr = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return s.slice(start, i + 1);
  }
  return s.slice(start); // несбалансированно (обрезано) — пусть JSON.parse упадёт
}

interface Aggregated {
  markets: AggMarket[];
  recommendedMarket: string;
  recommendedOutcome: string;
  probability: number;
  confidence: number;
  stars: 1 | 2 | 3 | 4 | 5;
  modelConsensus: ModelConsensus;
  rationale: string;
  keyFactors: string[];
}

function aggregate(responses: LlmResponse[], totalAttempts: number): Aggregated {
  // Consensus probabilities for every market the models returned.
  const marketTypes = [...new Set(responses.flatMap((r) => r.markets.map((m) => m.market)))];
  const markets: AggMarket[] = [];
  for (const mt of marketTypes) {
    const m = aggregateMarket(responses, mt);
    if (m) markets.push(m);
  }

  // Recommended pick = most common (market, outcome) recommended by the models.
  const tally = new Map<string, number>();
  for (const r of responses) tally.set(`${r.recommendedMarket}|${r.recommendedOutcome}`, (tally.get(`${r.recommendedMarket}|${r.recommendedOutcome}`) ?? 0) + 1);
  let topKey = `${responses[0]!.recommendedMarket}|${responses[0]!.recommendedOutcome}`;
  let topVotes = 0;
  for (const [k, v] of tally) if (v > topVotes) { topVotes = v; topKey = k; }
  const [recMarket, recOutcome] = topKey.split('|') as [string, string];

  const recMarketAgg = markets.find((m) => m.market === recMarket);
  const recOut = recMarketAgg?.outcomes.find((o) => o.outcome === recOutcome);
  const probability = recOut?.probability ?? 0.34;

  const confidence = clamp(
    responses.reduce((s, r) => s + r.confidence, 0) / responses.length,
    0.05, 0.97,
  );
  const agreement = topVotes / responses.length;
  const level: ModelConsensus['level'] = agreement >= 0.75 ? 'high' : agreement >= 0.5 ? 'medium' : 'low';

  const rationale = responses
    .map((r) => r.rationale ?? '')
    .filter((s) => s.length > 20)
    .sort((a, b) => b.length - a.length)[0] ?? '';
  const keyFactors = [...new Set(responses.flatMap((r) => r.keyFactors ?? []).filter(Boolean))].slice(0, 5);

  // Flag the recommended outcome in its market.
  const marketsWithRec = markets.map((m) => ({
    ...m,
    outcomes: m.outcomes.map((o) => ({
      ...o,
      isRecommended: m.market === recMarket && o.outcome === recOutcome,
    })),
  }));

  return {
    markets: marketsWithRec,
    recommendedMarket: recMarket,
    recommendedOutcome: recOutcome,
    probability,
    confidence,
    stars: toStars(confidence),
    modelConsensus: {
      totalModels: totalAttempts,
      agreement,
      level,
      summary: `${topVotes} из ${responses.length} моделей за «${recOutcome}» (${recMarket})`,
    },
    rationale,
    keyFactors,
  };
}

function aggregateMarket(responses: LlmResponse[], marketType: string): AggMarket | null {
  const matching = responses
    .map((r) => r.markets.find((m) => m.market === marketType))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);
  if (!matching.length) return null;

  const labels = new Map<string, string>();
  for (const m of matching) for (const o of m.outcomes) if (!labels.has(o.outcome)) labels.set(o.outcome, o.label);

  const outcomes = [...labels.entries()].map(([outcome, label]) => {
    const probs = matching.map((m) => m.outcomes.find((o) => o.outcome === outcome)?.probability ?? 0);
    return { label, outcome, probability: probs.reduce((a, b) => a + b, 0) / probs.length, isRecommended: false };
  });
  const sum = outcomes.reduce((a, o) => a + o.probability, 0);
  if (sum <= 0) return null;

  return {
    market: marketType,
    outcomes: outcomes.map((o) => ({ ...o, probability: o.probability / sum })),
    isLocked: false,
  };
}

function toStars(c: number): 1 | 2 | 3 | 4 | 5 {
  if (c >= 0.85) return 5;
  if (c >= 0.7) return 4;
  if (c >= 0.55) return 3;
  if (c >= 0.4) return 2;
  return 1;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// "W W D L W" из последних 5 матчей команды с точки зрения teamName.
function formString(fixtures: ProviderFixture[], teamName: string): string {
  const out: string[] = [];
  for (const f of fixtures.slice(0, 5)) {
    if (f.scoreHome == null || f.scoreAway == null) continue;
    const isHome = (f.homeTeam?.name ?? '') === teamName;
    const gf = isHome ? f.scoreHome : f.scoreAway;
    const ga = isHome ? f.scoreAway : f.scoreHome;
    out.push(gf > ga ? 'W' : gf < ga ? 'L' : 'D');
  }
  return out.join(' ');
}

// Сводка очных встреч с точки зрения home team + средняя результативность.
function h2hSummary(fixtures: ProviderFixture[], homeName: string): string {
  const played = fixtures.filter((f) => f.scoreHome != null && f.scoreAway != null).slice(0, 6);
  if (!played.length) return '';
  let w = 0, d = 0, l = 0, goals = 0;
  for (const f of played) {
    const isHome = (f.homeTeam?.name ?? '') === homeName;
    const gf = (isHome ? f.scoreHome : f.scoreAway) ?? 0;
    const ga = (isHome ? f.scoreAway : f.scoreHome) ?? 0;
    if (gf > ga) w++; else if (gf < ga) l++; else d++;
    goals += (f.scoreHome ?? 0) + (f.scoreAway ?? 0);
  }
  const avg = (goals / played.length).toFixed(1);
  return `Последние ${played.length} очных: ${w}П ${d}Н ${l}П (с точки зрения ${homeName}), в среднем ${avg} гола за матч`;
}

function lineupsSummary(lineups: MatchLineupsOut, homeShort: string, awayShort: string): string {
  const side = (team: MatchLineupsOut['home'], name: string): string | null => {
    const names = (team?.startingXI ?? []).map((p) => p.name).filter(Boolean);
    if (!names.length && !team?.formation) return null;
    const formation = team?.formation ? ` (${team.formation})` : '';
    return `${name}${formation}: ${names.slice(0, 11).join(', ') || '—'}`;
  };
  const home = side(lineups.home, homeShort);
  const away = side(lineups.away, awayShort);
  const parts = [home, away].filter(Boolean) as string[];
  if (!parts.length) return '';
  return `Составы. ${parts.join('. ')}`;
}
