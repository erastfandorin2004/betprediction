'use client';

import { useEffect, useState, useTransition } from 'react';
import type { FixtureListItem } from '@ai-score/shared';
import { MatchFeed } from './match-feed';
import { LeagueGroupSkeleton } from '@/components/ui/skeleton';

interface MatchFeedClientProps {
  initialFixtures: FixtureListItem[];
  date: string;
  pollInterval?: number; // ms, 0 = no polling
}

export function MatchFeedClient({
  initialFixtures,
  date,
  pollInterval = 0,
}: MatchFeedClientProps) {
  const [fixtures, setFixtures] = useState(initialFixtures);
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  // Merge live updates into the full list
  function mergeLive(current: FixtureListItem[], live: FixtureListItem[]): FixtureListItem[] {
    const map = new Map(current.map((f) => [f.id, f]));
    for (const f of live) map.set(f.id, f);
    return [...map.values()].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }

  useEffect(() => {
    setFixtures(initialFixtures);
  }, [initialFixtures]);

  useEffect(() => {
    if (!pollInterval) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/fixtures/live`);
        if (!res.ok) return;
        const { data } = (await res.json()) as { data: FixtureListItem[] };
        startTransition(() => setFixtures((prev) => mergeLive(prev, data)));
      } catch {
        // silent
      }
    };

    const id = setInterval(() => { void poll(); }, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval, date]);

  if (loading) {
    return (
      <div className="space-y-6">
        <LeagueGroupSkeleton />
        <LeagueGroupSkeleton />
      </div>
    );
  }

  return <MatchFeed fixtures={fixtures} />;
}
