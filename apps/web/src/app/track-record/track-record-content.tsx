'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BarChart3, TrendingUp, Target, CheckCircle2, XCircle, MinusCircle,
  History, ShieldCheck, Percent, Coins, Flame, Trophy,
} from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';
import type { PredictionHistoryItem, BetResult } from '@ai-score/shared';

const CARD = {
  background: 'rgb(var(--pitch-900))',
  border: '1px solid rgb(var(--pitch-700))',
} as const;

const POSITIVE = '#22c55e';
const NEGATIVE = '#ef4444';
const WARN = '#f59e0b';
const MUTED = 'rgb(var(--fg-muted))';

const MARKET_LABEL: Record<string, string> = {
  '1X2': '1X2',
  DC: 'Двойной шанс',
  BTTS: 'Обе забьют',
  O_U_1_5: 'Тотал 1.5',
  O_U_2_5: 'Тотал 2.5',
  O_U_3_5: 'Тотал 3.5',
  HOME_TOTAL: 'Инд. тотал хозяев',
  AWAY_TOTAL: 'Инд. тотал гостей',
  CORNERS_OU: 'Угловые',
  CARDS_OU: 'Карточки',
  HANDICAP: 'Гандикап',
};

type Range = 'all' | '30' | '7';
type StatusFilter = 'all' | 'won' | 'lost' | 'pending';

function withinRange(createdAt: string, range: Range): boolean {
  if (range === 'all') return true;
  const days = range === '30' ? 30 : 7;
  return Date.now() - new Date(createdAt).getTime() <= days * 86_400_000;
}

interface Stats {
  analyses: number;
  bets: number;
  won: number;
  lost: number;
  push: number;
  pending: number;
  decided: number;
  hitRate: number;
  staked: number;
  profit: number;
  roi: number;
  avgOdds: number;
  bestWin: number;
  worstLoss: number;
  curType: BetResult | null;
  curCount: number;
}

function computeStats(items: PredictionHistoryItem[]): Stats {
  const bets = items.filter((i) => i.betResult !== 'no_bet');
  const won = bets.filter((i) => i.betResult === 'won').length;
  const lost = bets.filter((i) => i.betResult === 'lost').length;
  const push = bets.filter((i) => i.betResult === 'push').length;
  const pending = bets.filter((i) => i.betResult === 'pending').length;
  const decided = won + lost;
  const settledWithOdds = bets.filter(
    (i) => (i.betResult === 'won' || i.betResult === 'lost' || i.betResult === 'push') && i.odds != null && i.profit != null,
  );
  const staked = settledWithOdds.length;
  const profit = settledWithOdds.reduce((s, i) => s + (i.profit ?? 0), 0);
  // Средний коэф. — по всем предложенным ставкам с коэф. (вкл. ожидающие).
  const allWithOdds = bets.filter((i) => i.odds != null);
  const avgOdds = allWithOdds.length > 0 ? allWithOdds.reduce((s, i) => s + (i.odds ?? 0), 0) / allWithOdds.length : 0;

  // Серии — по решённым ставкам в хронологическом порядке.
  const seq = bets
    .filter((i) => i.betResult === 'won' || i.betResult === 'lost')
    .slice()
    .sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
    .map((i) => i.betResult);
  let bestWin = 0, worstLoss = 0, cw = 0, cl = 0;
  for (const r of seq) {
    if (r === 'won') { cw++; cl = 0; bestWin = Math.max(bestWin, cw); }
    else { cl++; cw = 0; worstLoss = Math.max(worstLoss, cl); }
  }
  let curType: BetResult | null = null, curCount = 0;
  for (let i = seq.length - 1; i >= 0; i--) {
    if (curType === null) { curType = seq[i]!; curCount = 1; }
    else if (seq[i] === curType) curCount++;
    else break;
  }

  return {
    analyses: items.length, bets: bets.length, won, lost, push, pending, decided,
    hitRate: decided > 0 ? won / decided : 0,
    staked, profit, roi: staked > 0 ? profit / staked : 0, avgOdds,
    bestWin, worstLoss, curType, curCount,
  };
}

const RESULT_META: Record<BetResult, { color: string; Icon: typeof CheckCircle2 }> = {
  won: { color: POSITIVE, Icon: CheckCircle2 },
  lost: { color: NEGATIVE, Icon: XCircle },
  push: { color: WARN, Icon: MinusCircle },
  pending: { color: MUTED, Icon: MinusCircle },
  no_bet: { color: MUTED, Icon: MinusCircle },
};

export function TrackRecordContent({ history = [] }: { history?: PredictionHistoryItem[] }) {
  const { t, locale } = useLocale();
  const tr = t.trackRecord;

  const [range, setRange] = useState<Range>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [league, setLeague] = useState<string>('all');
  const [market, setMarket] = useState<string>('all');

  const leagues = useMemo(
    () => [...new Set(history.map((h) => h.league).filter(Boolean))].sort(),
    [history],
  );
  const markets = useMemo(
    () => [...new Set(history.map((h) => h.market).filter(Boolean))],
    [history],
  );

  // Базовый набор для статистики: диапазон дат + лига + рынок (но НЕ статус —
  // иначе «сыгравшие» давали бы проходимость 100%).
  const statItems = useMemo(
    () => history.filter((h) =>
      withinRange(h.createdAt, range) &&
      (league === 'all' || h.league === league) &&
      (market === 'all' || h.market === market),
    ),
    [history, range, league, market],
  );
  const stats = useMemo(() => computeStats(statItems), [statItems]);

  // Список: тот же набор + фильтр по статусу.
  const listItems = useMemo(
    () => statItems.filter((h) => {
      if (status === 'all') return true;
      if (status === 'pending') return h.betResult === 'pending';
      return h.betResult === status;
    }),
    [statItems, status],
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-7 flex items-center gap-3.5">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
          style={{ background: 'rgb(var(--accent) / 0.12)', border: '1px solid rgb(var(--accent) / 0.25)' }}
        >
          <BarChart3 className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
        </span>
        <div>
          <h1 className="text-2xl font-bold leading-none tracking-tight" style={{ color: 'rgb(var(--fg-primary))' }}>{tr.history.title}</h1>
          <p className="mt-1.5 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{tr.subtitle}</p>
        </div>
      </div>

      <StatsSection stats={stats} range={range} setRange={setRange} />

      <FiltersBar
        status={status} setStatus={setStatus}
        league={league} setLeague={setLeague} leagues={leagues}
        market={market} setMarket={setMarket} markets={markets}
      />

      <HistoryList items={listItems} locale={locale} />

      {/* Honesty note */}
      <div className="mt-6 rounded-2xl px-5 py-4" style={CARD}>
        <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>
          <ShieldCheck className="h-4 w-4" style={{ color: 'rgb(var(--accent))' }} />
          {tr.trustTitle}
        </p>
        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>
          {tr.trust.map((item, i) => (
            <li key={i} className="flex gap-2"><span style={{ color: 'rgb(var(--accent))' }}>•</span>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Statistics block ────────────────────────────────────────────────────────
function StatsSection({ stats, range, setRange }: { stats: Stats; range: Range; setRange: (r: Range) => void }) {
  const { t } = useLocale();
  const s = t.trackRecord.stats;
  const ranges: [Range, string][] = [['all', s.rangeAll], ['30', s.range30], ['7', s.range7]];
  const hasBets = stats.bets > 0;

  return (
    <section className="rounded-2xl p-5" style={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5" style={{ color: 'rgb(var(--accent))' }} />
          <h2 className="text-base font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{s.title}</h2>
        </div>
        <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--pitch-800))' }}>
          {ranges.map(([r, label]) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className="rounded-lg px-3 py-1 text-xs font-semibold transition-colors"
              style={range === r
                ? { background: 'rgb(var(--accent))', color: '#04140a' }
                : { color: 'rgb(var(--fg-muted))' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!hasBets ? (
        <div className="mt-4 rounded-xl px-4 py-8 text-center" style={{ background: 'rgb(var(--pitch-800))' }}>
          <p className="text-sm font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{s.empty}</p>
          <p className="mt-1.5 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{s.emptyHint}</p>
          <p className="mt-3 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{s.analyses}: <b style={{ color: 'rgb(var(--fg-secondary))' }}>{stats.analyses}</b></p>
        </div>
      ) : (
        <>
          {/* Hero metrics */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <BigStat
              icon={TrendingUp}
              label={s.roi}
              value={stats.staked > 0 ? `${stats.roi >= 0 ? '+' : ''}${(stats.roi * 100).toFixed(1)}%` : '—'}
              color={stats.staked === 0 ? 'rgb(var(--fg-primary))' : stats.roi > 0 ? POSITIVE : stats.roi < 0 ? NEGATIVE : 'rgb(var(--fg-primary))'}
              hint={s.roiHint}
            />
            <BigStat
              icon={Percent}
              label={s.hitRate}
              value={stats.decided > 0 ? `${Math.round(stats.hitRate * 100)}%` : '—'}
              color={stats.decided > 0 && stats.hitRate >= 0.5 ? POSITIVE : 'rgb(var(--fg-primary))'}
              hint={`${stats.won}/${stats.decided}`}
            />
            <BigStat
              icon={Coins}
              label={s.profit}
              value={stats.staked > 0 ? `${stats.profit >= 0 ? '+' : ''}${stats.profit.toFixed(2)} ${s.units}` : '—'}
              color={stats.staked === 0 ? 'rgb(var(--fg-primary))' : stats.profit > 0 ? POSITIVE : stats.profit < 0 ? NEGATIVE : 'rgb(var(--fg-primary))'}
              hint={`${s.bets}: ${stats.staked}`}
            />
            <BigStat icon={Target} label={s.bets} value={String(stats.bets)} hint={`${s.analyses}: ${stats.analyses}`} />
            <BigStat icon={BarChart3} label={s.avgOdds} value={stats.avgOdds > 0 ? stats.avgOdds.toFixed(2) : '—'} />
            <BigStat
              icon={Flame}
              label={s.streak}
              value={stats.curType ? String(stats.curCount) : s.noStreak}
              color={stats.curType === 'won' ? POSITIVE : stats.curType === 'lost' ? NEGATIVE : 'rgb(var(--fg-primary))'}
              hint={stats.curType === 'won' ? s.wins(stats.curCount) : stats.curType === 'lost' ? s.losses(stats.curCount) : ''}
            />
          </div>

          {/* Won / lost / pending breakdown */}
          <div className="mt-3 grid grid-cols-3 gap-3">
            <CountPill label={s.won} value={stats.won} color={POSITIVE} />
            <CountPill label={s.lost} value={stats.lost} color={NEGATIVE} />
            <CountPill label={s.pending} value={stats.pending} color={MUTED} />
          </div>

          {/* Streak records */}
          {(stats.bestWin > 0 || stats.worstLoss > 0) && (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 rounded-xl px-4 py-3 text-xs" style={{ background: 'rgb(var(--pitch-800))' }}>
              <span style={{ color: 'rgb(var(--fg-muted))' }}>
                <Trophy className="mr-1 inline h-3.5 w-3.5" style={{ color: POSITIVE }} />
                {s.winStreak}: <b className="tabular" style={{ color: 'rgb(var(--fg-secondary))' }}>{stats.bestWin}</b>
              </span>
              <span style={{ color: 'rgb(var(--fg-muted))' }}>
                {s.lossStreak}: <b className="tabular" style={{ color: 'rgb(var(--fg-secondary))' }}>{stats.worstLoss}</b>
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function BigStat({
  icon: Icon, label, value, color = 'rgb(var(--fg-primary))', hint,
}: { icon: typeof TrendingUp; label: string; value: string; color?: string; hint?: string }) {
  return (
    <div className="rounded-xl p-3.5" style={{ background: 'rgb(var(--pitch-800))' }}>
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
        <Icon className="h-3.5 w-3.5" style={{ color: 'rgb(var(--accent))' }} /> {label}
      </p>
      <p className="tabular mt-1.5 text-2xl font-black leading-none" style={{ color }}>{value}</p>
      {hint && <p className="mt-1 truncate text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{hint}</p>}
    </div>
  );
}

function CountPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3.5 py-2.5" style={{ background: 'rgb(var(--pitch-800))' }}>
      <span className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</span>
      <span className="tabular text-lg font-bold" style={{ color }}>{value}</span>
    </div>
  );
}

// ── Filters ─────────────────────────────────────────────────────────────────
function FiltersBar({
  status, setStatus, league, setLeague, leagues, market, setMarket, markets,
}: {
  status: StatusFilter; setStatus: (s: StatusFilter) => void;
  league: string; setLeague: (l: string) => void; leagues: string[];
  market: string; setMarket: (m: string) => void; markets: string[];
}) {
  const { t } = useLocale();
  const f = t.trackRecord.filters;
  const statuses: [StatusFilter, string][] = [
    ['all', f.all], ['won', f.won], ['lost', f.lost], ['pending', f.pending],
  ];

  const selectStyle = {
    background: 'rgb(var(--pitch-800))',
    border: '1px solid rgb(var(--pitch-700))',
    color: 'rgb(var(--fg-secondary))',
  } as const;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <div className="flex gap-1 rounded-xl p-1" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
        {statuses.map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setStatus(v)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={status === v
              ? { background: 'rgb(var(--accent) / 0.18)', color: 'rgb(var(--accent))' }
              : { color: 'rgb(var(--fg-muted))' }}
          >
            {label}
          </button>
        ))}
      </div>

      {leagues.length > 1 && (
        <select value={league} onChange={(e) => setLeague(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none" style={selectStyle}>
          <option value="all">{f.allLeagues}</option>
          {leagues.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      )}

      {markets.length > 1 && (
        <select value={market} onChange={(e) => setMarket(e.target.value)} className="rounded-lg px-2.5 py-1.5 text-xs font-medium outline-none" style={selectStyle}>
          <option value="all">{f.allMarkets}</option>
          {markets.map((m) => <option key={m} value={m}>{MARKET_LABEL[m] ?? m}</option>)}
        </select>
      )}
    </div>
  );
}

// ── History list ────────────────────────────────────────────────────────────
function HistoryList({ items, locale }: { items: PredictionHistoryItem[]; locale: string }) {
  const { t } = useLocale();
  const h = t.trackRecord.history;

  const resultLabel: Record<BetResult, string> = {
    won: h.won, lost: h.lost, push: h.push, pending: h.pending, no_bet: h.noBet,
  };

  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl px-4 py-10 text-center" style={CARD}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: 'rgb(var(--pitch-800))' }}>
          <History className="h-6 w-6" style={{ color: 'rgb(var(--fg-muted))' }} />
        </span>
        <p className="mt-3 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{h.empty}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-2">
      {items.map((item) => {
        const meta = RESULT_META[item.betResult] ?? RESULT_META.no_bet;
        const dt = new Date(item.createdAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
          day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
        });
        return (
          <Link
            key={item.fixtureId + item.createdAt}
            href={`/fixtures/${item.fixtureId}`}
            className="block rounded-xl px-4 py-3 transition-colors hover:brightness-110"
            style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{item.match}</p>
                <p className="truncate text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{item.league} · {dt}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold" style={{ color: meta.color }}>
                <meta.Icon className="h-4 w-4" />
                {resultLabel[item.betResult] ?? h.noBet}
                {item.finalScore && (
                  <span className="tabular ml-1" style={{ color: 'rgb(var(--fg-secondary))' }}>{item.finalScore.home}:{item.finalScore.away}</span>
                )}
              </span>
            </div>

            {item.betResult !== 'no_bet' && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-xs" style={{ color: 'rgb(var(--fg-secondary))' }}>
                {h.pick}: <b style={{ color: 'rgb(var(--fg-card))' }}>{MARKET_LABEL[item.market] ?? item.market} — {item.pick}</b>
              </span>
              {item.odds != null && (
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold tabular" style={{ background: 'rgb(var(--accent))', color: '#04140a' }}>
                  {h.odds} {item.odds.toFixed(2)}
                </span>
              )}
              {item.probability != null && (
                <span className="tabular text-[11px] font-semibold" style={{ color: 'rgb(var(--accent))' }}>{Math.round(item.probability * 100)}%</span>
              )}
              {item.profit != null && (
                <span className="tabular ml-auto text-xs font-bold" style={{ color: item.profit > 0 ? POSITIVE : item.profit < 0 ? NEGATIVE : MUTED }}>
                  {item.profit >= 0 ? '+' : ''}{item.profit.toFixed(2)}
                </span>
              )}
            </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
