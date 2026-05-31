import type { FixtureListItem } from '@ai-score/shared';
import { MatchCard } from './match-card';

interface MatchFeedProps {
  fixtures: FixtureListItem[];
  emptyMessage?: string;
}

export function MatchFeed({ fixtures, emptyMessage }: MatchFeedProps) {
  if (!fixtures.length) {
    return (
      <div className="py-16 text-center">
        <p className="text-4xl">⚽</p>
        <p className="mt-4 text-zinc-400">
          {emptyMessage ?? 'Матчей нет'}
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Добавь FOOTBALL_DATA_API_KEY в .env чтобы загрузить расписание
        </p>
      </div>
    );
  }

  // Group by league
  const byLeague = new Map<string, { name: string; logo: string | null; items: FixtureListItem[] }>();
  for (const f of fixtures) {
    const key = String(f.league.id);
    if (!byLeague.has(key)) {
      byLeague.set(key, { name: f.league.name, logo: f.league.logo, items: [] });
    }
    byLeague.get(key)!.items.push(f);
  }

  return (
    <div className="space-y-6">
      {[...byLeague.entries()].map(([id, group]) => (
        <LeagueGroup
          key={id}
          leagueName={group.name}
          leagueLogo={group.logo}
          fixtures={group.items}
        />
      ))}
    </div>
  );
}

function LeagueGroup({
  leagueName,
  leagueLogo,
  fixtures,
}: {
  leagueName: string;
  leagueLogo: string | null;
  fixtures: FixtureListItem[];
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2 px-1">
        {leagueLogo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={leagueLogo} alt="" className="h-4 w-4 object-contain" />
        )}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {leagueName}
        </h3>
      </div>
      <div className="space-y-1.5">
        {fixtures.map((f) => (
          <MatchCard key={f.id} fixture={f} />
        ))}
      </div>
    </section>
  );
}
