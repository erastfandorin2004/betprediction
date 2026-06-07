'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { LvsFixtureItem, LvsPredictionDetail } from '@ai-score/shared';
import { formatTime } from '@/lib/format';
import { getTeamName } from '@/lib/team-names-ru';
import { useLocale } from '@/components/i18n/locale-provider';
import { Target, Trophy, Goal, RefreshCw, AlertTriangle, Sparkles } from 'lucide-react';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const CARD = { background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' } as const;
const ACCENT = 'rgb(var(--accent))';

export function LvsFixtureCard({ fixture }: { fixture: LvsFixtureItem }) {
  const { t, locale } = useLocale();
  const L = t.lvs;
  const [prediction, setPrediction] = useState<LvsPredictionDetail | null>(fixture.prediction);
  const [status, setStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isFinished = fixture.status === 'finished';
  const homeName = getTeamName(fixture.homeTeam.name, fixture.homeTeam.shortName, locale, true);
  const awayName = getTeamName(fixture.awayTeam.name, fixture.awayTeam.shortName, locale, true);

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
    <div className="overflow-hidden rounded-2xl" style={CARD}>
      {/* Header: teams + time/score */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <TeamLogo src={fixture.homeTeam.logo} name={fixture.homeTeam.name} />
          <span className="truncate text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{homeName}</span>
        </div>
        <div className="shrink-0 min-w-[56px] text-center">
          {isFinished && fixture.score ? (
            <span className="tabular text-base font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>
              {fixture.score.home}:{fixture.score.away}
            </span>
          ) : (
            <span className="tabular text-sm font-bold" style={{ color: 'rgb(var(--fg-primary))' }}>{formatTime(fixture.startsAt)}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <span className="truncate text-right text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{awayName}</span>
          <TeamLogo src={fixture.awayTeam.logo} name={fixture.awayTeam.name} />
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {status === 'running' ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
            <Sparkles className="h-4 w-4 animate-pulse" style={{ color: ACCENT }} />
            {L.running}
          </div>
        ) : prediction ? (
          <LvsPredictionView prediction={prediction} homeName={homeName} awayName={awayName} canRerun={!isFinished} onRerun={run} L={L} />
        ) : (
          <div className="py-4 text-center">
            <p className="mx-auto mb-3 max-w-sm text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>{L.waiting}</p>
            {errorMsg && (
              <p className="mb-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: '#ef4444' }}>
                <AlertTriangle className="h-3.5 w-3.5" /> {errorMsg}
              </p>
            )}
            {!isFinished && (
              <button
                type="button"
                onClick={run}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-transform hover:scale-[1.03]"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, rgb(var(--accent-2)))`, color: 'rgb(var(--on-accent))' }}
              >
                <Target className="h-4 w-4" /> {L.analyze}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LvsPredictionView({
  prediction, homeName, awayName, canRerun, onRerun, L,
}: {
  prediction: LvsPredictionDetail;
  homeName: string;
  awayName: string;
  canRerun: boolean;
  onRerun: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  L: any;
}) {
  const outcomeText = prediction.outcome === '1' ? homeName : prediction.outcome === '2' ? awayName : L.draw;
  const teamLabel = (team: 'home' | 'away') => (team === 'home' ? homeName : awayName);

  return (
    <div className="space-y-3">
      {/* Outcome + exact score */}
      <div className="grid grid-cols-2 gap-2">
        <Stat icon={<Trophy className="h-3.5 w-3.5" />} label={L.outcome} value={outcomeText} />
        <Stat icon={<Goal className="h-3.5 w-3.5" />} label={L.exactScore} value={`${prediction.score.home} : ${prediction.score.away}`} />
      </div>

      {/* Probabilities */}
      <div className="flex gap-1.5 text-[11px]">
        <ProbPill label={L.win1} v={prediction.probs.win1} active={prediction.outcome === '1'} />
        <ProbPill label={L.draw} v={prediction.probs.draw} active={prediction.outcome === 'X'} />
        <ProbPill label={L.win2} v={prediction.probs.win2} active={prediction.outcome === '2'} />
      </div>

      {/* Scorers */}
      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{L.scorers}</p>
        <div className="space-y-1">
          {prediction.scorers.map((s, i) => {
            const resolved = prediction.result?.scorers.find((r) => r.name === s.name);
            return (
              <div key={i} className="flex items-center justify-between rounded-lg px-2.5 py-1.5" style={{ background: 'rgb(var(--pitch-800))' }}>
                <span className="flex items-center gap-2 text-xs font-medium" style={{ color: 'rgb(var(--fg-card))' }}>
                  <Goal className="h-3 w-3" style={{ color: ACCENT }} />
                  {s.name}
                  <span style={{ color: 'rgb(var(--fg-muted))' }}>· {teamLabel(s.team)}</span>
                </span>
                {resolved ? (
                  <span className="text-[11px] font-bold" style={{ color: resolved.scored ? '#22c55e' : 'rgb(var(--fg-muted))' }}>
                    {resolved.scored ? `✓ ${L.scored}` : `✗ ${L.notScored}`}
                  </span>
                ) : (
                  <span className="tabular text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{Math.round(s.probability * 100)}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Rationale / summary */}
      {(prediction.summary || prediction.rationale) && (
        <div className="rounded-lg px-3 py-2" style={{ background: 'rgb(var(--accent) / 0.08)' }}>
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: ACCENT }}>{L.rationale}</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgb(var(--fg-secondary))' }}>{prediction.summary ?? prediction.rationale}</p>
        </div>
      )}

      {/* Lineups */}
      {prediction.lineups && (
        <details className="rounded-lg px-3 py-2" style={{ background: 'rgb(var(--pitch-800))' }}>
          <summary className="cursor-pointer text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>{L.lineups}</summary>
          <div className="mt-2 grid grid-cols-2 gap-3 text-[11px]" style={{ color: 'rgb(var(--fg-secondary))' }}>
            <LineupCol title={homeName} players={prediction.lineups.home.startingXI.map((p) => p.name)} formation={prediction.lineups.home.formation} />
            <LineupCol title={awayName} players={prediction.lineups.away.startingXI.map((p) => p.name)} formation={prediction.lineups.away.formation} />
          </div>
        </details>
      )}

      {canRerun && (
        <button
          type="button"
          onClick={onRerun}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2 text-xs font-medium transition-colors"
          style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> {L.rerun}
        </button>
      )}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: 'rgb(var(--pitch-800))' }}>
      <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'rgb(var(--fg-muted))' }}>
        {icon} {label}
      </p>
      <p className="truncate text-sm font-bold" style={{ color: 'rgb(var(--fg-card))' }}>{value}</p>
    </div>
  );
}

function ProbPill({ label, v, active }: { label: string; v: number; active: boolean }) {
  return (
    <div
      className="flex-1 rounded-lg px-2 py-1 text-center"
      style={{
        background: active ? 'rgb(var(--accent) / 0.16)' : 'rgb(var(--pitch-800))',
        border: active ? `1px solid ${ACCENT}` : '1px solid transparent',
      }}
    >
      <div className="font-semibold" style={{ color: active ? ACCENT : 'rgb(var(--fg-muted))' }}>{Math.round(v * 100)}%</div>
      <div className="truncate" style={{ color: 'rgb(var(--fg-muted))' }}>{label}</div>
    </div>
  );
}

function LineupCol({ title, players, formation }: { title: string; players: string[]; formation: string }) {
  return (
    <div>
      <p className="mb-1 font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{title}{formation ? ` · ${formation}` : ''}</p>
      <ul className="space-y-0.5">
        {players.slice(0, 11).map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );
}

function TeamLogo({ src, name }: { src: string | null; name: string }) {
  if (!src) {
    return (
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}>
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return <Image src={src} alt={name} width={28} height={28} className="h-7 w-7 shrink-0 rounded object-contain" unoptimized />;
}
