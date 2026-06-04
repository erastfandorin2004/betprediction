'use client';

import { useEffect, useState } from 'react';
import { Bot, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';
import type { PredictionDetail } from '@ai-score/shared';
import { useLocale } from '@/components/i18n/locale-provider';
import { PredictionCard } from './prediction-card';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

const CARD = {
  background: 'rgb(var(--pitch-900))',
  border: '1px solid rgb(var(--pitch-700))',
} as const;

type Status = 'idle' | 'running' | 'error';

export function AiPredictionPanel({
  fixtureId,
  initialPrediction,
}: {
  fixtureId: number;
  initialPrediction: PredictionDetail | null;
}) {
  const { t } = useLocale();
  const p = t.prediction;
  const [prediction, setPrediction] = useState<PredictionDetail | null>(initialPrediction);
  const [status, setStatus] = useState<Status>('idle');

  async function run() {
    setStatus('running');
    try {
      const res = await fetch(`${API_BASE}/v1/predictions/${fixtureId}/analyze`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { data: PredictionDetail };
      setPrediction(json.data);
      setStatus('idle');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'running') return <AnalysisProgress />;

  if (prediction && !prediction.isLocked) {
    return (
      <div className="space-y-2">
        <PredictionCard prediction={prediction} />
        <button
          type="button"
          onClick={run}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium transition-colors"
          style={{ ...CARD, color: 'rgb(var(--fg-muted))' }}
        >
          <RefreshCw className="h-3.5 w-3.5" /> {p.aiRerun}
        </button>
      </div>
    );
  }

  // Idle / error — show the call-to-action to run a free analysis.
  return (
    <div className="overflow-hidden rounded-2xl" style={CARD}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'rgb(var(--accent) / 0.14)' }}>
          <Bot className="h-3.5 w-3.5" style={{ color: 'rgb(var(--accent))' }} />
        </span>
        <span className="text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{p.title}</span>
      </div>

      <div className="px-5 py-6 text-center">
        <p className="mx-auto max-w-sm text-sm leading-relaxed" style={{ color: 'rgb(var(--fg-muted))' }}>{p.aiIntro}</p>

        {status === 'error' && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs" style={{ color: '#ef4444' }}>
            <AlertTriangle className="h-3.5 w-3.5" /> {p.aiError}
          </p>
        )}

        <button
          type="button"
          onClick={run}
          className="mt-4 inline-flex items-center gap-2 rounded-full px-7 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03]"
          style={{ background: 'linear-gradient(90deg, rgb(var(--accent)), #c46a2c)', color: '#04140a' }}
        >
          <Sparkles className="h-4 w-4" />
          {p.aiRun}
        </button>
        <p className="mt-2.5 text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{p.aiCost}</p>
      </div>
    </div>
  );
}

// Pulsing stage strip shown while the ensemble runs (spec §10).
function AnalysisProgress() {
  const { t } = useLocale();
  const stages = t.trackRecord.backtest.stages;
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % stages.length), 1100);
    return () => clearInterval(id);
  }, [stages.length]);

  return (
    <div className="overflow-hidden rounded-2xl" style={CARD}>
      <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '1px solid rgb(var(--pitch-700))' }}>
        <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'rgb(var(--accent) / 0.14)' }}>
          <Bot className="h-3.5 w-3.5 animate-pulse" style={{ color: 'rgb(var(--accent))' }} />
        </span>
        <span className="text-sm font-semibold" style={{ color: 'rgb(var(--fg-card))' }}>{t.prediction.aiAnalyzing}</span>
      </div>
      <div className="px-5 py-5">
        <div className="flex flex-wrap gap-1.5">
          {stages.map((s, i) => {
            const isActive = i === active;
            const isDone = i < active;
            return (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] transition-all duration-500"
                style={{
                  background: isActive ? 'rgb(var(--accent) / 0.16)' : 'rgb(var(--pitch-800))',
                  color: isActive ? 'rgb(var(--accent))' : isDone ? 'rgb(var(--fg-secondary))' : 'rgb(var(--fg-muted))',
                  border: `1px solid ${isActive ? 'rgb(var(--accent) / 0.4)' : 'transparent'}`,
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full transition-all duration-500"
                  style={{ background: isActive || isDone ? 'rgb(var(--accent))' : 'rgb(var(--fg-muted) / 0.4)' }}
                />
                {s}
              </span>
            );
          })}
        </div>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full" style={{ background: 'rgb(var(--pitch-800))' }}>
          <div className="h-full animate-pulse rounded-full" style={{ width: '60%', background: 'rgb(var(--accent))' }} />
        </div>
      </div>
    </div>
  );
}
