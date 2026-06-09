'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { LvsFixtureItem, LvsPredictionDetail, LvsModelForecast, LvsOutcome, LvsScorer } from '@ai-score/shared';
import { formatTime } from '@/lib/format';
import { getTeamName } from '@/lib/team-names-ru';
import { flagEmoji } from '@/lib/country-flags';
import { STATIC_MODE } from '@/lib/lvs-data';
import { useLocale } from '@/components/i18n/locale-provider';
import { RefreshCw, AlertTriangle, Sparkles, Target, ChevronDown } from 'lucide-react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const CARD = { background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' } as const;
const ACCENT = 'rgb(var(--accent))';

// Цвет статуса завершённого прогноза (как в Истории ЛВС).
const RESULT_COLOR: Record<string, string> = { won: '#22c55e', partial: '#f59e0b', lost: '#ef4444' };

// Человекочитаемые названия моделей ансамбля (id laozhang → бренд).
const MODEL_LABELS: Record<string, string> = {
  'gpt-5.1': 'GPT 5.1',
  'grok-4': 'Grok 4.3',
  'claude-opus-4-8': 'Claude Opus 4.8',
  'deepseek-chat': 'DeepSeek 4',
};
const modelLabel = (id: string) => MODEL_LABELS[id] ?? id;

// Нормализация позиции игрока к читаемому русскому слову (модель может вернуть
// код G/D/M/F, англ. слово или уже русское — отдаём как есть в последнем случае).
function formatPosition(pos: string | null | undefined): string | null {
  if (!pos) return null;
  const p = pos.trim();
  if (!p) return null;
  const key = p.toLowerCase();
  const map: Record<string, string> = {
    g: 'вратарь', gk: 'вратарь', goalkeeper: 'вратарь', вратарь: 'вратарь',
    d: 'защитник', def: 'защитник', defender: 'защитник', защитник: 'защитник',
    m: 'полузащитник', mid: 'полузащитник', midfielder: 'полузащитник', полузащитник: 'полузащитник',
    f: 'нападающий', fw: 'нападающий', forward: 'нападающий', striker: 'нападающий',
    attacker: 'нападающий', нападающий: 'нападающий',
  };
  return map[key] ?? p;
}

export function LvsFixtureCard({ fixture }: { fixture: LvsFixtureItem }) {
  const { t, locale } = useLocale();
  const L = t.lvs;
  const [prediction, setPrediction] = useState<LvsPredictionDetail | null>(fixture.prediction);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Свёрнут по умолчанию: анализ раскрывается по клику на матч / стрелку.
  const [expanded, setExpanded] = useState(false);

  // Якорь на корневой <div> карточки — для deep-link вида /lvs#m-<fixtureId>.
  const cardRef = useRef<HTMLDivElement>(null);

  // Если хеш в URL указывает на этот матч — раскрыть карточку и проскроллить к ней.
  // Реагируем и на hashchange, чтобы переход работал на уже открытой странице.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = `#m-${fixture.id}`;
    const focusIfMatch = () => {
      if (window.location.hash === target) {
        setExpanded(true);
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    focusIfMatch();
    window.addEventListener('hashchange', focusIfMatch);
    return () => window.removeEventListener('hashchange', focusIfMatch);
  }, [fixture.id]);

  const isFinished = fixture.status === 'finished';
  const homeName = getTeamName(fixture.homeTeam.name, fixture.homeTeam.shortName, locale, true);
  const awayName = getTeamName(fixture.awayTeam.name, fixture.awayTeam.shortName, locale, true);
  const homeFlag = flagEmoji(fixture.homeTeam.name);
  const awayFlag = flagEmoji(fixture.awayTeam.name);
  // Итоговый счёт: из fixtures (если ingest обновил) либо из сведённого прогноза
  // (товарищеские в БД остаются 'scheduled', но фактический счёт есть в result).
  const finalScore = fixture.score ?? prediction?.result?.actualScore ?? null;

  async function run() {
    setStatus('running');
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/v1/lvs/${fixture.id}/analyze`, { method: 'POST' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(res.status === 409 ? L.noLineups : body.message ?? `HTTP ${res.status}`);
      }
      const json = (await res.json()) as { data: LvsPredictionDetail };
      setPrediction(json.data);
      setStatus('idle');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : L.analyzeError);
      setStatus('error');
    }
  }

  return (
    <div ref={cardRef} id={`m-${fixture.id}`} className="overflow-hidden rounded-3xl scroll-mt-24" style={CARD}>
      {/* Шапка-кнопка: клик по матчу разворачивает/сворачивает анализ */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="block w-full text-left transition-colors"
        style={{ background: 'linear-gradient(180deg, rgb(var(--pitch-800)), rgb(var(--pitch-900)))' }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-5 pt-5 pb-3">
          <TeamHead flag={homeFlag} name={homeName} logo={fixture.homeTeam.logo} align="start" />
          <div className="flex flex-col items-center gap-1">
            {finalScore ? (
              <>
                <span className="tabular rounded-xl px-3 py-1 text-xl font-extrabold" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-primary))' }}>
                  {finalScore.home}:{finalScore.away}
                </span>
                <span className="text-center text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{L.finished}</span>
              </>
            ) : (
              <>
                <span className="tabular text-base font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{formatTime(fixture.startsAt)}</span>
                {fixture.round && (
                  <span className="text-center text-[10px] font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{fixture.round}</span>
                )}
              </>
            )}
          </div>
          <TeamHead flag={awayFlag} name={awayName} logo={fixture.awayTeam.logo} align="end" />
        </div>

        {/* Сводка + стрелка: что внутри карточки, не раскрывая её */}
        <div
          className="flex items-center justify-between gap-2 px-5 pb-3.5 pt-1"
          style={{ borderTop: '1px dashed rgb(var(--pitch-700))', marginTop: 2 }}
        >
          <CollapsedSummary prediction={prediction} running={status === 'running'} isFinished={isFinished} startsAt={fixture.startsAt} L={L} />
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold" style={{ color: expanded ? ACCENT : 'rgb(var(--fg-muted))' }}>
            {expanded ? L.collapse : L.details}
            <ChevronDown className="h-4 w-4 transition-transform" style={{ transform: expanded ? 'rotate(180deg)' : 'none' }} />
          </span>
        </div>
      </button>

      {/* Тело: раскрывается по клику */}
      {expanded && (
        <div className="px-5 py-5" style={{ borderTop: '1px solid rgb(var(--pitch-700))' }}>
          {status === 'running' ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
              <Sparkles className="h-5 w-5 animate-pulse" style={{ color: ACCENT }} />
              {L.running}
            </div>
          ) : prediction ? (
            <LvsPredictionView
              prediction={prediction}
              homeName={homeName}
              awayName={awayName}
              homeFlag={homeFlag}
              awayFlag={awayFlag}
              startsAt={fixture.startsAt}
              isFinished={isFinished}
              canRerun={!isFinished && !STATIC_MODE}
              onRerun={run}
              L={L}
            />
          ) : (
            <div className="py-6 text-center">
              <p className="mx-auto mb-4 max-w-sm text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{L.waiting}</p>
              {errorMsg && (
                <p className="mb-4 flex items-center justify-center gap-1.5 text-sm" style={{ color: '#ef4444' }}>
                  <AlertTriangle className="h-4 w-4" /> {errorMsg}
                </p>
              )}
              {!isFinished && !STATIC_MODE && (
                <button
                  type="button"
                  onClick={run}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
                  style={{ background: `linear-gradient(90deg, ${ACCENT}, rgb(var(--accent-2)))`, color: 'rgb(var(--on-accent))' }}
                >
                  <Target className="h-4 w-4" /> {L.analyze}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Бейдж фазы анализа: предварительный / ожидание составов / по составам.
function PhaseChip({
  phase, startsAt, isFinished, L,
}: {
  phase: LvsPredictionDetail['phase'];
  startsAt: string;
  isFinished: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
}) {
  if (!phase || isFinished) return null; // после матча фаза не важна
  const ko = new Date(startsAt).getTime();
  const within60 = ko > Date.now() && ko - Date.now() <= 60 * 60_000;

  let icon = '📝', text = L.phasePreliminary, color = 'rgb(var(--fg-muted))', bg = 'rgb(var(--pitch-800))';
  if (phase === 'final') {
    icon = '✅'; text = L.phaseFinal; color = '#22c55e'; bg = '#22c55e1f';
  } else if (within60) {
    icon = '⏳'; text = L.awaitingLineupsShort; color = '#f59e0b'; bg = '#f59e0b1f';
  }
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: bg, color }}>
      {icon} {text}
    </span>
  );
}

// Компактная сводка в свёрнутой шапке: что есть внутри карточки.
function CollapsedSummary({
  prediction, running, isFinished, startsAt, L,
}: {
  prediction: LvsPredictionDetail | null;
  running: boolean;
  isFinished: boolean;
  startsAt: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
}) {
  if (running) {
    return (
      <span className="flex items-center gap-1.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
        <Sparkles className="h-3.5 w-3.5 animate-pulse" style={{ color: ACCENT }} /> {L.running}
      </span>
    );
  }
  if (!prediction) {
    return (
      <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
        {isFinished ? '—' : L.waiting}
      </span>
    );
  }
  const result = prediction.result;
  const statusLabel = result
    ? result.resultStatus === 'won' ? L.statusWon : result.resultStatus === 'partial' ? L.statusPartial : L.statusLost
    : null;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'rgb(var(--accent) / 0.14)', color: ACCENT }}>
        🏆 {prediction.outcomeLabel}
      </span>
      <span className="tabular rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-card))' }}>
        🎯 {prediction.score.home}:{prediction.score.away}
      </span>
      {result && statusLabel && (
        <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: `${RESULT_COLOR[result.resultStatus]}1f`, color: RESULT_COLOR[result.resultStatus] }}>
          {statusLabel}
        </span>
      )}
      <PhaseChip phase={prediction.phase} startsAt={startsAt} isFinished={isFinished} L={L} />
    </span>
  );
}

function TeamHead({ flag, name, logo, align }: { flag: string; name: string; logo: string | null; align: 'start' | 'end' }) {
  return (
    <div className={`flex min-w-0 flex-col items-center gap-1.5 ${align === 'end' ? 'sm:items-end' : 'sm:items-start'} items-center`}>
      {flag ? (
        <span className="text-4xl leading-none" aria-hidden>{flag}</span>
      ) : logo ? (
        <Image src={logo} alt={name} width={40} height={40} className="h-10 w-10 rounded object-contain" unoptimized />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}>
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="max-w-full truncate text-center text-sm font-bold sm:text-base" style={{ color: 'rgb(var(--fg-card))' }}>{name}</span>
    </div>
  );
}

function LvsPredictionView({
  prediction, homeName, awayName, homeFlag, awayFlag, startsAt, isFinished, canRerun, onRerun, L,
}: {
  prediction: LvsPredictionDetail;
  homeName: string;
  awayName: string;
  homeFlag: string;
  awayFlag: string;
  startsAt: string;
  isFinished: boolean;
  canRerun: boolean;
  onRerun: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
}) {
  const teamName = (team: 'home' | 'away') => (team === 'home' ? homeName : awayName);
  const teamFlag = (team: 'home' | 'away') => (team === 'home' ? homeFlag : awayFlag);

  // Текст исхода: победа конкретной команды с флагом или ничья.
  const outcome = prediction.outcome;
  const outcomeFlag = outcome === '1' ? homeFlag : outcome === '2' ? awayFlag : '';
  const outcomeWinner = outcome === '1' ? homeName : outcome === '2' ? awayName : null;

  return (
    <div className="space-y-3.5">
      {/* Фаза анализа: предварительный / ожидание составов / по составам */}
      <PhaseChip phase={prediction.phase} startsAt={startsAt} isFinished={isFinished} L={L} />

      {/* Исход + точный счёт — главные прогнозы */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Исход */}
        <div
          className="rounded-xl px-3.5 py-3"
          style={{ background: 'rgb(var(--accent) / 0.10)', border: `1px solid rgb(var(--accent) / 0.35)` }}
        >
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>
            <span className="text-sm" aria-hidden>🏆</span> {L.outcome}
          </p>
          <p className="flex items-center gap-1.5 text-base font-extrabold" style={{ color: 'rgb(var(--fg-card))' }}>
            {outcomeWinner ? (
              <>
                {outcomeFlag && <span className="text-lg leading-none" aria-hidden>{outcomeFlag}</span>}
                <span className="truncate">{outcomeWinner}</span>
              </>
            ) : (
              <>
                <span className="text-lg leading-none" aria-hidden>🤝</span>
                <span>{L.draw}</span>
              </>
            )}
          </p>
        </div>

        {/* Точный счёт */}
        <div
          className="rounded-xl px-3.5 py-3"
          style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}
        >
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
            <span className="text-sm" aria-hidden>🎯</span> {L.exactScore}
          </p>
          <p className="tabular text-2xl font-extrabold leading-none" style={{ color: 'rgb(var(--fg-primary))' }}>
            {prediction.score.home} : {prediction.score.away}
          </p>
        </div>
      </div>

      {/* Вероятности: Победа 1 / Ничья / Победа 2 */}
      <div className="grid grid-cols-3 gap-2">
        <ProbCard emoji={homeFlag || '🏠'} label={L.win1Short} v={prediction.probs.win1} active={outcome === '1'} />
        <ProbCard emoji="🤝" label={L.draw} v={prediction.probs.draw} active={outcome === 'X'} />
        <ProbCard emoji={awayFlag || '🚌'} label={L.win2Short} v={prediction.probs.win2} active={outcome === '2'} />
      </div>

      {/* Кто забьёт */}
      {prediction.scorers.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'rgb(var(--fg-card))' }}>
            <span className="text-sm" aria-hidden>⚽</span> {L.scorers}
          </p>
          <div className="space-y-1.5">
            {prediction.scorers.map((s, i) => (
              <ScorerCard key={i} s={s} teamName={teamName(s.team)} teamFlag={teamFlag(s.team)} resolved={prediction.result?.scorers.find((r) => r.name === s.name) ?? null} L={L} />
            ))}
          </div>
        </div>
      )}

      {/* Общий вывод LVS */}
      {(prediction.summary || prediction.rationale) && (
        <div className="rounded-xl px-4 py-3" style={{ background: 'rgb(var(--accent) / 0.07)', border: `1px solid rgb(var(--accent) / 0.25)` }}>
          <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ACCENT }}>
            <span className="text-sm" aria-hidden>🧠</span> {prediction.summary ? `${L.overall} LVS` : L.rationale}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>{prediction.summary ?? prediction.rationale}</p>
        </div>
      )}

      {/* Мнение каждой модели отдельно */}
      {prediction.modelViews.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: 'rgb(var(--fg-card))' }}>
            <span className="text-sm" aria-hidden>🤖</span> {L.modelsOpinion}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {prediction.modelViews.map((m, i) => (
              <ModelCard key={i} m={m} homeName={homeName} awayName={awayName} homeFlag={homeFlag} awayFlag={awayFlag} L={L} />
            ))}
          </div>
        </div>
      )}

      {/* Стартовые составы */}
      {prediction.lineups && (
        <details className="rounded-2xl px-4 py-3" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
          <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{L.lineups}</summary>
          <div className="mt-3 grid grid-cols-2 gap-4 text-xs" style={{ color: 'rgb(var(--fg-secondary))' }}>
            <LineupCol title={`${homeFlag} ${homeName}`.trim()} players={prediction.lineups.home.startingXI.map((p) => p.name)} formation={prediction.lineups.home.formation} />
            <LineupCol title={`${awayFlag} ${awayName}`.trim()} players={prediction.lineups.away.startingXI.map((p) => p.name)} formation={prediction.lineups.away.formation} />
          </div>
        </details>
      )}

      {canRerun && (
        <button
          type="button"
          onClick={onRerun}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors"
          style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}
        >
          <RefreshCw className="h-4 w-4" /> {L.rerun}
        </button>
      )}
    </div>
  );
}

function ProbCard({ emoji, label, v, active }: { emoji: string; label: string; v: number; active: boolean }) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 transition-transform"
      style={{
        background: active ? `linear-gradient(180deg, rgb(var(--accent) / 0.22), rgb(var(--accent) / 0.10))` : 'rgb(var(--pitch-800))',
        border: active ? `1.5px solid ${ACCENT}` : '1px solid rgb(var(--pitch-700))',
        transform: active ? 'scale(1.03)' : 'none',
      }}
    >
      <span className="text-base leading-none" aria-hidden>{emoji}</span>
      <span className="tabular text-lg font-extrabold leading-none" style={{ color: active ? ACCENT : 'rgb(var(--fg-card))' }}>{Math.round(v * 100)}%</span>
      <span className="text-center text-[10px] font-medium leading-tight" style={{ color: active ? ACCENT : 'rgb(var(--fg-muted))' }}>{label}</span>
    </div>
  );
}

function ScorerCard({
  s, teamName, teamFlag, resolved, L,
}: {
  s: LvsScorer;
  teamName: string;
  teamFlag: string;
  resolved: { scored: boolean } | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
}) {
  const position = formatPosition(s.position);
  const hit = resolved?.scored ?? false;
  return (
    <div
      className="rounded-xl px-3.5 py-2.5"
      style={hit
        ? { background: '#22c55e14', border: '1px solid #22c55e66' }
        : { background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'rgb(var(--fg-card))' }}>
          <span className="text-sm" aria-hidden>⚽</span>
          <span className="truncate">{s.name}</span>
        </span>
        {resolved ? (
          resolved.scored ? (
            <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: '#22c55e26', color: '#22c55e' }}>
              🎉 {L.scored}
            </span>
          ) : (
            <span className="shrink-0 text-xs font-bold" style={{ color: 'rgb(var(--fg-muted))' }}>
              ✗ {L.notScored}
            </span>
          )
        ) : (
          <span className="tabular shrink-0 rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: 'rgb(var(--accent) / 0.14)', color: ACCENT }}>
            {Math.round(s.probability * 100)}%
          </span>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs" style={{ color: 'rgb(var(--fg-secondary))' }}>
        <span className="flex items-center gap-1.5">
          {teamFlag && <span aria-hidden>{teamFlag}</span>}
          {teamName}
        </span>
        {position && (
          <span className="flex items-center gap-1">
            <span aria-hidden>📍</span> {position}
          </span>
        )}
      </div>
    </div>
  );
}

function ModelCard({
  m, homeName, awayName, homeFlag, awayFlag, L,
}: {
  m: LvsModelForecast;
  homeName: string;
  awayName: string;
  homeFlag: string;
  awayFlag: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
}) {
  const outcomeText = (o: LvsOutcome | null) =>
    o === '1' ? `${homeFlag} ${homeName}`.trim() : o === '2' ? `${awayFlag} ${awayName}`.trim() : o === 'X' ? `🤝 ${L.draw}` : '—';
  const score = m.scoreHome != null && m.scoreAway != null ? `${m.scoreHome}:${m.scoreAway}` : '—';

  return (
    <div className="rounded-xl p-3" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[13px] font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{modelLabel(m.modelId)}</span>
        {!m.error && (
          <span className="tabular shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(var(--accent) / 0.14)', color: ACCENT }}>
            {outcomeText(m.outcome)} · {score}
          </span>
        )}
      </div>
      {m.error ? (
        <p className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{L.noAnswer}</p>
      ) : (
        <div className="space-y-1 text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>
          {m.scorers.length > 0 && (
            <p>
              <span style={{ color: 'rgb(var(--fg-muted))' }}>⚽ {L.goalsBy}: </span>
              {m.scorers.join(', ')}
            </p>
          )}
          {m.rationale && (
            <p>
              <span style={{ color: 'rgb(var(--fg-muted))' }}>{L.comment}: </span>
              {m.rationale}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LineupCol({ title, players, formation }: { title: string; players: string[]; formation: string }) {
  return (
    <div>
      <p className="mb-1.5 font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{title}{formation ? ` · ${formation}` : ''}</p>
      <ul className="space-y-1">
        {players.slice(0, 11).map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );
}
