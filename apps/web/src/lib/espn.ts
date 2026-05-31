/** ESPN public API utilities — no key required */

export interface EspnMatch {
  id: string;
  date: string;           // ISO date
  competition: string;    // e.g. "International Friendlies"
  homeTeam: { name: string; logo: string | null; espnId: string };
  awayTeam: { name: string; logo: string | null; espnId: string };
  homeScore: number | null;
  awayScore: number | null;
  /** W/L/D from the perspective of the focal team */
  result?: 'W' | 'L' | 'D';
  focalTeamIsHome?: boolean;
}

interface EspnEventItem {
  id: string;
  name: string;
  date: string;
}

/** Cache ESPN event list for 24 h (Next.js fetch cache) */
async function getWcEventId(homeTeamName: string, awayTeamName: string): Promise<string | null> {
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?limit=110&dates=20260601-20260720',
      { next: { revalidate: 86400 } },
    );
    if (!res.ok) return null;
    const d = await res.json() as { events: EspnEventItem[] };

    const norm = (s: string) =>
      s.toLowerCase().normalize('NFD').replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const h = norm(homeTeamName);
    const a = norm(awayTeamName);

    const espnNameMap: Record<string, string> = {
      'south korea': 'korea republic',
      'united states': 'usmnt',
      'usa': 'united states',
      'ivory coast': 'cote divoire',
      'cape verde islands': 'cape verde',
      'cape verde': 'cape verde',
      'congo dr': 'congo',
      'bosnia-herzegovina': 'bosnia and herzegovina',
    };

    const tryNames = (name: string) => [name, espnNameMap[name] ?? name];

    for (const event of d.events ?? []) {
      const eName = norm(event.name); // "{away} at {home}"
      const allH = tryNames(h);
      const allA = tryNames(a);
      const matchesH = allH.some(n => eName.includes(n));
      const matchesA = allA.some(n => eName.includes(n));
      if (matchesH && matchesA) return event.id;
    }
    return null;
  } catch {
    return null;
  }
}

/** Get H2H matches for a WC 2026 fixture via ESPN */
export async function getEspnH2H(
  homeTeamName: string,
  awayTeamName: string,
): Promise<EspnMatch[]> {
  const eventId = await getWcEventId(homeTeamName, awayTeamName);
  if (!eventId) return [];

  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?event=${eventId}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];
    const d = await res.json() as {
      headToHeadGames?: Array<{
        team: { id: string; displayName: string; logo?: string };
        events: Array<{
          id: string;
          gameDate: string;
          competitionName?: string;
          homeTeamId: string;
          awayTeamId: string;
          homeTeamScore?: string;
          awayTeamScore?: string;
          gameResult?: string;
          opponent?: { id: string; displayName: string; logo?: string };
        }>;
      }>;
    };

    const entries = d.headToHeadGames ?? [];
    if (!entries.length) return [];

    // ESPN returns H2H from one team's perspective — pick the entry with most events
    const entry = entries.reduce((a, b) => (a.events.length >= b.events.length ? a : b));
    const focalTeamId = entry.team.id;

    return (entry.events ?? [])
      .filter(e => e.homeTeamScore !== undefined || e.awayTeamScore !== undefined)
      .map(e => {
        const hScore = e.homeTeamScore ? parseFloat(e.homeTeamScore) : null;
        const aScore = e.awayTeamScore ? parseFloat(e.awayTeamScore) : null;
        const focalIsHome = e.homeTeamId === focalTeamId;
        const result = (e.gameResult?.toUpperCase() ?? '') as 'W' | 'L' | 'D' | '';
        const opp = e.opponent ?? { id: '', displayName: '?', logo: null };
        const homeTeam = focalIsHome
          ? { name: entry.team.displayName, logo: entry.team.logo ?? null, espnId: entry.team.id }
          : { name: opp.displayName, logo: opp.logo ?? null, espnId: opp.id };
        const awayTeam = focalIsHome
          ? { name: opp.displayName, logo: opp.logo ?? null, espnId: opp.id }
          : { name: entry.team.displayName, logo: entry.team.logo ?? null, espnId: entry.team.id };

        return {
          id: e.id,
          date: e.gameDate ?? '',
          competition: e.competitionName ?? '',
          homeTeam,
          awayTeam,
          homeScore: focalIsHome ? (result === 'W' ? hScore : result === 'L' ? hScore : hScore) : hScore,
          awayScore: focalIsHome ? aScore : aScore,
          result: result as 'W' | 'L' | 'D' | undefined,
          focalTeamIsHome: focalIsHome,
        } satisfies EspnMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

/** ESPN team ID lookup by football-data.org team name */
const ESPN_TEAM_IDS: Record<string, string> = {
  'Mexico': '203',          'South Africa': '467',    'Czechia': '440',
  'South Korea': '375',     'Bosnia-Herzegovina': '464', 'Canada': '230',
  'Paraguay': '202',        'United States': '359',   'Qatar': '4451',
  'Switzerland': '474',     'Brazil': '205',          'Croatia': '441',
  'Germany': '481',         'Ivory Coast': '481',     'Ecuador': '445',
  'Japan': '372',           'France': '478',          'Iraq': '4371',
  'Argentina': '433',       'Austria': '435',         'Morocco': '571',
  'Belgium': '436',         'Uruguay': '218',         'Spain': '164',
  'Cape Verde Islands': '4476', 'Saudi Arabia': '587', 'Senegal': '466',
  'Iran': '368',            'Netherlands': '456',     'Tunisia': '479',
  'Turkey': '480',          'Australia': '149',       'England': '448',
  'Portugal': '457',        'Chile': '225',           'Colombia': '228',
  'Sweden': '473',          'Norway': '459',          'Poland': '458',
  'Egypt': '577',           'Algeria': '624',         'Ghana': '4464',
  'Scotland': '463',        'Panama': '4397',         'Honduras': '233',
  'Costa Rica': '237',      'Haiti': '569',           'New Zealand': '4397',
  'Jamaica': '564',         'Denmark': '443',         'Serbia': '4267',
  'Jordan': '4372',         'Uzbekistan': '4447',     'Congo DR': '4480',
  'Curaçao': '6859',        'Cape Verde': '4476',
};

/** Get recent matches for a team from ESPN (friendlies + WC) */
export async function getEspnTeamForm(
  teamNameEn: string,
  espnTeamId?: string,
): Promise<EspnMatch[]> {
  const id = espnTeamId ?? ESPN_TEAM_IDS[teamNameEn];
  if (!id) return [];

  const results: EspnMatch[] = [];

  for (const league of ['fifa.friendly', 'fifa.world']) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/soccer/${league}/teams/${id}/schedule`,
        { next: { revalidate: 3600 } },
      );
      if (!res.ok) continue;
      const d = await res.json() as {
        events?: Array<{
          id: string;
          date: string;
          competitions: Array<{
            status: { type: { name: string } };
            competitors: Array<{
              id: string;
              homeAway: string;
              team: { id: string; displayName: string; logo?: string };
              score: { value?: number; displayValue?: string; winner?: boolean } | string;
              winner?: boolean;
            }>;
          }>;
        }>;
      };

      for (const event of d.events ?? []) {
        const comp = event.competitions?.[0];
        if (!comp) continue;
        const status = comp.status?.type?.name ?? '';
        if (!status.includes('FULL_TIME') && !status.includes('FINAL')) continue;

        const home = comp.competitors?.find(c => c.homeAway === 'home');
        const away = comp.competitors?.find(c => c.homeAway === 'away');
        if (!home || !away) continue;

        const getScore = (c: typeof home) => {
          const s = c.score;
          if (!s) return null;
          if (typeof s === 'object' && 'value' in s) return s.value ?? null;
          return null;
        };

        const getWinner = (c: typeof home): boolean => {
          // winner can be in score object or directly on competitor
          const s = c.score;
          if (typeof s === 'object' && 'winner' in s) return s.winner === true;
          return c.winner === true;
        };

        const hScore = getScore(home);
        const aScore = getScore(away);
        const focalIsHome = home.id === id;
        const focalWon = focalIsHome ? getWinner(home) : getWinner(away);
        const isDraw = hScore !== null && aScore !== null && hScore === aScore;
        const result: 'W' | 'L' | 'D' = isDraw ? 'D' : focalWon ? 'W' : 'L';

        results.push({
          id: event.id,
          date: event.date,
          competition: league === 'fifa.friendly' ? 'Friendly' : 'WC 2026',
          homeTeam: { name: home.team.displayName, logo: home.team.logo ?? null, espnId: home.id },
          awayTeam: { name: away.team.displayName, logo: away.team.logo ?? null, espnId: away.id },
          homeScore: hScore,
          awayScore: aScore,
          result,
          focalTeamIsHome: focalIsHome,
        });
      }
    } catch {
      // ignore league errors
    }
  }

  return results
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);
}
