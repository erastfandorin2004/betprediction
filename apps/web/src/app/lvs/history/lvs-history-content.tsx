'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { LvsHistoryItem, LvsResultStatus } from '@ai-score/shared';
import { useLocale } from '@/components/i18n/locale-provider';
import { getTeamName } from '@/lib/team-names-ru';
import { flagEmoji } from '@/lib/country-flags';
import { fetchLvsHistory } from '@/lib/lvs-data';
import { Check, X, Minus } from 'lucide-react';

const STATUS_COLOR: Record<LvsResultStatus, string> = {
  won: '#22c55e',
  partial: '#f59e0b',
  lost: '#ef4444',
};

export function LvsHistoryContent({ history: initialHistory }: { history: LvsHistoryItem[] }) {
  const { t, locale } = useLocale();
  const L = t.lvs;

  // Дуал-режим: серверные данные или клиентский JSON (статика/Pages).
  const [history, setHistory] = useState<LvsHistoryItem[]>(initialHistory);
  useEffect(() => {
    if (initialHistory.length === 0) fetchLvsHistory().then(setHistory).catch(() => {});
  }, [initialHistory]);

  const statusLabel = (s: LvsResultStatus) => (s === 'won' ? L.statusWon : s === 'partial' ? L.statusPartial : L.statusLost);
  const StatusIcon = (s: LvsResultStatus) => (s === 'won' ? Check : s === 'partial' ? Minus : X);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Hero Истории ЛВС — то же оформление/размер, что и баннер в разделе ЛВС */}
      <header className="relative mb-6 overflow-hidden rounded-3xl border shadow-lg" style={{ borderColor: 'rgb(var(--pitch-700))' }}>
        <div className="relative h-40 w-full sm:h-48">
          <Image
            src="/lvs-history-hero.png"
            alt={L.historyTitle}
            fill
            priority
            unoptimized
            sizes="(max-width: 768px) 100vw, 680px"
            className="object-cover object-center"
          />
          {/* затемнение сверху под текст */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(180deg, rgba(6,8,22,0.9) 0%, rgba(6,8,22,0.5) 26%, rgba(6,8,22,0.08) 52%, rgba(6,8,22,0) 68%)' }}
          />
          {/* мультиколор-полоса ЧМ сверху */}
          <div className="absolute inset-x-0 top-0 flex h-1.5">
            <i className="flex-1" style={{ background: '#e4002b' }} />
            <i className="flex-1" style={{ background: '#6a1fe0' }} />
            <i className="flex-1" style={{ background: '#2e5bff' }} />
            <i className="flex-1" style={{ background: '#00c2a3' }} />
            <i className="flex-1" style={{ background: '#c7f000' }} />
          </div>
          {/* контент сверху-слева — как в разделе ЛВС */}
          <div className="absolute inset-x-0 top-0 flex flex-col gap-2 px-6 pt-4 sm:px-8 sm:pt-5">
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-md"
              style={{ background: 'rgb(var(--accent))' }}
            >
              🏆 ЧМ-2026 · LVS
            </span>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-[2rem]">{L.historyTitle}</h1>
          </div>
        </div>
      </header>

      {history.length === 0 ? (
        <p className="rounded-2xl px-4 py-10 text-center text-sm" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))', color: 'rgb(var(--fg-muted))' }}>
          {L.historyEmpty}
        </p>
      ) : (
        <div className="space-y-3">
          {history.map((h) => {
            const Icon = StatusIcon(h.resultStatus);
            const color = STATUS_COLOR[h.resultStatus];
            // Локализуем по командам; фолбэк на готовую строку h.match, если рефов нет.
            const homeName = h.homeTeam ? getTeamName(h.homeTeam.name, h.homeTeam.shortName, locale, true) : null;
            const awayName = h.awayTeam ? getTeamName(h.awayTeam.name, h.awayTeam.shortName, locale, true) : null;
            const homeFlag = flagEmoji(h.homeTeam?.name);
            const awayFlag = flagEmoji(h.awayTeam?.name);
            const actualScorers = h.actualScorers ?? []; // защита от устаревшего SSR-кэша
            return (
              <div key={`${h.fixtureId}-${h.resolvedAt}`} className="overflow-hidden rounded-2xl" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>
                      {homeName && awayName ? (
                        <>
                          {homeFlag && <span aria-hidden>{homeFlag}</span>}
                          {homeName}
                          <span style={{ color: 'rgb(var(--fg-muted))' }}>—</span>
                          {awayFlag && <span aria-hidden>{awayFlag}</span>}
                          {awayName}
                        </>
                      ) : (
                        h.match
                      )}
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{formatDate(h.kickoff, locale)}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: `${color}1f`, color }}>
                    <Icon className="h-3.5 w-3.5" /> {statusLabel(h.resultStatus)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 px-4 py-3 text-xs">
                  <Compare label={L.outcome} predicted={h.predictedOutcomeLabel} actual={h.actualOutcomeLabel} hit={h.predictedOutcome === h.actualOutcome} L={L} />
                  <Compare
                    label={L.exactScore}
                    predicted={`${h.predictedScore.home}:${h.predictedScore.away}`}
                    actual={`${h.actualScore.home}:${h.actualScore.away}`}
                    hit={h.predictedScore.home === h.actualScore.home && h.predictedScore.away === h.actualScore.away}
                    L={L}
                  />
                </div>

                {/* Прогноз бомбардиров: кто из предсказанных забил (🎉), кто нет */}
                <div className="px-4 pb-3">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{L.scorers}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {h.scorers.map((s, i) => (
                      <span key={i} className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: s.scored ? '#22c55e26' : 'rgb(var(--pitch-800))', color: s.scored ? '#22c55e' : 'rgb(var(--fg-muted))' }}>
                        {s.scored ? `🎉 ${s.name} — ${L.scored}` : `✗ ${s.name} — ${L.notScored}`}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Реальные авторы голов матча; ⭐ — если игрок был в нашем прогнозе */}
                <div className="px-4 pb-4" style={{ borderTop: '1px solid rgb(var(--pitch-800))' }}>
                  <p className="mb-1.5 mt-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
                    <span aria-hidden>⚽</span> {L.actualScorers}
                  </p>
                  {actualScorers.length === 0 ? (
                    <p className="text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{L.noGoalData}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {actualScorers.map((name, i) => {
                        const predicted = wasPredicted(name, h.scorers);
                        return (
                          <span
                            key={i}
                            className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                            style={predicted
                              ? { background: '#22c55e26', color: '#22c55e', fontWeight: 700 }
                              : { background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-card))' }}
                          >
                            ⚽ {name}{predicted ? ` · 🎯 ${L.wasPredicted}` : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Compare({ label, predicted, actual, hit, L }: { label: string; predicted: string; actual: string; hit: boolean; L: { predicted: string; actual: string } }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'rgb(var(--pitch-800))' }}>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</p>
      <div className="flex items-center justify-between">
        <span style={{ color: 'rgb(var(--fg-muted))' }}>{L.predicted}: <b style={{ color: hit ? '#22c55e' : 'rgb(var(--fg-card))' }}>{predicted}</b></span>
        <span style={{ color: 'rgb(var(--fg-muted))' }}>{L.actual}: <b style={{ color: 'rgb(var(--fg-card))' }}>{actual}</b></span>
      </div>
    </div>
  );
}

// Был ли реальный автор гола среди наших предсказанных забивших.
// Нестрогое сравнение по токенам ≥3 символов (зеркало settle-lvs).
function normalizeName(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-zа-я0-9 ]/gi, ' ').replace(/\s+/g, ' ').trim();
}
function wasPredicted(actualName: string, predicted: { name: string; scored: boolean }[]): boolean {
  const a = normalizeName(actualName);
  if (!a) return false;
  const aTokens = a.split(' ').filter((t) => t.length >= 3);
  return predicted.some((p) => {
    if (!p.scored) return false;
    const n = normalizeName(p.name);
    if (!n) return false;
    if (n === a || n.includes(a) || a.includes(n)) return true;
    const pTokens = n.split(' ').filter((t) => t.length >= 3);
    return pTokens.some((pt) => aTokens.some((at) => at === pt));
  });
}

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
}
