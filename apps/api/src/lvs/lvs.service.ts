import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, asc, desc, eq, gte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as schema from '@ai-score/db';
import {
  LaozhangClient,
  buildLvsSystemPrompt,
  buildLvsUserPrompt,
  lvsPredictionResponseSchema,
  type MatchContext,
  type ModelCallResult,
  type LvsPredictionResponse,
  type LvsScorer,
  type LvsModelForecast,
  type LvsPredictionDetail,
  type LvsLineups,
  type LvsTeamLineup,
  type LvsOutcome,
  type LvsDay,
  type LvsFixtureItem,
  type LvsHistoryItem,
} from '@ai-score/shared';
import type { MatchLineupsOut } from '../providers/api-football/api-football.adapter';
import { DatabaseService } from '../database/database.service';
import { FixturesService } from '../fixtures/fixtures.service';
import { InjuriesAdapter } from '../providers/injuries/injuries.adapter';
import { OddsAdapter } from '../providers/odds/odds.adapter';
import { rowToLvsDetail, rowToLvsHistory } from './lvs.mapper';
import { inArray, or } from 'drizzle-orm';

const WC_LEAGUE_ID = 2000;

// grok-4 — laozhang-алиас Grok 4.3 (литералы grok-4.3/grok-4-3 не резолвятся).
const DEFAULT_MODELS = ['gpt-5.1', 'grok-4', 'claude-opus-4-8', 'deepseek-chat'];
const SYNTH_MODEL = 'gemini-2.5-flash-nothinking';

interface ProviderFixture {
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  scoreHome?: number | null;
  scoreAway?: number | null;
}

type LvsRow = typeof schema.lvsPredictions.$inferSelect;

@Injectable()
export class LvsService {
  private readonly logger = new Logger(LvsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly config: ConfigService,
    private readonly fixtures: FixturesService,
    private readonly injuries: InjuriesAdapter,
    private readonly odds: OddsAdapter,
  ) {}

  // Матчи ЛВС = матчи ЧМ (лига 2000) + явный allowlist доп. fixture id из конфига.
  extraFixtureIds(): number[] {
    return this.config.get<number[]>('lvs.extraFixtureIds') ?? [];
  }

  // SQL-условие «матч относится к ЛВС»: лига ЧМ ИЛИ из allowlist.
  lvsScope() {
    const extra = this.extraFixtureIds();
    const wc = eq(schema.fixtures.leagueId, WC_LEAGUE_ID);
    return extra.length ? or(wc, inArray(schema.fixtures.id, extra)) : wc;
  }

  // Полный анализ ЛВС одного матча. ТРЕБУЕТ доступных стартовых составов: без них
  // (автопуть за 1ч до матча) бросаем ConflictException — планировщик повторит.
  // force=true — ручной запуск без ожидания составов (если провайдер их не
  // публикует). Авто-планировщик вызывает без force и продолжает ждать составы.
  async analyze(fixtureId: number, force = false): Promise<LvsPredictionDetail> {
    const apiKey = this.config.get<string>('laozhang.apiKey') ?? '';
    if (!apiKey) throw new NotFoundException('LAOZHANG_API_KEY is not configured');

    const built = await this.buildContext(fixtureId);
    if (!built) throw new NotFoundException(`Fixture ${fixtureId} not found`);
    const { ctx, lineups, oddsBlock } = built;
    if (!lineups && !force) {
      throw new ConflictException('Стартовые составы ещё не доступны — анализ ЛВС откладывается');
    }

    const baseUrl = this.config.get<string>('laozhang.baseUrl');
    const models = (this.config.get<string>('laozhang.models') ?? DEFAULT_MODELS.join(','))
      .split(',').map((m) => m.trim()).filter(Boolean);
    const client = new LaozhangClient(apiKey, baseUrl, 120_000);

    this.logger.log(`LVS analysis: ${ctx.homeTeam} vs ${ctx.awayTeam} × ${models.length} models`);
    const results = await client.fanOut(models, [
      { role: 'system', content: buildLvsSystemPrompt() },
      { role: 'user', content: buildLvsUserPrompt(ctx) },
    ]);

    const parsed = parseWithModel(results);
    const valid = parsed.filter((p) => p.parsed).map((p) => p.parsed!);
    this.logger.log(`LVS analysis: ${valid.length}/${results.length} models responded for ${fixtureId}`);
    if (!valid.length) throw new NotFoundException('Все модели не дали прогноз ЛВС');

    const agg = aggregate(valid);
    const modelViews = buildModelViews(parsed);
    const summary = await this.synthesize(client, SYNTH_MODEL, ctx, agg, modelViews);

    // Перезаписываем только незавершённый прогноз (resolved неизменяем).
    await this.db.db.delete(schema.lvsPredictions).where(and(
      eq(schema.lvsPredictions.fixtureId, fixtureId),
      eq(schema.lvsPredictions.status, 'pending'),
    ));
    const [row] = await this.db.db
      .insert(schema.lvsPredictions)
      .values({
        fixtureId,
        outcome: agg.outcome,
        probWin1: agg.probs.win1,
        probDraw: agg.probs.draw,
        probWin2: agg.probs.win2,
        scoreHome: agg.score.home,
        scoreAway: agg.score.away,
        scorers: agg.scorers as unknown[],
        lineupsHome: (lineups?.home ?? null) as unknown,
        lineupsAway: (lineups?.away ?? null) as unknown,
        confidence: agg.confidence,
        stars: agg.stars,
        rationale: agg.rationale,
        summary,
        oddsBlock: oddsBlock ?? null,
        modelViews: modelViews as unknown[],
        status: 'pending',
      })
      .returning();

    return rowToLvsDetail(row!);
  }

  private async synthesize(
    client: LaozhangClient,
    model: string,
    ctx: MatchContext,
    agg: Aggregated,
    views: LvsModelForecast[],
  ): Promise<string | null> {
    const opinions = views
      .filter((v) => !v.error)
      .map((v) => {
        const sc = v.scoreHome != null && v.scoreAway != null ? ` ${v.scoreHome}:${v.scoreAway}` : '';
        const players = v.scorers.length ? `, голы: ${v.scorers.join(', ')}` : '';
        return `- ${v.modelId}: исход «${v.outcome ?? '—'}»${sc}${players}`;
      })
      .join('\n');
    if (!opinions) return null;

    const decision = `Итог: исход «${agg.outcome}», счёт ${agg.score.home}:${agg.score.away}, забьют: ${agg.scorers.map((s) => s.name).join(', ')}.`;
    const res = await client.complete({
      model,
      messages: [
        { role: 'system', content: 'Объедини прогнозы AI-моделей в один краткий вывод. Только связный текст на русском, 2–3 предложения, без markdown.' },
        { role: 'user', content: `${ctx.homeTeam} — ${ctx.awayTeam}.\nМодели:\n${opinions}\n${decision}\nВ чём модели согласны/расходятся и почему такой прогноз.` },
      ],
      max_tokens: 300,
      temperature: 0.3,
    });
    if (res.error || !res.content.trim()) return null;
    return res.content.trim().slice(0, 600);
  }

  private async buildContext(
    fixtureId: number,
  ): Promise<{ ctx: MatchContext; lineups: LvsLineups | null; oddsBlock: string | null } | null> {
    const [fixture] = await this.db.db
      .select().from(schema.fixtures).where(eq(schema.fixtures.id, fixtureId)).limit(1);
    if (!fixture) return null;

    const [home] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.homeTeamId)).limit(1);
    const [away] = await this.db.db.select().from(schema.teams).where(eq(schema.teams.id, fixture.awayTeamId)).limit(1);
    const [league] = await this.db.db.select().from(schema.leagues).where(eq(schema.leagues.id, fixture.leagueId)).limit(1);
    if (!home || !away || !league) return null;

    const ctx: MatchContext = {
      homeTeam: home.name,
      awayTeam: away.name,
      homeTeamShort: home.shortName || home.name,
      awayTeamShort: away.shortName || away.name,
      league: league.name,
      country: league.country ?? '',
      round: fixture.round,
      date: fixture.startsAt.toISOString().slice(0, 10),
    };

    let lineups: LvsLineups | null = null;
    try {
      const c = (await this.fixtures.findContext(fixtureId, 'ru')) as Record<string, unknown>;
      const homeFlash = (c['homeFormFlash'] as ProviderFixture[] | undefined) ?? [];
      const awayFlash = (c['awayFormFlash'] as ProviderFixture[] | undefined) ?? [];
      const h2hAll = (c['h2hAll'] as ProviderFixture[] | undefined) ?? [];
      const rawLineups = (c['lineups'] as MatchLineupsOut | null) ?? null;
      const homeCoach = (c['homeCoach'] as { name?: string } | null)?.name;
      const awayCoach = (c['awayCoach'] as { name?: string } | null)?.name;

      const hForm = formString(homeFlash, home.name);
      const aForm = formString(awayFlash, away.name);
      if (hForm) ctx.homeForm = hForm;
      if (aForm) ctx.awayForm = aForm;

      const h2h = h2hSummary(h2hAll, home.name);
      if (h2h) ctx.h2hSummary = h2h;

      const coaches = [
        homeCoach ? `${home.shortName || home.name}: ${homeCoach}` : null,
        awayCoach ? `${away.shortName || away.name}: ${awayCoach}` : null,
      ].filter(Boolean);
      if (coaches.length) ctx.coaches = coaches.join('; ');

      if (rawLineups) {
        const text = lineupsSummary(rawLineups, home.shortName || home.name, away.shortName || away.name);
        if (text) ctx.lineups = text;
        lineups = {
          home: toLvsLineup(rawLineups.home, homeCoach),
          away: toLvsLineup(rawLineups.away, awayCoach),
        };
      }
    } catch (err) {
      this.logger.warn(`LVS context unavailable for ${fixtureId}: ${err instanceof Error ? err.message : err}`);
    }

    try {
      const season = fixture.startsAt.getUTCFullYear();
      const inj = await this.injuries.getInjuries(
        home.name, away.name, season, home.shortName || home.name, away.shortName || away.name,
      );
      if (inj) ctx.injuries = inj;
    } catch {
      /* injuries optional */
    }

    // Букмекерская линия (manual → API-Football → the-odds-api). Для оценки
    // вероятностей исхода; для товарищеских может отсутствовать (graceful).
    let oddsBlock: string | null = null;
    try {
      const line = await this.odds.getOdds(home.name, away.name, fixture.startsAt.toISOString());
      if (line.block && line.block.trim()) {
        ctx.odds = line.block;
        oddsBlock = line.block;
      }
    } catch (err) {
      this.logger.warn(`LVS odds unavailable for ${fixtureId}: ${err instanceof Error ? err.message : err}`);
    }

    return { ctx, lineups, oddsBlock };
  }

  // ── чтение для контроллера ────────────────────────────────────────────────

  // Все матчи ЧМ (лига 2000), сгруппированы по дням, с приложенным ЛВС-прогнозом.
  async listFixtures(): Promise<LvsDay[]> {
    const home = alias(schema.teams, 'lvs_home');
    const away = alias(schema.teams, 'lvs_away');
    const rows = await this.db.db
      .select({ fixture: schema.fixtures, home, away, pred: schema.lvsPredictions })
      .from(schema.fixtures)
      .leftJoin(home, eq(schema.fixtures.homeTeamId, home.id))
      .leftJoin(away, eq(schema.fixtures.awayTeamId, away.id))
      .leftJoin(schema.lvsPredictions, eq(schema.fixtures.id, schema.lvsPredictions.fixtureId))
      .where(and(
        this.lvsScope(),
        gte(schema.fixtures.startsAt, new Date('2026-06-01')),
      ))
      .orderBy(asc(schema.fixtures.startsAt));

    // Свернуть несколько прогнозов на матч: resolved важнее, иначе свежий.
    const best = new Map<number, LvsRow>();
    for (const r of rows) {
      if (!r.pred) continue;
      const prev = best.get(r.fixture.id);
      if (!prev || (prev.status !== 'resolved' && r.pred.status === 'resolved') || r.pred.createdAt > prev.createdAt) {
        best.set(r.fixture.id, r.pred);
      }
    }

    const seen = new Set<number>();
    const byDay = new Map<string, LvsFixtureItem[]>();
    for (const r of rows) {
      if (seen.has(r.fixture.id)) continue;
      seen.add(r.fixture.id);
      const f = r.fixture;
      const pred = best.get(f.id);
      const item: LvsFixtureItem = {
        id: f.id,
        startsAt: f.startsAt.toISOString(),
        status: f.status,
        minute: f.minute,
        round: f.round,
        homeTeam: toTeamRef(r.home),
        awayTeam: toTeamRef(r.away),
        score: f.scoreHome != null && f.scoreAway != null ? { home: f.scoreHome, away: f.scoreAway } : null,
        prediction: pred ? rowToLvsDetail(pred) : null,
      };
      const day = f.startsAt.toISOString().slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(item);
    }
    return [...byDay.entries()].map(([date, fixtures]) => ({ date, fixtures }));
  }

  // Отдельная История ЛВС — только разрешённые прогнозы (status='resolved').
  async listHistory(): Promise<LvsHistoryItem[]> {
    const home = alias(schema.teams, 'lvs_h_home');
    const away = alias(schema.teams, 'lvs_h_away');
    const rows = await this.db.db
      .select({ pred: schema.lvsPredictions, fixture: schema.fixtures, home, away })
      .from(schema.lvsPredictions)
      .innerJoin(schema.fixtures, eq(schema.fixtures.id, schema.lvsPredictions.fixtureId))
      .leftJoin(home, eq(schema.fixtures.homeTeamId, home.id))
      .leftJoin(away, eq(schema.fixtures.awayTeamId, away.id))
      .where(eq(schema.lvsPredictions.status, 'resolved'))
      .orderBy(desc(schema.lvsPredictions.resolvedAt));

    return rows.map((r) => {
      const match = `${r.home?.name ?? '—'} — ${r.away?.name ?? '—'}`;
      return rowToLvsHistory(
        r.pred, match, r.fixture.startsAt.toISOString(), toTeamRef(r.home), toTeamRef(r.away),
      );
    });
  }
}

function toTeamRef(t: typeof schema.teams.$inferSelect | null) {
  return {
    id: t?.id ?? 0,
    name: t?.name ?? '—',
    shortName: t?.shortName || (t?.name ?? '—'),
    logo: t?.logo ?? null,
  };
}

// ── parsing / aggregation ──────────────────────────────────────────────────

interface ParsedModel {
  modelId: string;
  parsed: LvsPredictionResponse | null;
  error: string | null;
}

function parseWithModel(results: ModelCallResult[]): ParsedModel[] {
  return results.map((r) => {
    if (r.error) return { modelId: r.modelId, parsed: null, error: r.error };
    try {
      return { modelId: r.modelId, parsed: lvsPredictionResponseSchema.parse(JSON.parse(extractJson(r.content))), error: null };
    } catch (err) {
      return { modelId: r.modelId, parsed: null, error: err instanceof Error ? err.message.slice(0, 200) : 'parse error' };
    }
  });
}

function buildModelViews(parsed: ParsedModel[]): LvsModelForecast[] {
  return parsed.map((pm) => {
    if (!pm.parsed) {
      return { modelId: pm.modelId, outcome: null, scoreHome: null, scoreAway: null, scorers: [], confidence: null, rationale: null, error: pm.error };
    }
    const r = pm.parsed;
    return {
      modelId: pm.modelId,
      outcome: r.outcome as LvsOutcome,
      scoreHome: r.score.home,
      scoreAway: r.score.away,
      scorers: r.scorers.map((s) => s.name),
      confidence: round(r.confidence),
      rationale: r.rationale || null,
      error: null,
    };
  });
}

interface Aggregated {
  outcome: LvsOutcome;
  probs: { win1: number; draw: number; win2: number };
  score: { home: number; away: number };
  scorers: LvsScorer[];
  confidence: number;
  stars: number;
  rationale: string;
}

function aggregate(responses: LvsPredictionResponse[]): Aggregated {
  const n = responses.length;
  // Усреднённые и нормированные вероятности исхода.
  let win1 = 0, draw = 0, win2 = 0;
  for (const r of responses) { win1 += r.probs.win1; draw += r.probs.draw; win2 += r.probs.win2; }
  const sum = win1 + draw + win2 || 1;
  const probs = { win1: round(win1 / sum), draw: round(draw / sum), win2: round(win2 / sum) };
  const outcome: LvsOutcome = probs.win1 >= probs.draw && probs.win1 >= probs.win2 ? '1' : probs.win2 >= probs.draw ? '2' : 'X';

  // Точный счёт: мода по моделям; при равенстве — согласованный с исходом.
  const scoreTally = new Map<string, number>();
  for (const r of responses) {
    const k = `${r.score.home}:${r.score.away}`;
    scoreTally.set(k, (scoreTally.get(k) ?? 0) + 1);
  }
  let bestScore = `${responses[0]!.score.home}:${responses[0]!.score.away}`;
  let bestVotes = 0;
  for (const [k, v] of scoreTally) {
    const [h, a] = k.split(':').map(Number) as [number, number];
    const consistent = outcomeFromScore(h, a) === outcome;
    const score = v + (consistent ? 0.5 : 0);
    const curBest = bestVotes;
    if (score > curBest) { bestVotes = score; bestScore = k; }
  }
  const [sh, sa] = bestScore.split(':').map(Number) as [number, number];

  // Бомбардиры: топ-3 по сумме вероятностей среди всех ответов.
  const scorerMap = new Map<string, { name: string; team: 'home' | 'away'; position: string | null; weight: number }>();
  for (const r of responses) {
    for (const s of r.scorers) {
      const key = normalizeName(s.name);
      if (!key) continue;
      const e = scorerMap.get(key);
      if (e) {
        e.weight += s.probability || 0.3;
        if (!e.position && s.position) e.position = s.position; // первая непустая позиция
      } else {
        scorerMap.set(key, { name: s.name, team: s.team, position: s.position || null, weight: s.probability || 0.3 });
      }
    }
  }
  const totalWeight = [...scorerMap.values()].reduce((a, b) => a + b.weight, 0) || 1;
  const scorers: LvsScorer[] = [...scorerMap.values()]
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => ({ name: s.name, team: s.team, position: s.position, probability: round(Math.min(0.95, s.weight / totalWeight + 0.2)) }));

  const confidence = clamp(responses.reduce((s, r) => s + r.confidence, 0) / n, 0.05, 0.97);
  const rationale = responses.map((r) => r.rationale ?? '').filter((s) => s.length > 20).sort((a, b) => b.length - a.length)[0] ?? '';

  return { outcome, probs, score: { home: sh, away: sa }, scorers, confidence, stars: toStars(confidence), rationale };
}

function outcomeFromScore(home: number, away: number): LvsOutcome {
  return home > away ? '1' : home < away ? '2' : 'X';
}

function toLvsLineup(team: MatchLineupsOut['home'], coach?: string): LvsTeamLineup {
  return {
    formation: team?.formation ?? '',
    coach: team?.coach ?? coach ?? null,
    startingXI: (team?.startingXI ?? []).map((p) => ({ id: String(p.id), name: p.name, number: p.number, position: p.position ?? null })),
  };
}

// ── pure helpers (зеркало ai-analysis) ─────────────────────────────────────

function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zа-я0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim();
}

// Код позиции от провайдера (G/D/M/F) → краткое русское обозначение.
function posCodeRu(code: string): string {
  switch (code.trim().toUpperCase()[0]) {
    case 'G': return 'вр';
    case 'D': return 'защ';
    case 'M': return 'пз';
    case 'F': return 'нап';
    default: return code;
  }
}

function round(n: number): number { return Math.round(n * 1000) / 1000; }
function clamp(n: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, n)); }
function toStars(c: number): number {
  if (c >= 0.85) return 5;
  if (c >= 0.7) return 4;
  if (c >= 0.55) return 3;
  if (c >= 0.4) return 2;
  return 1;
}

function extractJson(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1]!.trim();
  const start = s.indexOf('{');
  if (start === -1) return s;
  let depth = 0, inStr = false, esc = false;
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
  return s.slice(start);
}

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
    // Имя с позицией: «Игрок (нап.)» — чтобы модель выбирала бомбардиров по позиции.
    const players = (team?.startingXI ?? [])
      .filter((p) => p.name)
      .map((p) => (p.position ? `${p.name} (${posCodeRu(p.position)})` : p.name));
    if (!players.length && !team?.formation) return null;
    const formation = team?.formation ? ` (${team.formation})` : '';
    return `${name}${formation}: ${players.slice(0, 11).join(', ') || '—'}`;
  };
  const home = side(lineups.home, homeShort);
  const away = side(lineups.away, awayShort);
  const parts = [home, away].filter(Boolean) as string[];
  if (!parts.length) return '';
  return `${parts.join('. ')}`;
}
