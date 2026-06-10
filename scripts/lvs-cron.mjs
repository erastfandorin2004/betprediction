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
  settleLvs,
  mergeScorers,
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

const AF_BASE = 'https://v3.football.api-sports.io';
const LZ_BASE = process.env.LAOZHANG_BASE_URL ?? 'https://api.laozhang.ai/v1';
const DEFAULT_MODELS = ['gpt-5.1', 'grok-4', 'claude-opus-4-8', 'deepseek-chat'];
const SYNTH_MODEL = 'gemini-2.5-flash-nothinking';
const ANALYSIS_LEAD_MS = 60 * 60 * 1000; // окно анализа: ≤60 мин до старта
const FORCE_FALLBACK_MS = 45 * 60 * 1000; // нет составов к T-45 → форсируем

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
  const outcome = probs.win1 >= probs.draw && probs.win1 >= probs.win2 ? '1' : probs.win2 >= probs.draw ? '2' : 'X';

  const tally = new Map();
  for (const r of responses) { const k = `${r.score.home}:${r.score.away}`; tally.set(k, (tally.get(k) ?? 0) + 1); }
  let bestScore = `${responses[0].score.home}:${responses[0].score.away}`, bestVotes = 0;
  for (const [k, v] of tally) {
    const [h, a] = k.split(':').map(Number);
    const score = v + (outcomeFromScore(h, a) === outcome ? 0.5 : 0);
    if (score > bestVotes) { bestVotes = score; bestScore = k; }
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
      if (inFinalWindow && (!p || p.phase !== 'final')) {
        const lineups = await afLineups(f.id);
        const force = msToKo <= FORCE_FALLBACK_MS; // нет составов к T-45 → форсируем
        if (lineups || force) {
          console.log(`Финальный анализ: ${name} (T-${Math.round(msToKo / 60000)}мин, составы: ${lineups ? 'да' : 'нет'})`);
          try {
            const pred = await runAnalysis(client, f, lineups, 'final');
            if (pred) { f.prediction = pred; changed++; console.log(`  ✓ финал: ${pred.outcomeLabel} ${pred.score.home}:${pred.score.away}`); }
          } catch (e) { console.warn(`  финальный анализ упал: ${e?.message ?? e}`); }
        } else if (!p) {
          // составов ещё нет и не форсим — пусть будет хотя бы предварительный
          if (prelimDone < PRELIM_CAP) {
            try {
              const pred = await runAnalysis(client, f, null, 'preliminary');
              if (pred) { f.prediction = pred; changed++; prelimDone++; console.log(`Предварительный: ${name}`); }
            } catch (e) { console.warn(`  предв. анализ упал: ${e?.message ?? e}`); }
          }
        } else {
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

  // ── ПОЛНЫЙ прогноз для «Матчи» (рынки) ──
  // ПОКА: только первый (ближайший) матч ЧМ — потом решим, как масштабировать.
  if (LZ_KEY) {
    const preds = existsSync(PRED_PATH) ? JSON.parse(readFileSync(PRED_PATH, 'utf8')) : {};
    const upcoming = days
      .flatMap((d) => d.fixtures)
      .filter((f) => new Date(f.startsAt).getTime() > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const first = upcoming[0];
    if (first && !preds[first.id]) {
      try {
        const pred = await runMatchAnalysis(client, first);
        if (pred) { preds[first.id] = pred; changed++; console.log(`Полный прогноз (Матчи, 1-й матч): ${first.homeTeam.name} — ${first.awayTeam.name} → ${pred.recommendedMarket}/${pred.recommendedOutcome}`); }
      } catch (e) { console.warn(`  полный анализ упал ${first.id}: ${e?.message ?? e}`); }
    }
    writeFileSync(PRED_PATH, JSON.stringify(preds));
  }

  // Расписание ЧМ (вкладка «Матчи») — обновляем счёт/статус в активном окне.
  try {
    if (await refreshWcSchedule(now)) { changed++; console.log('Расписание ЧМ обновлено'); }
  } catch (e) { console.warn(`WC-обновление упало: ${e?.message ?? e}`); }

  console.log(`Готово. Изменений: ${changed}.`);
  // Код 0 всегда; «изменилось ли» workflow определяет по git diff.
}

main().catch((e) => { console.error(e); process.exit(1); });
