'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';
import { getTeamName } from '@/lib/team-names-ru';
import { getPlayerNameRu } from '@/lib/player-names-ru';
import { getCoach } from '@/lib/coaches-wc2026';
import type { EspnMatch } from '@/lib/espn';
import { cn } from '@/lib/utils';
import type { FixtureContext, StandingRow, H2HMatch, NewsArticle, TeamLineup, LineupPlayer, MatchStat, SummaryEvent } from '@/lib/api-client';
import type { MatchEvent } from '@ai-score/shared';

/* ── Accent palette (orange on black) ── */
const ACCENT = 'rgb(var(--accent))';        // brand / home side
const ACCENT_SOFT = 'rgb(var(--accent) / 0.14)';
const ACCENT_RING = 'rgb(var(--accent) / 0.45)';
const AWAY_C = '#3b82f6';        // away side in two-team comparisons

/* ── Section wrapper — dark header band + orange tick, then content ── */
export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ background: 'rgb(var(--pitch-950))', borderBottom: '1px solid rgb(var(--pitch-700))' }}
      >
        <span className="h-3.5 w-1 shrink-0 rounded-full" style={{ background: ACCENT }} />
        <h3 className="text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* ── Group label (localise "Group X" → "Группа X") ── */
function groupLabel(group: string | null, locale: string, fallback: string): string {
  if (!group) return fallback;
  return locale === 'ru' ? group.replace(/group/i, 'Группа') : group;
}

/* ── Group table ── */
export function GroupTable({ rows, highlightTeamId }: { rows: StandingRow[]; highlightTeamId: number }) {
  const { t, locale } = useLocale();
  const cols = t.fixture.cols;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ color: 'rgb(var(--fg-muted))' }}>
          <th className="py-1 text-left font-medium w-5">{cols.pos}</th>
          <th className="py-1 text-left font-medium">{cols.team}</th>
          <th className="py-1 text-center font-medium w-6">{cols.played}</th>
          <th className="py-1 text-center font-medium w-6">{cols.won}</th>
          <th className="py-1 text-center font-medium w-6">{cols.draw}</th>
          <th className="py-1 text-center font-medium w-6">{cols.lost}</th>
          <th className="py-1 text-center font-medium w-8">{cols.pts}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr
            key={r.team.id}
            className="border-t"
            style={{
              borderColor: 'rgb(var(--pitch-700))',
              background: r.team.id === highlightTeamId ? 'rgb(var(--pitch-800))' : 'transparent',
            }}
          >
            <td className="py-1.5 text-center" style={{ color: 'rgb(var(--fg-muted))' }}>{r.position}</td>
            <td className="py-1.5">
              <div className="flex items-center gap-1.5">
                {r.team.crest && <img src={r.team.crest} alt="" className="h-4 w-4 object-contain" />}
                <span style={{ color: r.team.id === highlightTeamId ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-card))' }}>
                  {getTeamName(r.team.name, r.team.shortName, locale, true)}
                </span>
              </div>
            </td>
            <td className="py-1.5 text-center tabular" style={{ color: 'rgb(var(--fg-muted))' }}>{r.playedGames}</td>
            <td className="py-1.5 text-center tabular" style={{ color: 'rgb(var(--fg-muted))' }}>{r.won}</td>
            <td className="py-1.5 text-center tabular" style={{ color: 'rgb(var(--fg-muted))' }}>{r.draw}</td>
            <td className="py-1.5 text-center tabular" style={{ color: 'rgb(var(--fg-muted))' }}>{r.lost}</td>
            <td className="py-1.5 text-center tabular font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{r.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── WC match list ── */
export function WcMatchList({ matches, focalTeamId }: { matches: FixtureContext['homeForm']; focalTeamId?: number }) {
  const { t } = useLocale();
  if (!matches.length) return <p className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{t.fixture.noData}</p>;
  return (
    <div className="divide-y" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
      {matches.map((m) => <FormMatchRow key={m.id} match={m} focalTeamId={focalTeamId} />)}
    </div>
  );
}

function getResult(match: FixtureContext['homeForm'][0], focalTeamId?: number): 'W' | 'L' | 'D' | null {
  if (match.scoreHome === null || match.scoreAway === null) return null;
  const isHome = match.homeTeam.id === focalTeamId;
  const isAway = match.awayTeam.id === focalTeamId;
  if (!isHome && !isAway) return null;
  const myGoals = isHome ? match.scoreHome : match.scoreAway;
  const oppGoals = isHome ? match.scoreAway : match.scoreHome;
  if (myGoals > oppGoals) return 'W';
  if (myGoals < oppGoals) return 'L';
  return 'D';
}

function ResultBadge({ result }: { result: 'W' | 'L' | 'D' | null }) {
  if (!result) return <span className="w-5 h-5 shrink-0 rounded text-[10px] font-bold flex items-center justify-center" style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>–</span>;
  const styles = {
    W: { bg: '#16a34a', color: '#fff' },
    L: { bg: '#dc2626', color: '#fff' },
    D: { bg: '#ca8a04', color: '#fff' },
  };
  return (
    <span className="w-5 h-5 shrink-0 rounded text-[10px] font-bold flex items-center justify-center"
      style={{ background: styles[result].bg, color: styles[result].color }}>
      {result}
    </span>
  );
}

export function FormMatchRow({ match, focalTeamId }: { match: FixtureContext['homeForm'][0]; focalTeamId?: number }) {
  const { locale } = useLocale();
  const date = new Date(match.startsAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const isPlayed = match.scoreHome !== null && match.scoreAway !== null;
  const result = getResult(match, focalTeamId);
  const homeTeamName = getTeamName(match.homeTeam.name, match.homeTeam.shortName, locale, true);
  const awayTeamName = getTeamName(match.awayTeam.name, match.awayTeam.shortName, locale, true);
  const isFocalHome = match.homeTeam.id === focalTeamId;
  const isFocalAway = match.awayTeam.id === focalTeamId;

  return (
    <div className="flex items-center gap-2 py-2 text-xs">
      {/* Date */}
      <span className="w-14 shrink-0 tabular" style={{ color: 'rgb(var(--fg-muted))' }}>{date}</span>
      {/* Competition */}
      <span className="w-10 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold text-center"
        style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
        ЧМ
      </span>
      {/* Home team */}
      <span className="flex-1 truncate text-right font-medium"
        style={{ color: isFocalHome ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>
        {homeTeamName}
      </span>
      {/* Score */}
      <span className="w-10 shrink-0 text-center font-mono font-bold tabular"
        style={{ color: 'rgb(var(--fg-primary))' }}>
        {isPlayed ? `${match.scoreHome}:${match.scoreAway}` : '–'}
      </span>
      {/* Away team */}
      <span className="flex-1 truncate font-medium"
        style={{ color: isFocalAway ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>
        {awayTeamName}
      </span>
      {/* Result badge */}
      <ResultBadge result={result} />
    </div>
  );
}

export function MiniMatchRowWc({ match }: { match: FixtureContext['homeForm'][0] }) {
  return <FormMatchRow match={match} />;
}

/* ── H2H summary stats ── */
export function H2HStats({ matches, homeLabel, awayLabel, ofLabel, homeFlag, awayFlag }: {
  matches: H2HMatch[];
  homeLabel: string;
  awayLabel: string;
  ofLabel: string;
  homeFlag?: string | null;
  awayFlag?: string | null;
}) {
  const { locale } = useLocale();
  // Items are normalised so our home team is always the home side.
  let homeWins = 0, draws = 0, awayWins = 0;
  for (const m of matches) {
    if (m.scoreHome === null || m.scoreAway === null) continue;
    if (m.scoreHome > m.scoreAway) homeWins++;
    else if (m.scoreHome === m.scoreAway) draws++;
    else awayWins++;
  }
  const total = homeWins + draws + awayWins;
  const L = locale === 'ru' ? { w: 'Победы', d: 'Ничьи' } : { w: 'Wins', d: 'Draws' };

  return (
    <div className="mb-3 rounded-xl p-3.5" style={{ background: 'rgb(var(--pitch-800))' }}>
      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
        <div className="flex min-w-0 items-center gap-1.5">
          {homeFlag && <img src={homeFlag} alt="" className="h-4 w-4 shrink-0 rounded-sm object-cover" />}
          <span className="truncate" style={{ color: 'rgb(var(--fg-card))' }}>{homeLabel}</span>
        </div>
        <span className="shrink-0 text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{ofLabel} {total}</span>
        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <span className="truncate" style={{ color: 'rgb(var(--fg-card))' }}>{awayLabel}</span>
          {awayFlag && <img src={awayFlag} alt="" className="h-4 w-4 shrink-0 rounded-sm object-cover" />}
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-1 overflow-hidden rounded-lg">
        <div className="flex h-8 items-center justify-center text-xs font-bold"
          style={{ width: `${total ? (homeWins / total) * 100 : 33}%`, minWidth: '2.25rem', background: ACCENT, color: '#1a0c02' }}>
          {homeWins}
        </div>
        <div className="flex h-8 flex-1 items-center justify-center text-xs font-bold"
          style={{ minWidth: '2.25rem', background: 'rgb(var(--pitch-600))', color: 'rgb(var(--fg-secondary))' }}>
          {draws}
        </div>
        <div className="flex h-8 items-center justify-center text-xs font-bold"
          style={{ width: `${total ? (awayWins / total) * 100 : 33}%`, minWidth: '2.25rem', background: AWAY_C, color: '#fff' }}>
          {awayWins}
        </div>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>
        <span>{L.w}</span>
        <span>{L.d}</span>
        <span>{L.w}</span>
      </div>
    </div>
  );
}

/* ── H2H row ── */
export function H2HRow({ match }: { match: H2HMatch }) {
  const { locale } = useLocale();
  const date = new Date(match.date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'short', year: '2-digit',
  });
  const isPlayed = match.scoreHome !== null && match.scoreAway !== null;
  const homeWin = isPlayed && match.scoreHome! > match.scoreAway!;
  const awayWin = isPlayed && match.scoreAway! > match.scoreHome!;

  return (
    <div className="flex items-center gap-2 py-2 text-xs border-b last:border-0" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
      <span className="w-16 shrink-0 tabular text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{date}</span>
      <span className="w-8 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold text-center truncate"
        style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
        {match.league?.slice(0, 4) ?? '–'}
      </span>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
        {match.homeTeam.logo && <img src={match.homeTeam.logo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
        <span className="truncate font-medium" style={{ color: homeWin ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>
          {getTeamName(match.homeTeam.name, null, locale)}
        </span>
      </div>
      <span className="w-10 shrink-0 text-center font-mono font-bold tabular" style={{ color: 'rgb(var(--fg-primary))' }}>
        {isPlayed ? `${match.scoreHome}:${match.scoreAway}` : '–'}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {match.awayTeam.logo && <img src={match.awayTeam.logo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
        <span className="truncate font-medium" style={{ color: awayWin ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>
          {getTeamName(match.awayTeam.name, null, locale)}
        </span>
      </div>
    </div>
  );
}

/* ── Competition short label ── */
function compShort(comp: string, locale: string): string {
  const c = comp.toLowerCase();
  if (c.includes('friendly')) return locale === 'ru' ? 'ТМ' : 'FI';
  if (c.includes('world cup') || c.includes('world championship')) return 'ЧМ';
  if (c.includes('nations')) return 'LN';
  if (c.includes('euro')) return 'EU';
  if (c.includes('copa')) return 'CA';
  if (c.includes('qualif')) return locale === 'ru' ? 'Квал' : 'Q';
  if (c.includes('confederat')) return 'КК';
  return comp.slice(0, 4);
}

/* ── FlashScore team form (normalised: focal team is home) ── */
export function FlashFormList({ matches, focalName }: { matches: H2HMatch[]; focalName: string }) {
  const { t, locale } = useLocale();
  if (!matches.length) return <p className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{t.fixture.noData}</p>;

  return (
    <div className="divide-y" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
      {matches.map((m) => {
        const date = new Date(m.date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
          day: 'numeric', month: 'short', year: '2-digit',
        });
        const isPlayed = m.scoreHome !== null && m.scoreAway !== null;
        const result: 'W' | 'L' | 'D' | null = !isPlayed ? null
          : m.scoreHome! > m.scoreAway! ? 'W' : m.scoreHome! < m.scoreAway! ? 'L' : 'D';

        return (
          <div key={m.id} className="flex items-center gap-2 py-2 text-xs">
            <span className="w-14 shrink-0 tabular text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{date}</span>
            <span className="w-9 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold text-center truncate"
              style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
              {compShort(m.league ?? '', locale)}
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
              <span className="truncate font-medium" style={{ color: 'rgb(var(--fg-primary))' }}>
                {focalName}
              </span>
              {m.homeTeam.logo && <img src={m.homeTeam.logo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
            </div>
            <span className="w-10 shrink-0 text-center font-mono font-bold tabular" style={{ color: 'rgb(var(--fg-primary))' }}>
              {isPlayed ? `${m.scoreHome}:${m.scoreAway}` : '–'}
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-1">
              {m.awayTeam.logo && <img src={m.awayTeam.logo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />}
              <span className="truncate font-medium" style={{ color: 'rgb(var(--fg-secondary))' }}>
                {getTeamName(m.awayTeam.name, null, locale)}
              </span>
            </div>
            <ResultBadge result={result} />
          </div>
        );
      })}
    </div>
  );
}

/* ── Match summary timeline (goals, cards, penalties) ── */
const SUMMARY_ICON: Record<string, string> = {
  goal: '⚽',
  penalty_goal: '⚽',
  penalty_missed: '❌',
  yellow: '🟨',
  red: '🟥',
};

function SummaryEventContent({ ev, align }: { ev: SummaryEvent; align: 'left' | 'right' }) {
  const { locale } = useLocale();
  const isPen = ev.type === 'penalty_goal' || ev.type === 'penalty_missed';
  return (
    <div className={cn('flex items-center gap-1.5', align === 'right' && 'flex-row-reverse')}>
      <span className="shrink-0">{SUMMARY_ICON[ev.type] ?? '•'}</span>
      <div className={cn('min-w-0', align === 'right' && 'text-right')}>
        <div className="truncate font-medium" style={{ color: 'rgb(var(--fg-card))' }}>
          {ev.player ? getPlayerNameRu(ev.player, locale) : ''}
          {isPen && <span style={{ color: 'rgb(var(--fg-muted))' }}> ({locale === 'ru' ? 'пен' : 'pen'})</span>}
        </div>
        {ev.assist && (
          <div className="truncate text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>
            {getPlayerNameRu(ev.assist, locale)}
          </div>
        )}
      </div>
    </div>
  );
}

export function SummaryPanel({ summary }: { summary: SummaryEvent[] | null }) {
  const { locale } = useLocale();
  const events = (summary ?? []).filter((e) => e.type !== 'marker' || (e.scoreHome ?? 0) + (e.scoreAway ?? 0) >= 0);
  // hide bare 0-0 markers when there are no real events (match not started)
  const realEvents = (summary ?? []).filter((e) => e.type !== 'marker');

  return (
    <SectionCard title={locale === 'ru' ? 'Ход матча' : 'Match Summary'}>
      {realEvents.length === 0 ? (
        <p className="text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
          {locale === 'ru' ? 'Матч ещё не начался — события появятся по ходу игры' : 'Match has not started — events will appear live'}
        </p>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
          {events.map((ev, i) => {
            if (ev.type === 'marker') {
              return (
                <div key={`m${i}`} className="flex items-center justify-center gap-2 py-2">
                  <span className="rounded px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>{ev.time}</span>
                  <span className="text-sm font-bold tabular" style={{ color: 'rgb(var(--fg-primary))' }}>
                    {ev.scoreHome}–{ev.scoreAway}
                  </span>
                </div>
              );
            }
            const isGoal = ev.type === 'goal' || ev.type === 'penalty_goal';
            return (
              <div key={i} className="flex items-center gap-2 py-2 text-xs">
                <span className="w-10 shrink-0 tabular text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{ev.time}</span>
                <div className="flex-1 min-w-0">
                  {ev.team === 'home' && <SummaryEventContent ev={ev} align="right" />}
                </div>
                <span className="w-10 shrink-0 text-center font-mono font-bold tabular" style={{ color: 'rgb(var(--fg-primary))' }}>
                  {isGoal ? `${ev.scoreHome}-${ev.scoreAway}` : ''}
                </span>
                <div className="flex-1 min-w-0">
                  {ev.team === 'away' && <SummaryEventContent ev={ev} align="left" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

/* ── Match statistics (LiveScore-style bars; zeros before kickoff) ── */
const STAT_DEFS: { key: string; ru: string; en: string }[] = [
  { key: 'Ball possession', ru: 'Владение (%)', en: 'Possession (%)' },
  { key: 'Total shots', ru: 'Удары всего', en: 'Total shots' },
  { key: 'Shots on target', ru: 'Удары в створ', en: 'Shots on target' },
  { key: 'Shots off target', ru: 'Удары мимо', en: 'Shots off target' },
  { key: 'Blocked shots', ru: 'Заблок. удары', en: 'Blocked shots' },
  { key: 'Corner kicks', ru: 'Угловые', en: 'Corner kicks' },
  { key: 'Offsides', ru: 'Офсайды', en: 'Offsides' },
  { key: 'Fouls', ru: 'Фолы', en: 'Fouls' },
  { key: 'Yellow cards', ru: 'Жёлтые карточки', en: 'Yellow cards' },
  { key: 'Goalkeeper saves', ru: 'Сэйвы вратаря', en: 'Goalkeeper saves' },
  { key: 'Throw ins', ru: 'Ауты', en: 'Throw ins' },
];

function statNum(v: string): number {
  const n = parseFloat(v.replace('%', '').trim());
  return isNaN(n) ? 0 : n;
}

function StatRow({ label, home, away }: { label: string; home: string; away: string }) {
  const h = statNum(home), a = statNum(away);
  const tot = h + a;
  const hp = tot ? (h / tot) * 100 : 0;
  const ap = tot ? (a / tot) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="tabular font-bold" style={{ color: h >= a && tot ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>{home}</span>
        <span style={{ color: 'rgb(var(--fg-muted))' }}>{label}</span>
        <span className="tabular font-bold" style={{ color: a >= h && tot ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>{away}</span>
      </div>
      <div className="flex h-1.5 gap-1">
        <div className="relative flex-1 overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-800))' }}>
          <div className="absolute right-0 top-0 h-full rounded-full" style={{ width: `${hp}%`, background: ACCENT }} />
        </div>
        <div className="relative flex-1 overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-800))' }}>
          <div className="absolute left-0 top-0 h-full rounded-full" style={{ width: `${ap}%`, background: AWAY_C }} />
        </div>
      </div>
    </div>
  );
}

export function StatsPanel({ stats }: { stats: MatchStat[] | null }) {
  const { locale } = useLocale();
  const map = new Map((stats ?? []).map((s) => [s.name, s]));
  return (
    <SectionCard title={locale === 'ru' ? 'Статистика матча' : 'Match Statistics'}>
      <div className="space-y-3">
        {STAT_DEFS.map((def) => {
          const s = map.get(def.key);
          return (
            <StatRow
              key={def.key}
              label={locale === 'ru' ? def.ru : def.en}
              home={s?.home ?? '0'}
              away={s?.away ?? '0'}
            />
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ── Lineup pitch (LiveScore-style formation) ── */
function splitLines(xi: LineupPlayer[], lines: number[]): LineupPlayer[][] {
  const groups: LineupPlayer[][] = [];
  let i = 0;
  for (const cnt of lines) {
    groups.push(xi.slice(i, i + cnt));
    i += cnt;
  }
  // any leftover (data mismatch) goes on a final row
  if (i < xi.length) groups.push(xi.slice(i));
  return groups;
}

function PitchToken({ p, side }: { p: LineupPlayer; side: 'home' | 'away' }) {
  const { locale } = useLocale();
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold"
        style={{
          background: side === 'home' ? 'rgba(10,12,16,0.82)' : '#f8fafc',
          color: side === 'home' ? '#fff' : '#0a0c10',
          border: side === 'home' ? `1.5px solid ${ACCENT}` : '1.5px solid rgba(255,255,255,0.65)',
          boxShadow: side === 'home' ? '0 0 8px rgb(var(--accent) / 0.4)' : '0 1px 3px rgba(0,0,0,0.35)',
        }}
      >
        {p.number ?? ''}
      </div>
      <span
        className="block w-[4.75rem] truncate text-center text-[10px] font-medium leading-none text-white"
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.95)' }}
      >
        {getPlayerNameRu(p.name, locale)}
      </span>
    </div>
  );
}

function PitchRow({ players, side }: { players: LineupPlayer[]; side: 'home' | 'away' }) {
  return (
    <div className="flex items-center justify-evenly px-2">
      {players.map((p) => <PitchToken key={p.id || p.name} p={p} side={side} />)}
    </div>
  );
}

/* ── Realistic pitch line markings (SVG overlay, viewBox 3:4) ── */
function PitchMarkings() {
  const L = { fill: 'none' as const, stroke: 'rgba(255,255,255,0.34)', strokeWidth: 1.3 };
  const SPOT = { fill: 'rgba(255,255,255,0.34)', stroke: 'none' as const };
  return (
    <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" style={{ zIndex: 1 }}>
      <rect x="9" y="9" width="282" height="382" rx="2" {...L} />
      <line x1="9" y1="200" x2="291" y2="200" {...L} />
      <circle cx="150" cy="200" r="42" {...L} />
      <circle cx="150" cy="200" r="1.8" {...SPOT} />
      {/* top box (home goal) */}
      <rect x="78" y="9" width="144" height="68" {...L} />
      <rect x="116" y="9" width="68" height="28" {...L} />
      <circle cx="150" cy="55" r="1.8" {...SPOT} />
      <path d="M 116 77 A 42 42 0 0 0 184 77" {...L} />
      {/* bottom box (away goal) */}
      <rect x="78" y="323" width="144" height="68" {...L} />
      <rect x="116" y="363" width="68" height="28" {...L} />
      <circle cx="150" cy="345" r="1.8" {...SPOT} />
      <path d="M 116 323 A 42 42 0 0 1 184 323" {...L} />
      {/* corner arcs */}
      <path d="M 9 17 A 8 8 0 0 0 17 9" {...L} />
      <path d="M 283 9 A 8 8 0 0 0 291 17" {...L} />
      <path d="M 17 391 A 8 8 0 0 0 9 383" {...L} />
      <path d="M 291 383 A 8 8 0 0 0 283 391" {...L} />
    </svg>
  );
}

function CornerFlag({ src, pos }: { src: string; pos: 'tl' | 'br' }) {
  return (
    <img
      src={src}
      alt=""
      className={cn(
        'pointer-events-none absolute h-6 w-8 rounded-sm object-contain',
        pos === 'tl' ? 'left-2.5 top-2.5' : 'bottom-2.5 right-2.5',
      )}
      style={{ zIndex: 3, filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.65))' }}
    />
  );
}

export function LineupPitch({ home, away, homeFlag, awayFlag }: {
  home: TeamLineup;
  away: TeamLineup;
  homeFlag?: string | null;
  awayFlag?: string | null;
}) {
  const homeGroups = splitLines(home.startingXI, home.lines);
  // Away attacks upward → GK nearest the bottom edge.
  const awayGroups = splitLines(away.startingXI, away.lines).reverse();

  return (
    <div
      className="relative mx-auto w-full max-w-[420px] overflow-hidden rounded-xl"
      style={{
        aspectRatio: '3 / 4',
        background: [
          'radial-gradient(135% 95% at 50% 42%, rgba(255,255,255,0.06), rgba(255,255,255,0) 58%)',
          'linear-gradient(180deg, rgba(0,0,0,0.22), rgba(0,0,0,0) 22%, rgba(0,0,0,0) 78%, rgba(0,0,0,0.22))',
          'repeating-linear-gradient(180deg, #2c774a 0, #2c774a 9.09%, #276c43 9.09%, #276c43 18.18%)',
        ].join(', '),
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.35)',
        border: '1px solid rgba(0,0,0,0.4)',
      }}
    >
      {/* Team flags in the corners — home top-left, away bottom-right */}
      {homeFlag && <CornerFlag src={homeFlag} pos="tl" />}
      {awayFlag && <CornerFlag src={awayFlag} pos="br" />}

      {/* Field markings */}
      <PitchMarkings />

      {/* Players (above markings & crests) */}
      <div className="relative flex h-full flex-col" style={{ zIndex: 2 }}>
        <div className="flex flex-1 flex-col justify-evenly py-2">
          {homeGroups.map((row, i) => <PitchRow key={`h${i}`} players={row} side="home" />)}
        </div>
        <div className="flex flex-1 flex-col justify-evenly py-2">
          {awayGroups.map((row, i) => <PitchRow key={`a${i}`} players={row} side="away" />)}
        </div>
      </div>
    </div>
  );
}

/* ── Substitutes / coaches / injuries (LiveScore-style blocks) ── */
function SubColumn({ players }: { players: LineupPlayer[] }) {
  const { locale } = useLocale();
  return (
    <div className="space-y-1.5">
      {players.map((p) => (
        <div key={p.id || p.name} className="flex items-center gap-2 text-xs">
          <span className="w-5 shrink-0 text-right font-mono" style={{ color: 'rgb(var(--fg-muted))' }}>
            {p.number ?? ''}
          </span>
          <span style={{ color: 'rgb(var(--fg-card))' }}>{getPlayerNameRu(p.name, locale)}</span>
        </div>
      ))}
    </div>
  );
}

/* Map a roster position to a pitch line: 0=GK, 1=DEF, 2=MID, 3=FWD. */
function squadLineIndex(position: string | null): 0 | 1 | 2 | 3 {
  const p = (position ?? '').toLowerCase();
  if (p.includes('keeper') || p === 'gk') return 0;
  if (p.includes('back') || p.includes('defence') || p.includes('defender')) return 1;
  if (p.includes('midfield')) return 2;
  return 3; // forward / winger / offence / striker / unknown
}

type RosterPlayer = { id: string | number; name: string; position: string | null; shirtNumber: number | null };

/** Approximate XI from a full roster (no starter data) — a 4-3-3 by position. */
export function squadToProbableLineup(
  squad: RosterPlayer[],
  coach: string | null,
): TeamLineup | null {
  if (squad.length < 11) return null;
  const gk: RosterPlayer[] = [], def: RosterPlayer[] = [], mid: RosterPlayer[] = [], fwd: RosterPlayer[] = [];
  for (const p of squad) {
    const i = squadLineIndex(p.position);
    (i === 0 ? gk : i === 1 ? def : i === 2 ? mid : fwd).push(p);
  }
  // Lower shirt numbers ≈ first-choice players → pick them for the probable XI.
  const byNum = (a: RosterPlayer, b: RosterPlayer) => (a.shirtNumber ?? 99) - (b.shirtNumber ?? 99);
  gk.sort(byNum); def.sort(byNum); mid.sort(byNum); fwd.sort(byNum);
  const groups = [gk.slice(0, 1), def.slice(0, 4), mid.slice(0, 3), fwd.slice(0, 3)];
  const lines = groups.map((g) => g.length);
  const xi = groups.flat();
  const chosen = new Set(xi.map((p) => p.id));
  const subs = squad.filter((p) => !chosen.has(p.id));
  const toP = (p: RosterPlayer): LineupPlayer => ({
    id: String(p.id), name: p.name, number: p.shirtNumber,
  });
  return {
    formation: lines.slice(1).join('-'),
    lines,
    coach,
    startingXI: xi.map(toP),
    substitutes: subs.map(toP),
  };
}

export function LineupSection({ lineups, homeName, awayName, homeFlag, awayFlag, probable = false }: {
  lineups: NonNullable<FixtureContext['lineups']>;
  homeName: string;
  awayName: string;
  homeFlag?: string | null;
  awayFlag?: string | null;
  probable?: boolean;
}) {
  const { locale } = useLocale();
  const L = locale === 'ru'
    ? { subs: 'Запасные', injuries: 'Травмы и дисквалификации', coaches: 'Тренеры', none: 'Нет данных',
        note: 'Ожидаемый состав — обновится реальной расстановкой перед матчем' }
    : { subs: 'Substitutes', injuries: 'Injuries & Suspensions', coaches: 'Coaches', none: 'No data',
        note: 'Probable lineup — updates with the confirmed XI before kickoff' };

  return (
    <div className="space-y-4">
      {/* Pitch + formation header */}
      <SectionCard title={`${homeName} ${lineups.home.formation ? `(${lineups.home.formation})` : ''} — ${awayName} ${lineups.away.formation ? `(${lineups.away.formation})` : ''}`.trim()}>
        {probable && (
          <p className="mb-3 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>⚠ {L.note}</p>
        )}
        <LineupPitch home={lineups.home} away={lineups.away} homeFlag={homeFlag} awayFlag={awayFlag} />
      </SectionCard>

      {/* Substitutes — labelled per team */}
      {(lineups.home.substitutes.length > 0 || lineups.away.substitutes.length > 0) && (
        <SectionCard title={L.subs}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl p-3" style={{ background: 'rgb(var(--pitch-950))', border: '1px solid rgb(var(--pitch-700))' }}>
              <p className="mb-2 text-xs font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{homeName}</p>
              <SubColumn players={lineups.home.substitutes} />
            </div>
            <div className="rounded-xl p-3" style={{ background: 'rgb(var(--pitch-950))', border: '1px solid rgb(var(--pitch-700))' }}>
              <p className="mb-2 text-xs font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{awayName}</p>
              <SubColumn players={lineups.away.substitutes} />
            </div>
          </div>
        </SectionCard>
      )}

      {/* Injuries & suspensions — intentionally empty for now */}
      <SectionCard title={L.injuries}>
        <p className="text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{L.none}</p>
      </SectionCard>

      {/* Coaches — labelled per team */}
      {(lineups.home.coach || lineups.away.coach) && (
        <SectionCard title={L.coaches}>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="mb-1 text-xs font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{homeName}</p>
              <span style={{ color: 'rgb(var(--fg-card))' }}>{lineups.home.coach ?? '—'}</span>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>{awayName}</p>
              <span style={{ color: 'rgb(var(--fg-card))' }}>{lineups.away.coach ?? '—'}</span>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ── Squad card ── */
export function SquadCard({ title, squad, coach, teamNameEn, teamId }: {
  title: string;
  squad: FixtureContext['homeSquad'];
  coach: { name: string } | null;
  teamNameEn?: string;
  teamId?: number;
}) {
  const { t, locale } = useLocale();
  const positions = t.fixture.positions;

  const coachName = getCoach(teamNameEn ?? title, teamId, coach, locale);

  const grouped = squad.reduce<Record<string, typeof squad>>((acc, p) => {
    const pos = p.position ?? 'Other';
    (acc[pos] ??= []).push(p);
    return acc;
  }, {});

  return (
    <SectionCard title={`${t.fixture.squad} · ${title}`}>
      {coachName && (
        <p className="mb-3 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
          {t.fixture.coach}: <span style={{ color: 'rgb(var(--fg-secondary))' }}>{coachName}</span>
        </p>
      )}
      {squad.length === 0 ? (
        <p className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{t.fixture.noSquad}</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(grouped).map(([pos, players]) => (
            <div key={pos}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgb(var(--fg-muted))' }}>
                {positions[pos] ?? pos}
              </p>
              <div className="space-y-1">
                {players.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-xs">
                    {p.shirtNumber != null && (
                      <span className="w-5 shrink-0 text-right font-mono" style={{ color: 'rgb(var(--fg-muted))' }}>{p.shirtNumber}</span>
                    )}
                    <span style={{ color: 'rgb(var(--fg-card))' }}>{getPlayerNameRu(p.name, locale)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ── News card ── */
export function NewsCard({ article }: { article: NewsArticle }) {
  const { locale } = useLocale();
  const date = new Date(article.publishedAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  return (
    <a href={article.url} target="_blank" rel="noopener noreferrer"
      className="flex gap-3 rounded-xl p-3 transition-opacity hover:opacity-80"
      style={{ background: 'rgb(var(--pitch-800))' }}
    >
      {article.urlToImage && (
        <img src={article.urlToImage} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'rgb(var(--fg-card))' }}>{article.title}</p>
        {article.description && (
          <p className="mt-1 text-xs line-clamp-2" style={{ color: 'rgb(var(--fg-muted))' }}>{article.description}</p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{article.source}</span>
          <span className="text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>·</span>
          <span className="text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{date}</span>
          <ExternalLink className="ml-auto h-3 w-3" style={{ color: 'rgb(var(--fg-muted))' }} />
        </div>
      </div>
    </a>
  );
}

/* ── Event timeline ── */
const EVENT_ICON: Record<string, string> = {
  goal: '⚽', own_goal: '⚽', penalty: '⚽', missed_penalty: '❌',
  yellow_card: '🟨', red_card: '🟥', yellow_red_card: '🟨🟥', substitution: '🔄',
};

export function EventTimeline({ events }: { events: MatchEvent[] }) {
  const { t, locale } = useLocale();
  return (
    <div className="space-y-2">
      {events.map((e) => (
        <div key={e.id} className="flex items-center gap-3 text-sm">
          <span className="tabular w-10 shrink-0 text-right text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{e.minute}′</span>
          <span>{EVENT_ICON[e.type] ?? '•'}</span>
          <span style={{ color: 'rgb(var(--fg-secondary))' }}>{e.player?.name ? getPlayerNameRu(e.player.name, locale) : '—'}</span>
          {e.type === 'substitution' && e.assist && <span style={{ color: 'rgb(var(--fg-muted))' }}>↓ {getPlayerNameRu(e.assist.name, locale)}</span>}
          <span className={cn('ml-auto text-xs', e.team === 'home' ? 'text-electric-500' : '')}
            style={e.team !== 'home' ? { color: 'rgb(var(--fg-muted))' } : {}}>
            {e.team === 'home' ? t.fixture.home : t.fixture.away}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── ESPN form list (last matches for a team) ── */
export function EspnFormList({
  matches, dbMatches, focalTeamId,
}: {
  matches: EspnMatch[];
  dbMatches: FixtureContext['homeForm'];
  focalTeamId?: number;
}) {
  const { t, locale } = useLocale();
  const compLabel = (comp: string) => {
    if (comp.toLowerCase().includes('friendly')) return locale === 'ru' ? 'ТМ' : 'FI';
    if (comp.toLowerCase().includes('world cup 2026') || comp.toLowerCase().includes('wc')) return 'ЧМ';
    if (comp.toLowerCase().includes('world cup')) return 'ЧМ';
    if (comp.toLowerCase().includes('nations')) return 'LN';
    if (comp.toLowerCase().includes('confederat')) return 'КК';
    return comp.slice(0, 3).toUpperCase();
  };

  // Combine ESPN matches + DB WC matches, deduplicate by date+teams, sort desc
  const dbRows = dbMatches
    .filter(m => m.scoreHome !== null || m.scoreAway !== null)
    .map(m => ({
      id: String(m.id),
      date: m.startsAt,
      competition: locale === 'ru' ? 'ЧМ 2026' : 'WC 2026',
      homeTeam: { name: m.homeTeam.name, logo: m.homeTeam.logo ?? null, espnId: '' },
      awayTeam: { name: m.awayTeam.name, logo: m.awayTeam.logo ?? null, espnId: '' },
      homeScore: m.scoreHome,
      awayScore: m.scoreAway,
      focalTeamIsHome: m.homeTeam.id === focalTeamId,
      result: m.scoreHome !== null && m.scoreAway !== null
        ? (m.homeTeam.id === focalTeamId
          ? (m.scoreHome > m.scoreAway ? 'W' : m.scoreHome < m.scoreAway ? 'L' : 'D')
          : (m.awayTeam.id === focalTeamId
            ? (m.scoreAway > m.scoreHome ? 'W' : m.scoreAway < m.scoreHome ? 'L' : 'D')
            : undefined))
        : undefined,
    } as EspnMatch));

  const all = [...matches, ...dbRows]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  if (!all.length) {
    return <p className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{t.fixture.noData}</p>;
  }

  return (
    <div className="divide-y" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
      {all.map((m, i) => {
        const date = new Date(m.date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
          day: 'numeric', month: 'short', timeZone: 'UTC',
        });
        const homeName = getTeamName(m.homeTeam.name, null, locale, true);
        const awayName = getTeamName(m.awayTeam.name, null, locale, true);
        const isPlayed = m.homeScore !== null && m.awayScore !== null;

        return (
          <div key={`${m.id}-${i}`} className="flex items-center gap-2 py-1.5 text-xs">
            <span className="w-14 shrink-0 tabular text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{date}</span>
            <span className="w-8 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold text-center"
              style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
              {compLabel(m.competition)}
            </span>
            <span className="flex-1 truncate text-right font-medium"
              style={{ color: m.focalTeamIsHome ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>
              {homeName}
            </span>
            <span className="w-10 shrink-0 text-center font-mono font-bold tabular"
              style={{ color: 'rgb(var(--fg-primary))' }}>
              {isPlayed ? `${m.homeScore}:${m.awayScore}` : '–'}
            </span>
            <span className="flex-1 truncate font-medium"
              style={{ color: !m.focalTeamIsHome ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}>
              {awayName}
            </span>
            <ResultBadge result={isPlayed ? (m.result ?? null) : null} />
          </div>
        );
      })}
    </div>
  );
}

/* ── H2H section ── */
export function H2HSection({ ctx, homeTeam, awayTeam, espnH2h = [] }: {
  ctx: FixtureContext;
  homeTeam: { name: string; shortName: string };
  awayTeam: { name: string; shortName: string };
  espnH2h?: EspnMatch[];
}) {
  const { t, locale } = useLocale();

  // Use ESPN H2H if internal is empty
  const hasInternalH2h = ctx.h2hAll.length > 0;
  const hasEspnH2h = espnH2h.length > 0;

  if (!hasInternalH2h && !hasEspnH2h && ctx.h2hWc.length === 0) {
    return (
      <SectionCard title={t.fixture.h2h}>
        <p className="text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
          {locale === 'ru' ? 'Команды ещё не встречались' : 'These teams have never met'}
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={t.fixture.h2h}>
      {hasInternalH2h ? (
        <>
          <H2HStats
            matches={ctx.h2hAll}
            homeLabel={getTeamName(homeTeam.name, homeTeam.shortName, locale, true)}
            awayLabel={getTeamName(awayTeam.name, awayTeam.shortName, locale, true)}
            ofLabel={locale === 'ru' ? 'из' : 'of'}
          />
          <div className="mt-3 divide-y" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
            {ctx.h2hAll.map((m) => <H2HRow key={m.id} match={m} />)}
          </div>
        </>
      ) : hasEspnH2h ? (
        <EspnH2HList matches={espnH2h} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} />
      ) : (
        <div className="space-y-1">
          {ctx.h2hWc.map((m) => (
            <Link key={m.id} href={`/fixtures/${m.id}`}>
              <FormMatchRow match={m} />
            </Link>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/* ── ESPN H2H list ── */
function EspnH2HList({ matches, homeTeamName, awayTeamName }: {
  matches: EspnMatch[];
  homeTeamName: string;
  awayTeamName: string;
}) {
  const { locale } = useLocale();

  // Count W/L/D for summary
  let hw = 0, aw = 0, d = 0;
  for (const m of matches) {
    if (m.homeScore === null || m.awayScore === null) continue;
    if (m.homeScore > m.awayScore) hw++;
    else if (m.homeScore < m.awayScore) aw++;
    else d++;
  }
  const total = hw + aw + d;

  const firstHomeName = getTeamName(homeTeamName, null, locale, false);
  const firstAwayName = getTeamName(awayTeamName, null, locale, false);

  return (
    <>
      {total > 0 && (
        <div className="mb-3 rounded-xl p-3" style={{ background: 'rgb(var(--pitch-800))' }}>
          <div className="flex items-center justify-between text-xs font-medium">
            <span style={{ color: 'rgb(var(--fg-secondary))' }}>{firstHomeName.split(' ')[0]}</span>
            <span style={{ color: 'rgb(var(--fg-muted))' }}>
              {locale === 'ru' ? `из ${total} матчей` : `of ${total} games`}
            </span>
            <span style={{ color: 'rgb(var(--fg-secondary))' }}>{firstAwayName.split(' ')[0]}</span>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <div className="flex h-7 items-center justify-center rounded-lg text-xs font-bold"
              style={{ width: `${total ? (hw/total)*100 : 33}%`, minWidth: '2rem', background: '#22c55e22', color: '#4ade80' }}>
              {hw}
            </div>
            <div className="flex h-7 flex-1 items-center justify-center rounded-lg text-xs font-bold"
              style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
              {d}
            </div>
            <div className="flex h-7 items-center justify-center rounded-lg text-xs font-bold"
              style={{ width: `${total ? (aw/total)*100 : 33}%`, minWidth: '2rem', background: '#3b82f622', color: '#60a5fa' }}>
              {aw}
            </div>
          </div>
        </div>
      )}
      <div className="divide-y" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
        {matches.map((m, i) => {
          const date = new Date(m.date).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric', month: 'short', year: '2-digit',
          });
          const homeName = getTeamName(m.homeTeam.name, null, locale, true);
          const awayName = getTeamName(m.awayTeam.name, null, locale, true);
          const isPlayed = m.homeScore !== null && m.awayScore !== null;
          const compLabel = m.competition?.slice(0, 20) ?? '';

          return (
            <div key={`${m.id}-${i}`} className="flex items-center gap-2 py-1.5 text-xs">
              <span className="w-16 shrink-0 tabular text-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>{date}</span>
              <span className="w-10 shrink-0 rounded px-1 py-0.5 text-[9px] font-bold text-center truncate"
                style={{ background: 'rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
                {compLabel.includes('riend') ? (locale === 'ru' ? 'ТМ' : 'FI')
                  : compLabel.includes('orld') ? 'WC'
                  : compLabel.slice(0, 4).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-right font-medium" style={{ color: 'rgb(var(--fg-secondary))' }}>
                {homeName}
              </span>
              <span className="w-10 shrink-0 text-center font-mono font-bold tabular" style={{ color: 'rgb(var(--fg-primary))' }}>
                {isPlayed ? `${m.homeScore}:${m.awayScore}` : '–'}
              </span>
              <span className="flex-1 truncate font-medium" style={{ color: 'rgb(var(--fg-secondary))' }}>
                {awayName}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── H2H + form combined (LiveScore-style: H2H · Team1 · Team2 pills) ── */
export function MatchH2HForm({ ctx, homeTeam, awayTeam, espnH2h = [], espnHomeForm = [], espnAwayForm = [] }: {
  ctx: FixtureContext;
  homeTeam: { id?: number; name: string; shortName: string };
  awayTeam: { id?: number; name: string; shortName: string };
  espnH2h?: EspnMatch[];
  espnHomeForm?: EspnMatch[];
  espnAwayForm?: EspnMatch[];
}) {
  const { locale } = useLocale();
  const [sub, setSub] = useState<'h2h' | 'home' | 'away'>('h2h');
  const homeShort = getTeamName(homeTeam.name, homeTeam.shortName, locale, true);
  const awayShort = getTeamName(awayTeam.name, awayTeam.shortName, locale, true);
  // Focal team flag = the (normalised) home side of that team's own form list.
  const homeFlag = ctx.homeFormFlash[0]?.homeTeam.logo || ctx.h2hAll[0]?.homeTeam.logo || null;
  const awayFlag = ctx.awayFormFlash[0]?.homeTeam.logo || ctx.h2hAll[0]?.awayTeam.logo || null;

  const pills: { id: 'h2h' | 'home' | 'away'; label: string; flag: string | null }[] = [
    { id: 'h2h', label: 'H2H', flag: null },
    { id: 'home', label: homeShort, flag: homeFlag },
    { id: 'away', label: awayShort, flag: awayFlag },
  ];

  let h2hContent: React.ReactNode;
  if (ctx.h2hAll.length > 0) {
    h2hContent = (
      <>
        <H2HStats
          matches={ctx.h2hAll}
          homeLabel={homeShort}
          awayLabel={awayShort}
          ofLabel={locale === 'ru' ? 'из' : 'of'}
          homeFlag={homeFlag}
          awayFlag={awayFlag}
        />
        <div className="mt-3 divide-y" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
          {ctx.h2hAll.map((m) => <H2HRow key={m.id} match={m} />)}
        </div>
      </>
    );
  } else if (espnH2h.length > 0) {
    h2hContent = <EspnH2HList matches={espnH2h} homeTeamName={homeTeam.name} awayTeamName={awayTeam.name} />;
  } else if (ctx.h2hWc.length > 0) {
    h2hContent = (
      <div className="space-y-1">
        {ctx.h2hWc.map((m) => <FormMatchRow key={m.id} match={m} />)}
      </div>
    );
  } else {
    h2hContent = (
      <p className="text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
        {locale === 'ru' ? 'Команды ещё не встречались' : 'These teams have never met'}
      </p>
    );
  }

  const homeForm = ctx.homeFormFlash.length > 0
    ? <FlashFormList matches={ctx.homeFormFlash} focalName={homeShort} />
    : <EspnFormList matches={espnHomeForm} dbMatches={ctx.homeForm} focalTeamId={homeTeam.id} />;
  const awayForm = ctx.awayFormFlash.length > 0
    ? <FlashFormList matches={ctx.awayFormFlash} focalName={awayShort} />
    : <EspnFormList matches={espnAwayForm} dbMatches={ctx.awayForm} focalTeamId={awayTeam.id} />;

  const content = sub === 'h2h' ? h2hContent : sub === 'home' ? homeForm : awayForm;

  return (
    <SectionCard title={locale === 'ru' ? 'Очные встречи и форма' : 'Head-to-head & form'}>
      <div className="mb-3 flex gap-2 overflow-x-auto">
        {pills.map((p) => {
          const active = p.id === sub;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSub(p.id)}
              className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              style={active
                ? { background: ACCENT_SOFT, color: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT_RING}` }
                : { background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}
            >
              {p.flag && <img src={p.flag} alt="" className="h-4 w-4 rounded-sm object-cover" />}
              {p.label}
            </button>
          );
        })}
      </div>
      {content}
    </SectionCard>
  );
}

/* ── Context sections wrapper ── */
export function ContextDisplay({ ctx, homeTeam, awayTeam, espnH2h = [], espnHomeForm = [], espnAwayForm = [] }: {
  ctx: FixtureContext;
  homeTeam: { id?: number; name: string; shortName: string };
  awayTeam: { id?: number; name: string; shortName: string };
  espnH2h?: EspnMatch[];
  espnHomeForm?: EspnMatch[];
  espnAwayForm?: EspnMatch[];
}) {
  const { t, locale } = useLocale();

  const [activeTab, setActiveTab] = useState('lineups');

  const homeRu = getTeamName(homeTeam.name, homeTeam.shortName, locale);
  const awayRu = getTeamName(awayTeam.name, awayTeam.shortName, locale);
  const homeRuShort = getTeamName(homeTeam.name, homeTeam.shortName, locale, true);
  const awayRuShort = getTeamName(awayTeam.name, awayTeam.shortName, locale, true);

  // Team crests/flags for the pitch watermark, derived from the loaded data.
  const homeFlag = ctx.homeFormFlash[0]?.homeTeam.logo || ctx.h2hAll[0]?.homeTeam.logo || null;
  const awayFlag = ctx.awayFormFlash[0]?.homeTeam.logo || ctx.h2hAll[0]?.awayTeam.logo || null;

  /* ── Build each section panel ── */
  const lineupsPanel = (() => {
    if (ctx.lineups) {
      return <LineupSection lineups={ctx.lineups} homeName={homeRuShort} awayName={awayRuShort} homeFlag={homeFlag} awayFlag={awayFlag} />;
    }
    const homeCoach = getCoach(homeTeam.name, homeTeam.id, ctx.homeCoach, locale);
    const awayCoach = getCoach(awayTeam.name, awayTeam.id, ctx.awayCoach, locale);
    // Prefer FlashScore roster (has shirt numbers); fall back to football-data.
    const homeProb = squadToProbableLineup(ctx.homeSquadFlash.length ? ctx.homeSquadFlash : ctx.homeSquad, homeCoach);
    const awayProb = squadToProbableLineup(ctx.awaySquadFlash.length ? ctx.awaySquadFlash : ctx.awaySquad, awayCoach);
    if (homeProb && awayProb) {
      return (
        <LineupSection
          lineups={{ home: homeProb, away: awayProb }}
          homeName={homeRuShort}
          awayName={awayRuShort}
          homeFlag={homeFlag}
          awayFlag={awayFlag}
          probable
        />
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <SquadCard title={homeRu} squad={ctx.homeSquad} coach={ctx.homeCoach}
          teamNameEn={homeTeam.name} teamId={homeTeam.id} />
        <SquadCard title={awayRu} squad={ctx.awaySquad} coach={ctx.awayCoach}
          teamNameEn={awayTeam.name} teamId={awayTeam.id} />
      </div>
    );
  })();

  const hasGroup = !!(ctx.homeGroup || ctx.awayGroup);
  const groupPanel = hasGroup ? (
    <div className="grid gap-4 sm:grid-cols-2">
      {ctx.homeGroup && (
        <SectionCard title={`${t.fixture.table} · ${groupLabel(ctx.homeGroup.group, locale, t.fixture.group)}`}>
          <GroupTable rows={ctx.homeGroup.table} highlightTeamId={ctx.homeGroup.teamRow.team.id} />
        </SectionCard>
      )}
      {ctx.awayGroup && ctx.awayGroup.group !== ctx.homeGroup?.group && (
        <SectionCard title={`${t.fixture.table} · ${groupLabel(ctx.awayGroup.group, locale, t.fixture.group)}`}>
          <GroupTable rows={ctx.awayGroup.table} highlightTeamId={ctx.awayGroup.teamRow.team.id} />
        </SectionCard>
      )}
    </div>
  ) : null;

  const h2hPanel = (
    <MatchH2HForm
      ctx={ctx}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      espnH2h={espnH2h}
      espnHomeForm={espnHomeForm}
      espnAwayForm={espnAwayForm}
    />
  );

  const statsPanel = <StatsPanel stats={ctx.stats} />;

  const summaryPanel = <SummaryPanel summary={ctx.summary} />;

  const newsPanel = (
    <SectionCard title={t.fixture.news}>
      {ctx.news.length > 0 ? (
        <div className="space-y-3">
          {ctx.news.map((article, i) => <NewsCard key={i} article={article} />)}
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{t.fixture.newsEmpty}</p>
      )}
    </SectionCard>
  );

  const tabs: { id: string; label: string; panel: React.ReactNode }[] = [
    { id: 'summary', label: locale === 'ru' ? 'Ход матча' : 'Summary', panel: summaryPanel },
    { id: 'lineups', label: locale === 'ru' ? 'Составы' : 'Line-ups', panel: lineupsPanel },
    { id: 'stats', label: locale === 'ru' ? 'Статистика' : 'Stats', panel: statsPanel },
    { id: 'h2h', label: locale === 'ru' ? 'H2H / Форма' : 'H2H / Form', panel: h2hPanel },
    ...(groupPanel ? [{ id: 'table', label: locale === 'ru' ? 'Таблица' : 'Table', panel: groupPanel }] : []),
    { id: 'news', label: locale === 'ru' ? 'Новости' : 'News', panel: newsPanel },
  ];
  const active = tabs.find((tb) => tb.id === activeTab) ?? tabs[0];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl p-1"
        style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}
      >
        {tabs.map((tb) => {
          const isActive = tb.id === active?.id;
          return (
            <button
              key={tb.id}
              type="button"
              onClick={() => setActiveTab(tb.id)}
              className="shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors"
              style={isActive
                ? { background: ACCENT_SOFT, color: ACCENT, boxShadow: `inset 0 0 0 1px ${ACCENT_RING}` }
                : { color: 'rgb(var(--fg-muted))' }}
            >
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      <div>{active?.panel}</div>
    </div>
  );
}
