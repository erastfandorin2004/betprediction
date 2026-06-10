'use client';

import { useState } from 'react';
import { Trophy, Goal, ChevronDown } from 'lucide-react';
import type { LvsTournamentPrediction } from '@ai-score/shared';
import { useLocale } from '@/components/i18n/locale-provider';
import { flagEmoji } from '@/lib/country-flags';

const ACCENT = 'rgb(var(--accent))';

export function LvsTournamentCard({ data }: { data: LvsTournamentPrediction }) {
  const { t, locale } = useLocale();
  const L = t.lvs;
  const en = locale === 'en';
  const [open, setOpen] = useState(false);

  const summary = en ? (data.summaryEn ?? data.summary) : data.summary;
  const champPct = data.championContenders[0]?.probability ?? 0;
  const scorerPct = data.topScorerContenders[0]?.probability ?? 0;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl" style={{ background: 'rgb(var(--pitch-900))', border: `1px solid rgb(var(--accent) / 0.35)` }}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ background: 'rgb(var(--accent) / 0.10)', borderBottom: `1px solid rgb(var(--accent) / 0.25)` }}>
        <Trophy className="h-4 w-4" style={{ color: ACCENT }} />
        <span className="text-sm font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{L.tournamentTitle}</span>
        <span className="ml-auto text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{L.tournamentNote}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {/* Чемпион */}
        <div className="rounded-2xl px-4 py-4" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
            <Trophy className="h-3.5 w-3.5" /> {L.tournamentChampion}
          </p>
          <p className="flex items-center gap-2 text-xl font-extrabold" style={{ color: 'rgb(var(--fg-card))' }}>
            <span aria-hidden>{flagEmoji(data.champion)}</span>{data.champion}
          </p>
          {champPct > 0 && (
            <p className="mt-1 text-xs" style={{ color: ACCENT }}>{Math.round(champPct * 100)}% {L.modelsVote}</p>
          )}
        </div>

        {/* Лучший бомбардир */}
        <div className="rounded-2xl px-4 py-4" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
            <Goal className="h-3.5 w-3.5" /> {L.tournamentTopScorer}
          </p>
          <p className="flex items-center gap-2 text-xl font-extrabold" style={{ color: 'rgb(var(--fg-card))' }}>
            {data.topScorerTeam && <span aria-hidden>{flagEmoji(data.topScorerTeam)}</span>}{data.topScorer}
          </p>
          {scorerPct > 0 && (
            <p className="mt-1 text-xs" style={{ color: ACCENT }}>{Math.round(scorerPct * 100)}% {L.modelsVote}</p>
          )}
        </div>
      </div>

      {summary && (
        <div className="mx-4 mb-3 rounded-xl px-4 py-3" style={{ background: 'rgb(var(--accent) / 0.07)', border: `1px solid rgb(var(--accent) / 0.25)` }}>
          <p className="mb-1 flex items-center gap-1.5 text-[13px] font-bold" style={{ color: ACCENT }}>
            <span aria-hidden>🧠</span> {L.overall}
          </p>
          <p className="text-[13px] leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>{summary}</p>
        </div>
      )}

      {data.modelViews.length > 0 && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide"
            style={{ color: 'rgb(var(--fg-muted))' }}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} /> {L.modelsOpinion}
          </button>
          {open && (
            <div className="mt-3 space-y-2">
              {data.modelViews.map((m, i) => (
                <div key={i} className="rounded-xl p-3" style={{ background: 'rgb(var(--pitch-800))', border: '1px solid rgb(var(--pitch-700))' }}>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{modelLabel(m.modelId)}</span>
                    {!m.error && (
                      <span className="tabular shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: 'rgb(var(--accent) / 0.14)', color: ACCENT }}>
                        {flagEmoji(m.champion)} {m.champion ?? '—'}
                      </span>
                    )}
                  </div>
                  {m.error ? (
                    <p className="text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{L.noAnswer}</p>
                  ) : (
                    <div className="space-y-1 text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>
                      {m.topScorer && (
                        <p><span style={{ color: 'rgb(var(--fg-muted))' }}>⚽ {L.tournamentTopScorer}: </span>{m.topScorer}{m.topScorerTeam ? ` (${m.topScorerTeam})` : ''}</p>
                      )}
                      {(() => {
                        const r = en ? (m.rationaleEn ?? m.rationale) : m.rationale;
                        return r ? <p><span style={{ color: 'rgb(var(--fg-muted))' }}>{L.comment}: </span>{r}</p> : null;
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

const MODEL_LABELS: Record<string, string> = {
  'gpt-5.1': 'GPT 5.1',
  'grok-4': 'Grok 4.3',
  'claude-opus-4-8': 'Claude Opus 4.8',
  'deepseek-chat': 'DeepSeek 4',
};
function modelLabel(id: string): string {
  return MODEL_LABELS[id] ?? id;
}
