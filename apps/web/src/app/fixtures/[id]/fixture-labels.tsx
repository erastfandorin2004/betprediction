'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft } from 'lucide-react';
import { useLocale } from '@/components/i18n/locale-provider';
import { getTeamName } from '@/lib/team-names-ru';
import { Badge } from '@/components/ui/badge';
import { SectionCard, EventTimeline } from './display';
import { cn } from '@/lib/utils';
import type { MatchEvent } from '@ai-score/shared';

type LabelType = 'back' | 'finished-badge' | 'msk' | 'no-prediction' | 'halftime';

interface Props {
  type: LabelType;
  hasStarted?: boolean;
  home?: number;
  away?: number;
}

export function FixtureLabels({ type, hasStarted, home, away }: Props) {
  const { t } = useLocale();

  if (type === 'back') {
    return (
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm" style={{ color: 'rgb(var(--fg-muted))' }}>
        <ArrowLeft className="h-4 w-4" /> {t.fixture.back}
      </Link>
    );
  }

  if (type === 'finished-badge') {
    return <Badge variant="muted" className="mt-2">{t.fixture.finished}</Badge>;
  }

  if (type === 'msk') {
    return <span>({t.fixture.msk})</span>;
  }

  if (type === 'halftime') {
    return (
      <p className="mt-3 text-center text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
        {t.fixture.halfTime}: {home} : {away}
      </p>
    );
  }

  if (type === 'no-prediction') {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: 'rgb(var(--pitch-900))', border: '1px solid rgb(var(--pitch-700))' }}>
        <p className="text-sm font-semibold" style={{ color: 'rgb(var(--fg-secondary))' }}>🤖 {t.prediction.title}</p>
        <p className="mt-2 text-xs" style={{ color: 'rgb(var(--fg-muted))' }}>
          {hasStarted ? t.prediction.noPredict : t.prediction.noPredictWorker}
        </p>
      </div>
    );
  }

  return null;
}

export function FixtureEventsWrapper({ events }: { events: MatchEvent[] }) {
  const { t } = useLocale();
  return (
    <SectionCard title={t.fixture.events}>
      <EventTimeline events={events} />
    </SectionCard>
  );
}

export function TeamBlockClient({
  name, shortName, logo, bold, align = 'left',
}: {
  name: string; shortName: string; logo: string | null; bold?: boolean; align?: 'left' | 'right';
}) {
  const { locale } = useLocale();
  const displayName = getTeamName(name, shortName, locale, false);
  return (
    <div className={cn('flex min-w-0 flex-1 flex-col items-center gap-2')}>
      {logo ? (
        <Image src={logo} alt={displayName} width={52} height={52} className="h-13 w-13 object-contain" unoptimized />
      ) : (
        <div
          className="flex h-13 w-13 items-center justify-center rounded-full text-lg font-bold"
          style={{ background: 'rgb(var(--pitch-800))', color: 'rgb(var(--fg-muted))' }}
        >
          {displayName.slice(0, 2).toUpperCase()}
        </div>
      )}
      <span
        className="text-center text-sm font-semibold"
        style={{ color: bold ? 'rgb(var(--fg-primary))' : 'rgb(var(--fg-secondary))' }}
      >
        {displayName}
      </span>
    </div>
  );
}
