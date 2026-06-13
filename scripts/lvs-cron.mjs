// Serverless «бэкенд» ЛВС для GitHub Actions: без NestJS и Postgres.
// Читает apps/web/public/data/lvs-fixtures.json (LvsDay[]) и:
//   • анализирует матчи в окне T-60 мин (ансамбль laozhang), если прогноза ещё нет;
//   • сводит завершённые матчи с фактом (счёт + авторы голов из API-Football);
//   • перезаписывает fixtures+history JSON. Изменения коммитит workflow.
// Ключи берутся из окружения (GitHub Secrets): LAOZHANG_API_KEY, API_FOOTBALL_KEY.
// Логика анализа/агрегации зеркалит apps/api/src/lvs/lvs.service.ts.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
// Подключаем собранный dist напрямую (CJS) — workspace-пакет не виден из scripts/.
// В GitHub Action shared собирается (pnpm --filter @ai-score/shared build) до запуска.
import shared from '../packages/shared/dist/index.js';
const {
  LaozhangClient,
  buildLvsSystemPrompt,
  buildLvsUserPrompt,
  lvsPredictionResponseSchema,
  championResponseSchema,
  buildChampionSystemPrompt,
  buildChampionUserPrompt,
  settleLvs,
  settlePrediction,
  mergeScorers,
  romanizeNormalized,
  isLatinName,
  parseJsonLoose,
  // Полный прогноз для вкладки «Матчи» (рынки: 1X2/тоталы/угловые/карточки/…).
  buildSystemPrompt,
  buildUserPrompt,
  llmPredictionResponseSchema,
  MARKET_LABELS,
} = shared;

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FIXTURES_PATH = resolve(ROOT, 'apps/web/public/data/lvs-fixtures.json');
const HISTORY_PATH = resolve(ROOT, 'apps/web/public/data/lvs-history.json');
const WC_PATH = resolve(ROOT, 'apps/web/public/data/wc-schedule.json');
const PRED_PATH = resolve(ROOT, 'apps/web/public/data/predictions.json');
const PRED_HISTORY_PATH = resolve(ROOT, 'apps/web/public/data/predictions-history.json');
const TOURN_PATH = resolve(ROOT, 'apps/web/public/data/lvs-tournament.json');

const AF_BASE = 'https://v3.football.api-sports.io';
const LZ_BASE = process.env.LAOZHANG_BASE_URL ?? 'https://api.laozhang.ai/v1';
const DEFAULT_MODELS = ['gpt-5.1', 'grok-4', 'claude-opus-4-8', 'deepseek-chat'];
const SYNTH_MODEL = 'gemini-2.5-flash-nothinking';
const ANALYSIS_LEAD_MS = 60 * 60 * 1000; // окно анализа: ≤60 мин до старта
const FORCE_FALLBACK_MS = 25 * 60 * 1000; // нет составов к T-25 → форсируем (даём составам появиться)

const LZ_KEY = process.env.LAOZHANG_API_KEY ?? '';
const AF_KEY = process.env.API_FOOTBALL_KEY ?? '';
const MODELS = (process.env.LVS_MODELS ?? DEFAULT_MODELS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);

// ── API-Football (прямые вызовы, экономно — лимит 100 req/день) ──────────────
async function af(path) {
  if (!AF_KEY) return null;
  try {
    const res = await fetch(`${AF_BASE}${path}`, { headers: { 'x-apisports-key': AF_KEY }, signal: AbortSignal.timeout(12000) });
    if (!res.ok) { console.warn(`API-Football ${res.status} on ${path}`); return null; }
    return await res.json();
  } catch (e) { console.warn(`API-Football fetch failed ${path}: ${e?.message ?? e}`); return null; }
}

async function afLineups(fixtureId) {
  const data = await af(`/fixtures/lineups?fixture=${fixtureId}`);
  const teams = data?.response ?? [];
  if (teams.length < 2) return null;
  const map = (t) => ({
    formation: t.formation ?? '',
    coach: t.coach?.name ?? null,
    startingXI: (t.startXI ?? []).map((e) => ({
      id: String(e.player.id), name: e.player.name, number: e.player.number ?? null, position: e.player.pos ?? null,
    })),
  });
  return { home: map(teams[0]), away: map(teams[1]) };
}

async function afScore(fixtureId) {
  const data = await af(`/fixtures?id=${fixtureId}`);
  const f = (data?.response ?? [])[0];
  if (!f) return null;
  const finished = ['FT', 'AET', 'PEN'].includes(f.fixture.status.short);
  return { finished, homeGoals: f.goals.home, awayGoals: f.goals.away };
}

// Угловые и карточки матча (для сведения рынков CORNERS_OU/CARDS_OU).
// Возвращает {corners,cards} — суммарно по обеим командам; null, если данных нет.
async function afStats(fixtureId) {
  const data = await af(`/fixtures/statistics?fixture=${fixtureId}`);
  const teams = data?.response ?? [];
  if (!teams.length) return { corners: null, cards: null };
  let corners = null, cards = null;
  for (const t of teams) {
    for (const s of t.statistics ?? []) {
      const v = typeof s.value === 'number' ? s.value : parseInt(s.value, 10);
      if (Number.isNaN(v)) continue;
      if (s.type === 'Corner Kicks') corners = (corners ?? 0) + v;
      else if (s.type === 'Yellow Cards' || s.type === 'Red Cards') cards = (cards ?? 0) + v;
    }
  }
  return { corners, cards };
}

async function afGoalscorers(fixtureId) {
  const data = await af(`/fixtures/events?fixture=${fixtureId}`);
  return (data?.response ?? [])
    .filter((e) => e.type === 'Goal' && e.detail !== 'Missed Penalty' && e.detail !== 'Own Goal')
    .map((e) => e.player?.name ?? '').filter(Boolean);
}

// ── pure helpers (зеркало lvs.service.ts) ───────────────────────────────────
const round = (n) => Math.round(n * 1000) / 1000;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const toStars = (c) => (c >= 0.85 ? 5 : c >= 0.7 ? 4 : c >= 0.55 ? 3 : c >= 0.4 ? 2 : 1);
const outcomeFromScore = (h, a) => (h > a ? '1' : h < a ? '2' : 'X');
const outcomeLabel = (o) => (o === '1' ? 'П1' : o === '2' ? 'П2' : 'Ничья');
const posCodeRu = (c) => ({ G: 'вр', D: 'защ', M: 'пз', F: 'нап' }[String(c).trim().toUpperCase()[0]] ?? c);

function parseWithModel(results) {
  return results.map((r) => {
    if (r.error) return { modelId: r.modelId, parsed: null, error: r.error };
    try {
      return { modelId: r.modelId, parsed: lvsPredictionResponseSchema.parse(parseJsonLoose(r.content)), error: null };
    } catch (e) { return { modelId: r.modelId, parsed: null, error: (e?.message ?? 'parse error').slice(0, 200) }; }
  });
}

function buildModelViews(parsed) {
  return parsed.map((pm) => {
    if (!pm.parsed) return { modelId: pm.modelId, outcome: null, scoreHome: null, scoreAway: null, scorers: [], confidence: null, rationale: null, rationaleEn: null, error: pm.error };
    const r = pm.parsed;
    return { modelId: pm.modelId, outcome: r.outcome, scoreHome: r.score.home, scoreAway: r.score.away, scorers: r.scorers.map((s) => s.name), confidence: round(r.confidence), rationale: r.rationale || null, rationaleEn: r.rationaleEn || null, error: null };
  });
}

function aggregate(responses) {
  const n = responses.length;
  let win1 = 0, draw = 0, win2 = 0;
  for (const r of responses) { win1 += r.probs.win1; draw += r.probs.draw; win2 += r.probs.win2; }
  const sum = win1 + draw + win2 || 1;
  const probs = { win1: round(win1 / sum), draw: round(draw / sum), win2: round(win2 / sum) };
  let outcome = probs.win1 >= probs.draw && probs.win1 >= probs.win2 ? '1' : probs.win2 >= probs.draw ? '2' : 'X';

  // Счёт ДОЛЖЕН быть согласован с исходом (иначе карточка вида «П1 1:1»): берём
  // самый частый счёт среди согласованных с исходом; если таких нет — оставляем
  // общую моду и выводим исход из неё.
  const tally = new Map();
  for (const r of responses) { const k = `${r.score.home}:${r.score.away}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
  let consistentBest = null, consistentVotes = 0;
  let overallBest = `${responses[0].score.home}:${responses[0].score.away}`, overallVotes = 0;
  for (const [k, v] of tally) {
    if (v > overallVotes) { overallVotes = v; overallBest = k; }
    const [h, a] = k.split(':').map(Number);
    if (outcomeFromScore(h, a) === outcome && v > consistentVotes) { consistentVotes = v; consistentBest = k; }
  }
  let bestScore;
  if (consistentBest) {
    bestScore = consistentBest;
  } else {
    bestScore = overallBest;
    const [h, a] = bestScore.split(':').map(Number);
    outcome = outcomeFromScore(h, a);
  }
  const [sh, sa] = bestScore.split(':').map(Number);

  // Слияние бомбардиров с унификацией алфавита (латиница, без дублей кир/лат).
  const merged = mergeScorers(responses.flatMap((r) => r.scorers));
  const total = merged.reduce((a, b) => a + b.weight, 0) || 1;
  const scorers = merged.sort((a, b) => b.weight - a.weight).slice(0, 3)
    .map((s) => ({ name: s.name, team: s.team, position: s.position, probability: round(Math.min(0.95, s.weight / total + 0.2)) }));

  const confidence = clamp(responses.reduce((s, r) => s + r.confidence, 0) / n, 0.05, 0.97);
  // Берём самое развёрнутое обоснование и его английскую пару (от той же модели).
  const best = responses.filter((r) => (r.rationale ?? '').length > 20).sort((a, b) => (b.rationale?.length ?? 0) - (a.rationale?.length ?? 0))[0];
  const rationale = best?.rationale ?? '';
  const rationaleEn = best?.rationaleEn ?? '';
  return { outcome, probs, score: { home: sh, away: sa }, scorers, confidence, stars: toStars(confidence), rationale, rationaleEn };
}

function lineupsSummary(lineups, homeShort, awayShort) {
  const side = (t, name) => {
    const players = (t?.startingXI ?? []).filter((p) => p.name).map((p) => (p.position ? `${p.name} (${posCodeRu(p.position)})` : p.name));
    if (!players.length && !t?.formation) return null;
    return `${name}${t?.formation ? ` (${t.formation})` : ''}: ${players.slice(0, 11).join(', ') || '—'}`;
  };
  return [side(lineups.home, homeShort), side(lineups.away, awayShort)].filter(Boolean).join('. ');
}

// ── анализ одного матча ──────────────────────────────────────────────────────
// lineups: объект составов или null; phase: 'preliminary' | 'final'.
async function runAnalysis(client, fixture, lineups, phase) {
  const home = fixture.homeTeam, away = fixture.awayTeam;
  const ctx = {
    homeTeam: home.name, awayTeam: away.name,
    homeTeamShort: home.shortName || home.name, awayTeamShort: away.shortName || away.name,
    league: 'FIFA World Cup 2026', country: 'International', round: fixture.round,
    date: new Date(fixture.startsAt).toISOString().slice(0, 10),
  };
  if (lineups) ctx.lineups = lineupsSummary(lineups, ctx.homeTeamShort, ctx.awayTeamShort);

  const results = await client.fanOut(MODELS, [
    { role: 'system', content: buildLvsSystemPrompt() },
    { role: 'user', content: buildLvsUserPrompt(ctx) },
  ]);
  const parsed = parseWithModel(results);
  const valid = parsed.filter((p) => p.parsed).map((p) => p.parsed);
  if (!valid.length) { console.warn(`  ${fixture.id}: все модели без ответа`); return null; }

  const agg = aggregate(valid);
  const modelViews = buildModelViews(parsed);
  const { summary, summaryEn } = await synthesize(client, ctx, agg, modelViews);

  return {
    fixtureId: fixture.id,
    phase,
    outcome: agg.outcome, outcomeLabel: outcomeLabel(agg.outcome),
    probs: agg.probs, score: agg.score, scorers: agg.scorers,
    confidence: agg.confidence, stars: agg.stars,
    rationale: agg.rationale || null, rationaleEn: agg.rationaleEn || null,
    summary, summaryEn, odds: null,
    modelViews, lineups: lineups ?? null,
    status: 'pending', result: null,
    createdAt: new Date().toISOString(), resolvedAt: null,
  };
}

// Синтез общего вывода. Один вызов возвращает оба языка (ru + en) — без
// отдельного запроса перевода.
async function synthesize(client, ctx, agg, views) {
  const opinions = views.filter((v) => !v.error).map((v) => {
    const sc = v.scoreHome != null ? ` ${v.scoreHome}:${v.scoreAway}` : '';
    const pl = v.scorers.length ? `, голы: ${v.scorers.join(', ')}` : '';
    return `- ${v.modelId}: исход «${v.outcome ?? '—'}»${sc}${pl}`;
  }).join('\n');
  if (!opinions) return { summary: null, summaryEn: null };
  const decision = `Итог: исход «${agg.outcome}», счёт ${agg.score.home}:${agg.score.away}, забьют: ${agg.scorers.map((s) => s.name).join(', ')}.`;
  const res = await client.complete({
    model: SYNTH_MODEL,
    messages: [
      { role: 'system', content: 'Объедини прогнозы AI-моделей в один краткий вывод (2–3 предложения), без markdown. Имена игроков латиницей. Верни ТОЛЬКО JSON {"ru":"вывод на русском","en":"the same conclusion in English"} — оба языка в одном ответе.' },
      { role: 'user', content: `${ctx.homeTeam} — ${ctx.awayTeam}.\nМодели:\n${opinions}\n${decision}\nВ чём модели согласны/расходятся и почему такой прогноз.` },
    ],
    max_tokens: 500, temperature: 0.3,
  });
  if (res.error || !res.content.trim()) return { summary: null, summaryEn: null };
  try {
    const j = parseJsonLoose(res.content);
    return { summary: (j.ru ?? '').trim().slice(0, 600) || null, summaryEn: (j.en ?? '').trim().slice(0, 600) || null };
  } catch {
    // На случай, если модель вернула просто текст — кладём его как русский.
    return { summary: res.content.trim().slice(0, 600), summaryEn: null };
  }
}

// ── сеттлмент одного матча ───────────────────────────────────────────────────
async function settle(fixture, pred) {
  const score = await afScore(fixture.id);
  if (!score?.finished || score.homeGoals == null || score.awayGoals == null) return false;
  const scorerNames = await afGoalscorers(fixture.id);
  const s = settleLvs(
    { outcome: pred.outcome, scoreHome: pred.score.home, scoreAway: pred.score.away, scorers: pred.scorers },
    { homeGoals: score.homeGoals, awayGoals: score.awayGoals, scorers: scorerNames },
  );
  pred.status = 'resolved';
  pred.result = s;
  pred.resolvedAt = new Date().toISOString();
  fixture.status = 'finished';
  fixture.score = { home: score.homeGoals, away: score.awayGoals };
  return true;
}

// ── history из разрешённых прогнозов ─────────────────────────────────────────
function buildHistory(days) {
  const items = [];
  for (const day of days) for (const f of day.fixtures) {
    const p = f.prediction;
    if (!p || p.status !== 'resolved' || !p.result) continue;
    items.push({
      fixtureId: f.id,
      match: `${f.homeTeam.name} — ${f.awayTeam.name}`,
      homeTeam: f.homeTeam, awayTeam: f.awayTeam,
      kickoff: f.startsAt, resolvedAt: p.resolvedAt,
      predictedOutcome: p.outcome, predictedOutcomeLabel: outcomeLabel(p.outcome),
      actualOutcome: p.result.actualOutcome, actualOutcomeLabel: outcomeLabel(p.result.actualOutcome),
      predictedScore: p.score, actualScore: p.result.actualScore,
      scorers: p.result.scorers, actualScorers: p.result.actualScorers ?? [],
      resultStatus: p.result.resultStatus,
    });
  }
  return items.sort((a, b) => (b.resolvedAt ?? '').localeCompare(a.resolvedAt ?? ''));
}

// История «Матчи» (PredictionHistoryItem[]) из predictions.json — статический
// фолбэк для вкладки «Трек-рекорд» (бэкенда на Pages нет). Зеркало
// predictions.service.getHistory, но без коэффициентов: betResult — по основному
// рынку из settlement, odds/profit = null (линии на статике нет).
function buildPredHistory(preds, fixtureById) {
  const items = [];
  for (const [idStr, p] of Object.entries(preds)) {
    const id = Number(idStr);
    const fx = fixtureById.get(id);
    if (!fx) continue; // матча нет в расписании (напр., снятый тестовый) — пропускаем
    const markets = p.markets ?? [];
    const recMkt = markets.find((m) => m.market === p.recommendedMarket);
    const recOut = recMkt?.outcomes.find((o) => o.outcome === p.recommendedOutcome);
    const s = p.settlement ?? null;
    let betResult = 'pending';
    if (p.status === 'resolved' && s) {
      const st = s.mainCheck?.status ?? s.mainStatus;
      betResult = st === 'won' ? 'won' : st === 'push' ? 'push' : st === 'lost' ? 'lost' : 'pending';
    }
    items.push({
      fixtureId: id,
      match: `${fx.homeTeam.name} — ${fx.awayTeam.name}`,
      league: 'FIFA World Cup 2026',
      kickoff: fx.startsAt,
      createdAt: p.createdAt,
      status: p.status,
      market: p.recommendedMarket,
      pick: recOut?.label ?? labelFor(p.recommendedMarket, p.recommendedOutcome),
      probability: p.probability,
      stars: p.stars ?? 1,
      odds: null,
      betResult,
      profit: null,
      finalScore: s?.finalScore ?? null,
      verdict: s?.overall ?? null,
      wonCount: s?.wonCount ?? null,
      total: s?.total ?? null,
    });
  }
  return items.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
}

// ── ПОЛНЫЙ прогноз для вкладки «Матчи» (рынки) ───────────────────────────────
// Зеркало apps/api/src/predictions/ai-analysis.service.ts, без коэффициентов и
// value-ставок (на статике нет букмекерской линии): отдаём рынки + рекомендацию.
const OUTCOME_NAMES = { '1': 'П1', X: 'Ничья', '2': 'П2', '1X': '1X', '12': '12', X2: 'X2', yes: 'Да', no: 'Нет', over: 'Больше', under: 'Меньше' };
function labelFor(market, outcome) {
  const o = OUTCOME_NAMES[outcome] ?? outcome;
  if (market === '1X2') return o;
  return `${MARKET_LABELS[market] ?? market} — ${o}`;
}

function parsePred(results) {
  return results.map((r) => {
    if (r.error) return { modelId: r.modelId, parsed: null, error: r.error };
    try {
      return { modelId: r.modelId, parsed: llmPredictionResponseSchema.parse(parseJsonLoose(r.content)), error: null };
    } catch (e) { return { modelId: r.modelId, parsed: null, error: (e?.message ?? 'parse error').slice(0, 200) }; }
  });
}

function aggregateMarketFull(responses, marketType) {
  const matching = responses.map((r) => r.markets.find((m) => m.market === marketType)).filter(Boolean);
  if (!matching.length) return null;
  const labels = new Map();
  for (const m of matching) for (const o of m.outcomes) if (!labels.has(o.outcome)) labels.set(o.outcome, o.label);
  const outcomes = [...labels.entries()].map(([outcome, label]) => {
    const probs = matching.map((m) => m.outcomes.find((o) => o.outcome === outcome)?.probability ?? 0);
    return { label, outcome, probability: probs.reduce((a, b) => a + b, 0) / probs.length, isRecommended: false };
  });
  const sum = outcomes.reduce((a, o) => a + o.probability, 0);
  if (sum <= 0) return null;
  return { market: marketType, outcomes: outcomes.map((o) => ({ ...o, probability: round(o.probability / sum) })), isLocked: false };
}

function aggregateFull(responses, totalAttempts) {
  const types = [...new Set(responses.flatMap((r) => r.markets.map((m) => m.market)))];
  const markets = types.map((t) => aggregateMarketFull(responses, t)).filter(Boolean);

  const tally = new Map();
  for (const r of responses) { const k = `${r.recommendedMarket}|${r.recommendedOutcome}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
  let topKey = `${responses[0].recommendedMarket}|${responses[0].recommendedOutcome}`, topVotes = 0;
  for (const [k, v] of tally) if (v > topVotes) { topVotes = v; topKey = k; }
  const [recMarket, recOutcome] = topKey.split('|');

  const recOut = markets.find((m) => m.market === recMarket)?.outcomes.find((o) => o.outcome === recOutcome);
  const probability = recOut?.probability ?? 0.34;
  const confidence = clamp(responses.reduce((s, r) => s + r.confidence, 0) / responses.length, 0.05, 0.97);
  const agreement = topVotes / responses.length;
  const level = agreement >= 0.75 ? 'high' : agreement >= 0.5 ? 'medium' : 'low';
  const rationale = responses.map((r) => r.rationale ?? '').filter((s) => s.length > 20).sort((a, b) => b.length - a.length)[0] ?? '';
  const keyFactors = [...new Set(responses.flatMap((r) => r.keyFactors ?? []).filter(Boolean))].slice(0, 5);

  const marketsRec = markets.map((m) => ({
    ...m,
    outcomes: m.outcomes.map((o) => ({ ...o, isRecommended: m.market === recMarket && o.outcome === recOutcome })),
  }));
  return {
    markets: marketsRec, recommendedMarket: recMarket, recommendedOutcome: recOutcome, probability,
    confidence, stars: toStars(confidence),
    modelConsensus: { totalModels: totalAttempts, agreement: round(agreement), level, summary: `${topVotes} из ${responses.length} моделей за «${recOutcome}» (${recMarket})` },
    rationale, keyFactors,
  };
}

function buildPredModelViews(parsed, recMarket, recOutcome) {
  return parsed.map((pm) => {
    if (!pm.parsed) return { modelId: pm.modelId, probability: null, ownMarket: null, ownOutcomeLabel: null, confidence: null, agreed: false, rationale: null, error: pm.error };
    const r = pm.parsed;
    const mkt = r.markets.find((m) => m.market === recMarket);
    const out = mkt?.outcomes.find((o) => o.outcome === recOutcome);
    let probability = null, agreed = false;
    if (out && mkt) { probability = round(out.probability); agreed = out.probability >= Math.max(...mkt.outcomes.map((o) => o.probability)) - 1e-9; }
    return { modelId: pm.modelId, probability, ownMarket: r.recommendedMarket, ownOutcomeLabel: labelFor(r.recommendedMarket, r.recommendedOutcome), confidence: round(r.confidence), agreed, rationale: r.rationale ?? null, error: null };
  });
}

async function runMatchAnalysis(client, fixture) {
  const home = fixture.homeTeam, away = fixture.awayTeam;
  const ctx = {
    homeTeam: home.name, awayTeam: away.name,
    homeTeamShort: home.shortName || home.name, awayTeamShort: away.shortName || away.name,
    league: 'FIFA World Cup 2026', country: 'International', round: fixture.round,
    date: new Date(fixture.startsAt).toISOString().slice(0, 10),
  };
  const results = await client.fanOut(MODELS, [
    { role: 'system', content: buildSystemPrompt() },
    { role: 'user', content: buildUserPrompt(ctx) },
  ]);
  const parsed = parsePred(results);
  const valid = parsed.filter((p) => p.parsed).map((p) => p.parsed);
  if (!valid.length) { console.warn(`  ${fixture.id}: полный анализ — нет ответов`); return null; }
  const agg = aggregateFull(valid, results.length);
  const models = buildPredModelViews(parsed, agg.recommendedMarket, agg.recommendedOutcome);
  return {
    fixtureId: fixture.id, createdAt: new Date().toISOString(), status: 'pending',
    markets: agg.markets, recommendedMarket: agg.recommendedMarket, recommendedOutcome: agg.recommendedOutcome,
    probability: agg.probability, confidence: agg.confidence, stars: agg.stars,
    modelConsensus: agg.modelConsensus, rationale: agg.rationale || null, keyFactors: agg.keyFactors,
    valueEdge: null, impliedProbability: null, selectedBets: null, riskNote: null,
    outcome: null, models, summary: null, settlement: null, isLocked: false, lockedFields: [],
  };
}

// ── обновление расписания ЧМ (вкладка «Матчи») ───────────────────────────────
// 1 bulk-запрос к API-Football, только когда есть активный матч (экономия квоты).
const wcStatus = (short) =>
  ['FT', 'AET', 'PEN'].includes(short) ? 'finished'
    : ['NS', 'TBD', 'PST', 'CANC', 'SUSP'].includes(short) ? 'scheduled' : 'live';

async function refreshWcSchedule(now) {
  if (!AF_KEY || !existsSync(WC_PATH)) return false;
  const days = JSON.parse(readFileSync(WC_PATH, 'utf8'));
  const active = days.some((d) => d.fixtures.some((f) => {
    const ko = new Date(f.startsAt).getTime();
    return f.status !== 'finished' && ko <= now + 15 * 60000 && ko >= now - 3 * 60 * 60000;
  }));
  if (!active) return false; // нет матчей в активном окне — не тратим запрос

  const data = await af('/fixtures?league=1&season=2026');
  const resp = data?.response ?? [];
  if (!resp.length) return false;
  const byId = new Map(resp.map((x) => [x.fixture.id, x]));

  let changed = false;
  for (const d of days) for (const f of d.fixtures) {
    const x = byId.get(f.id);
    if (!x) continue;
    const status = wcStatus(x.fixture.status.short);
    const score = x.goals.home != null && x.goals.away != null ? { home: x.goals.home, away: x.goals.away } : null;
    const minute = x.fixture.status.elapsed ?? null;
    if (f.status !== status || JSON.stringify(f.score) !== JSON.stringify(score) || f.minute !== minute) {
      f.status = status; f.score = score; f.minute = minute; changed = true;
    }
  }
  if (changed) writeFileSync(WC_PATH, JSON.stringify(days));
  return changed;
}

// ── разовый прогноз турнира: чемпион + лучший бомбардир ───────────────────────
// Считается ОДИН раз: если файл уже с чемпионом — не пересчитываем.
async function ensureTournamentPrediction(client) {
  if (existsSync(TOURN_PATH)) {
    try { const cur = JSON.parse(readFileSync(TOURN_PATH, 'utf8')); if (cur && cur.champion) return false; } catch { /* перегенерируем */ }
  }
  const results = await client.fanOut(MODELS, [
    { role: 'system', content: buildChampionSystemPrompt() },
    { role: 'user', content: buildChampionUserPrompt() },
  ]);
  const parsed = results.map((r) => {
    if (r.error) return { modelId: r.modelId, parsed: null, error: r.error };
    try { return { modelId: r.modelId, parsed: championResponseSchema.parse(parseJsonLoose(r.content)), error: null }; }
    catch (e) { return { modelId: r.modelId, parsed: null, error: (e?.message ?? 'parse error').slice(0, 200) }; }
  });
  const valid = parsed.filter((p) => p.parsed);
  if (!valid.length) { console.warn('Турнирный прогноз: нет валидных ответов'); return false; }
  const total = valid.length;

  // Чемпион: голоса по нормализованному имени команды.
  const champTally = new Map();
  for (const p of valid) {
    const t = (p.parsed.champion ?? '').trim(); if (!t) continue;
    const k = t.toLowerCase();
    const e = champTally.get(k);
    if (e) { e.votes++; if (!isLatinName(e.name) && isLatinName(t)) e.name = t; }
    else champTally.set(k, { name: t, votes: 1 });
  }
  const championContenders = [...champTally.values()].sort((a, b) => b.votes - a.votes)
    .map((c) => ({ name: c.name, votes: c.votes, probability: round(c.votes / total) }));
  const champion = championContenders[0]?.name ?? '';

  // Лучший бомбардир: дедуп по фамилии (романизация), латинское имя + сборная.
  const scTally = new Map();
  for (const p of valid) {
    const nm = (p.parsed.topScorer?.name ?? '').trim(); if (!nm) continue;
    const team = (p.parsed.topScorer?.team ?? '').trim() || null;
    const r = romanizeNormalized(nm);
    const key = r.split(' ').filter((x) => x.length >= 4).pop() || r;
    const e = scTally.get(key);
    if (e) { e.votes++; if (!e.team && team) e.team = team; if (!isLatinName(e.name) && isLatinName(nm)) e.name = nm; }
    else scTally.set(key, { name: nm, team, votes: 1 });
  }
  const topScorerContenders = [...scTally.values()].sort((a, b) => b.votes - a.votes)
    .map((s) => ({ name: s.name, team: s.team, votes: s.votes, probability: round(s.votes / total) }));
  const top = topScorerContenders[0] ?? { name: '', team: null };

  // Синтез вывода: один вызов, оба языка.
  let summary = null, summaryEn = null;
  const opinions = valid.map((p) => `- ${p.modelId}: чемпион ${p.parsed.champion}, бомбардир ${p.parsed.topScorer?.name ?? '—'}`).join('\n');
  try {
    const res = await client.complete({
      model: SYNTH_MODEL,
      messages: [
        { role: 'system', content: 'Объедини прогнозы AI-моделей на ЧМ-2026 в краткий вывод (2–3 предложения), без markdown. Имена команд и игроков латиницей. Верни ТОЛЬКО JSON {"ru":"вывод на русском","en":"the same in English"}.' },
        { role: 'user', content: `Прогноз на ЧМ-2026.\nМодели:\n${opinions}\nИтог ансамбля: чемпион ${champion}, лучший бомбардир ${top.name}. В чём модели согласны/расходятся.` },
      ],
      max_tokens: 500, temperature: 0.3,
    });
    if (!res.error && res.content.trim()) {
      const j = parseJsonLoose(res.content);
      summary = (j.ru ?? '').trim().slice(0, 600) || null;
      summaryEn = (j.en ?? '').trim().slice(0, 600) || null;
    }
  } catch (e) { console.warn(`  синтез турнира упал: ${e?.message ?? e}`); }

  const modelViews = parsed.map((p) => p.parsed
    ? { modelId: p.modelId, champion: p.parsed.champion || null, topScorer: p.parsed.topScorer?.name || null, topScorerTeam: p.parsed.topScorer?.team || null, rationale: p.parsed.rationale || null, rationaleEn: p.parsed.rationaleEn || null, error: null }
    : { modelId: p.modelId, champion: null, topScorer: null, topScorerTeam: null, rationale: null, rationaleEn: null, error: p.error });

  writeFileSync(TOURN_PATH, JSON.stringify({
    generatedAt: new Date().toISOString(),
    champion, championContenders,
    topScorer: top.name, topScorerTeam: top.team, topScorerContenders,
    summary, summaryEn, modelViews,
  }));
  console.log(`Турнирный прогноз: чемпион ${champion}, бомбардир ${top.name} (${valid.length}/${results.length} моделей)`);
  return true;
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(FIXTURES_PATH)) { console.error(`нет ${FIXTURES_PATH}`); process.exit(1); }
  if (!LZ_KEY) console.warn('LAOZHANG_API_KEY не задан — анализ пропускается');
  if (!AF_KEY) console.warn('API_FOOTBALL_KEY не задан — составы/сеттлмент пропускаются');

  const days = JSON.parse(readFileSync(FIXTURES_PATH, 'utf8'));
  const client = new LaozhangClient(LZ_KEY, LZ_BASE, 120000);
  const now = Date.now();
  let changed = 0;
  let prelimDone = 0; // лимит предварительных анализов за один прогон (LLM-нагрузка)
  const PRELIM_CAP = 6;

  for (const day of days) for (const f of day.fixtures) {
    const ko = new Date(f.startsAt).getTime();
    const msToKo = ko - now;
    const p = f.prediction;
    const inFinalWindow = msToKo > 0 && msToKo <= ANALYSIS_LEAD_MS; // ≤60 мин до старта
    const name = `${f.homeTeam.name} — ${f.awayTeam.name}`;

    if (LZ_KEY && msToKo > 0) {
      // ── ФИНАЛЬНЫЙ анализ за час до матча: по составам, заменяет предварительный ──
      // Также покрывает случай «прогноза ещё нет, а матч уже в окне T-60».
      // lineupless — форсированный финал БЕЗ составов: пересчитываем, как только
      // составы появятся (апгрейд). Иначе финал, сделанный форсом за T-25, навсегда
      // оставался бы без составов, даже если их опубликовали позже.
      const lineupless = !!(p && p.phase === 'final' && !p.lineups);
      if (inFinalWindow && (!p || p.phase !== 'final' || lineupless)) {
        const lineups = await afLineups(f.id);
        const force = msToKo <= FORCE_FALLBACK_MS;
        if (lineups) {
          // Лучший случай: финал ПО СОСТАВАМ (в т.ч. апгрейд форс-финала без составов).
          console.log(`Финальный анализ: ${name} (T-${Math.round(msToKo / 60000)}мин, составы: да${lineupless ? ', апгрейд' : ''})`);
          try {
            const pred = await runAnalysis(client, f, lineups, 'final');
            if (pred) { f.prediction = pred; changed++; console.log(`  ✓ финал: ${pred.outcomeLabel} ${pred.score.home}:${pred.score.away}`); }
          } catch (e) { console.warn(`  финальный анализ упал: ${e?.message ?? e}`); }
        } else if (force && !lineupless) {
          // Составов так и нет, близко к старту, финала ещё не было → форс без составов (один раз).
          console.log(`Финальный анализ (форс, без составов): ${name} (T-${Math.round(msToKo / 60000)}мин)`);
          try {
            const pred = await runAnalysis(client, f, null, 'final');
            if (pred) { f.prediction = pred; changed++; console.log(`  ✓ финал(форс): ${pred.outcomeLabel} ${pred.score.home}:${pred.score.away}`); }
          } catch (e) { console.warn(`  финальный анализ упал: ${e?.message ?? e}`); }
        } else if (!p) {
          // Далеко от форса, прогноза ещё нет — пусть будет хотя бы предварительный.
          if (prelimDone < PRELIM_CAP) {
            try {
              const pred = await runAnalysis(client, f, null, 'preliminary');
              if (pred) { f.prediction = pred; changed++; prelimDone++; console.log(`Предварительный: ${name}`); }
            } catch (e) { console.warn(`  предв. анализ упал: ${e?.message ?? e}`); }
          }
        } else {
          // Есть предварительный/форс-финал — ждём составы, апгрейдим, как появятся.
          console.log(`Ожидаются составы: ${name} (T-${Math.round(msToKo / 60000)}мин) — повтор позже`);
        }
      }
      // ── ПРЕДВАРИТЕЛЬНЫЙ анализ заранее (матч дальше окна T-60, прогноза нет) ──
      // Нет прогноза ИЛИ предварительный получился неполным: <3 бомбардиров
      // (старый дедуп) либо какая-то модель не ответила → (пере)генерируем на
      // месте. repairAttempts ограничивает пересборки (защита от цикла, если
      // модель стабильно падает).
      else if (!inFinalWindow && prelimDone < PRELIM_CAP &&
        (!p || (p.phase === 'preliminary' && p.status === 'pending' &&
          ((p.scorers?.length ?? 0) < 3 || (p.modelViews ?? []).some((m) => m.error)) &&
          (p.repairAttempts ?? 0) < 2))) {
        try {
          const pred = await runAnalysis(client, f, null, 'preliminary');
          if (pred) {
            if (p) pred.repairAttempts = (p.repairAttempts ?? 0) + 1;
            f.prediction = pred; changed++; prelimDone++;
            console.log(`Предварительный${p ? ' (пересборка)' : ''}: ${name}`);
          }
        } catch (e) { console.warn(`  предв. анализ упал: ${e?.message ?? e}`); }
      }
    }

    // Сеттлмент: есть pending-прогноз и матч начался ≥130 мин назад (или finished).
    // В историю попадает текущий прогноз — к этому моменту он уже финальный.
    if (f.prediction && f.prediction.status === 'pending' && AF_KEY && (f.status === 'finished' || ko < now - 130 * 60000)) {
      console.log(`Сеттлмент: ${name}`);
      try {
        if (await settle(f, f.prediction)) { changed++; console.log(`  ✓ ${f.prediction.result.resultStatus} ${f.prediction.result.actualScore.home}:${f.prediction.result.actualScore.away}`); }
      } catch (e) { console.warn(`  сеттлмент упал: ${e?.message ?? e}`); }
    }
  }

  writeFileSync(FIXTURES_PATH, JSON.stringify(days));
  writeFileSync(HISTORY_PATH, JSON.stringify(buildHistory(days)));

  // ── ПОЛНЫЙ прогноз для «Матчи» (рынки) + сведение + история ──
  // Прогнозы лежат в predictions.json (ключ = fixtureId). Для вкладки «Трек-рекорд»
  // на статике (бэкенда на Pages нет) собираем predictions-history.json. Сведение
  // по факту матча — общим helper'ом settlePrediction (как у бэкенда).
  {
    const preds = existsSync(PRED_PATH) ? JSON.parse(readFileSync(PRED_PATH, 'utf8')) : {};
    const fixtureById = new Map(days.flatMap((d) => d.fixtures).map((f) => [f.id, f]));

    // Генерация прогноза «Матчи» — ОДИН РАЗ на каждый матч ДО старта. Берём все
    // ближайшие матчи в окне MATCH_GEN_WINDOW_H, у кого прогноза ещё нет; cap на
    // прогон бережёт токены, watchdog (тик ~8 мин) добирает остальные по мере
    // приближения. Прогноз фиксируется до начала игры и далее не пересчитывается.
    if (LZ_KEY) {
      const MATCH_GEN_WINDOW_H = 36;
      const MATCH_GEN_CAP = 4;
      const horizon = now + MATCH_GEN_WINDOW_H * 3600_000;
      const upcoming = days
        .flatMap((d) => d.fixtures)
        .filter((f) => { const ko = new Date(f.startsAt).getTime(); return ko > now && ko <= horizon && !preds[f.id]; })
        .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      let gen = 0;
      for (const f of upcoming) {
        if (gen >= MATCH_GEN_CAP) break;
        try {
          const pred = await runMatchAnalysis(client, f);
          if (pred) { preds[f.id] = pred; changed++; gen++; console.log(`Полный прогноз (Матчи): ${f.homeTeam.name} — ${f.awayTeam.name} → ${pred.recommendedMarket}/${pred.recommendedOutcome}`); }
        } catch (e) { console.warn(`  полный анализ упал ${f.id}: ${e?.message ?? e}`); }
      }
    }

    // Сведение завершённых прогнозов «Матчи»: счёт + (для угловых/карточек) статистика.
    if (AF_KEY) {
      for (const [idStr, p] of Object.entries(preds)) {
        if (p.status === 'resolved' || p.settlement) continue;
        const id = Number(idStr);
        const fx = fixtureById.get(id);
        const ko = fx ? new Date(fx.startsAt).getTime() : null;
        const due = (fx && fx.status === 'finished') || (ko != null && ko < now - 130 * 60000);
        if (!due) continue;
        try {
          const score = await afScore(id);
          if (!score?.finished || score.homeGoals == null || score.awayGoals == null) continue;
          const st = await afStats(id);
          // Основной рынок — угловые/карточки, а данных нет → ждём (не сводим).
          if ((p.recommendedMarket === 'CORNERS_OU' && st.corners == null) ||
              (p.recommendedMarket === 'CARDS_OU' && st.cards == null)) continue;
          p.settlement = settlePrediction(p.markets ?? [], p.recommendedMarket, p.recommendedOutcome,
            { homeGoals: score.homeGoals, awayGoals: score.awayGoals, corners: st.corners, cards: st.cards });
          p.status = 'resolved';
          changed++;
          console.log(`Сведение (Матчи) ${id}: ${p.settlement.mainStatus} ${score.homeGoals}:${score.awayGoals}`);
        } catch (e) { console.warn(`  сведение (Матчи) ${id} упало: ${e?.message ?? e}`); }
      }
    }

    writeFileSync(PRED_PATH, JSON.stringify(preds));
    writeFileSync(PRED_HISTORY_PATH, JSON.stringify(buildPredHistory(preds, fixtureById)));
  }

  // Разовый прогноз турнира (чемпион + бомбардир) — считается один раз.
  if (LZ_KEY) {
    try {
      if (await ensureTournamentPrediction(client)) changed++;
    } catch (e) { console.warn(`Турнирный прогноз упал: ${e?.message ?? e}`); }
  }

  // Расписание ЧМ (вкладка «Матчи») — обновляем счёт/статус в активном окне.
  try {
    if (await refreshWcSchedule(now)) { changed++; console.log('Расписание ЧМ обновлено'); }
  } catch (e) { console.warn(`WC-обновление упало: ${e?.message ?? e}`); }

  // Подсказка watchdog'у, сколько спать до следующего цикла: коротко (отзывчиво),
  // если рядом «горячий» матч (входит/в окне T-60 или только сыгран — сеттлмент),
  // иначе длинно (в простое не молотим). watchdog читает .lvs-next-sleep.
  try {
    const hot = days.flatMap((d) => d.fixtures).some((f) => {
      const ms = new Date(f.startsAt).getTime() - Date.now();
      return ms <= 75 * 60000 && ms > -150 * 60000; // T-75мин … T+150мин
    });
    writeFileSync(resolve(ROOT, '.lvs-next-sleep'), String(hot ? 120 : 600));
  } catch { /* не критично */ }

  console.log(`Готово. Изменений: ${changed}.`);
  // Код 0 всегда; «изменилось ли» workflow определяет по git diff.
}

main().catch((e) => { console.error(e); process.exit(1); });
