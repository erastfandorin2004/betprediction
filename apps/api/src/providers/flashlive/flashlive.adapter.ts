import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AfH2HFixture } from '../api-football/api-football.adapter';

interface FlSearchItem {
  ID: string;
  TYPE: string;
  SPORT_ID: number;
  NAME: string;
  PARTICIPANT_TYPE_ID?: number;
}

interface FlFixtureEvent {
  EVENT_ID: string;
  START_TIME: number;
  HOME_PARTICIPANT_IDS?: string[];
  AWAY_PARTICIPANT_IDS?: string[];
  HOME_NAME?: string;
  AWAY_NAME?: string;
}

interface FlFixtureGroup {
  EVENTS?: FlFixtureEvent[];
}

interface FlH2HItem {
  START_TIME: number;
  EVENT_ID: string;
  EVENT_NAME: string;
  COUNTRY_NAME: string;
  UQ?: string; // home participant id
  UO?: string; // away participant id
  HOME_PARTICIPANT_NAME_ONE: string;
  AWAY_PARTICIPANT_NAME_ONE: string;
  HOME_SCORE_FULL: string | null;
  AWAY_SCORE_FULL: string | null;
  HOME_IMAGES?: string[];
  AWAY_IMAGES?: string[];
}

interface FlH2HGroup {
  GROUP_LABEL: string;
  ITEMS: FlH2HItem[];
}

interface FlH2HTab {
  TAB_NAME: string;
  GROUPS: FlH2HGroup[];
}

/** Head-to-head plus each team's recent form, all in the shared fixture shape. */
export interface FlBundle {
  h2h: AfH2HFixture[];
  homeForm: AfH2HFixture[];
  awayForm: AfH2HFixture[];
}

interface FlLineupMember {
  PLAYER_ID: string;
  PLAYER_FULL_NAME: string;
  SHORT_NAME: string;
  PLAYER_NUMBER: number | null;
  PLAYER_POSITION: number; // 1=GK, 2-5=DEF, 6-8=MID, 9-11=FWD
  PLAYER_TYPE: number;
}

interface FlLineupFormation {
  FORMATION_LINE: number; // 1 = event home, 2 = event away
  FORMATION_DISPOSTION: string; // e.g. "1-4-3-3"
  MEMBERS: FlLineupMember[];
}

interface FlLineupBlock {
  FORMATION_NAME: string; // "Starting Lineups" | "Substitutes" | "Coaches"
  FORMATIONS: FlLineupFormation[];
}

export interface LineupPlayer {
  id: string;
  name: string;
  number: number | null;
}

export interface TeamLineup {
  formation: string; // display, e.g. "4-3-3"
  lines: number[]; // pitch rows incl. GK, e.g. [1, 4, 3, 3]
  coach: string | null;
  startingXI: LineupPlayer[]; // sorted by pitch position (GK → forwards)
  substitutes: LineupPlayer[];
}

export interface LineupBundle {
  home: TeamLineup;
  away: TeamLineup;
}

/**
 * FlashLive Sports adapter (flashlive-sports.p.rapidapi.com) — FlashScore's own
 * data backend. Produces head-to-head history in the same shape as the
 * API-Football adapter so it is a drop-in replacement for h2hAll.
 *
 * Flow: search both teams → team ids → home team fixtures → match event by
 * opponent id → events/h2h → extract the "Head-to-head matches" group.
 */
@Injectable()
export class FlashLiveAdapter {
  private readonly logger = new Logger(FlashLiveAdapter.name);
  private readonly base = 'https://flashlive-sports.p.rapidapi.com/v1';
  private readonly host = 'flashlive-sports.p.rapidapi.com';
  private readonly teamIdCache = new Map<string, string | null>();

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get<string>('rapidApi.footballApiKey') ?? '';
  }

  private get hasKey(): boolean {
    return !!this.apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    if (!this.hasKey) throw new Error('RAPIDAPI_FOOTBALL_KEY not configured');
    const res = await fetch(`${this.base}${path}`, {
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.host,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`FlashLive ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  private static norm(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\*/g, '')
      .trim();
  }

  /** Stable positive 32-bit numeric id derived from a FlashScore event id string. */
  private static numericId(eventId: string): number {
    let h = 0;
    for (let i = 0; i < eventId.length; i++) {
      h = (Math.imul(31, h) + eventId.charCodeAt(i)) | 0;
    }
    return Math.abs(h);
  }

  async getTeamId(teamName: string): Promise<string | null> {
    const cached = this.teamIdCache.get(teamName);
    if (cached !== undefined) return cached;

    try {
      const data = await this.fetch<FlSearchItem[]>(
        `/search/multi-search?locale=en_INT&query=${encodeURIComponent(teamName)}&sport_id=1`,
      );
      const participants = (data ?? []).filter((x) => x.TYPE === 'participants');
      const target = FlashLiveAdapter.norm(teamName);
      // Prefer an exact (normalized) name match — avoids U21/U23/Ol. youth sides.
      const exact = participants.find((p) => FlashLiveAdapter.norm(p.NAME) === target);
      const id = (exact ?? participants[0])?.ID ?? null;
      this.teamIdCache.set(teamName, id);
      return id;
    } catch (err) {
      this.logger.warn(`Team search failed for "${teamName}": ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Find a FlashScore event id from the anchor team's fixtures, matching either
   * the opponent id or — when names differ between providers (e.g. Czechia vs
   * Czech Republic) — the kickoff date, since a team plays at most once per day.
   */
  private async findEvent(
    anchorId: string,
    opponentId: string | null,
    kickoffDay: string | null,
  ): Promise<{ id: string; homeId: string | null } | null> {
    try {
      const data = await this.fetch<{ DATA?: FlFixtureGroup[] }>(
        `/teams/fixtures?locale=en_INT&team_id=${anchorId}&sport_id=1&page=1`,
      );
      for (const group of data?.DATA ?? []) {
        for (const ev of group.EVENTS ?? []) {
          const ids = [...(ev.HOME_PARTICIPANT_IDS ?? []), ...(ev.AWAY_PARTICIPANT_IDS ?? [])];
          const matched =
            (opponentId && ids.includes(opponentId)) ||
            (kickoffDay && new Date(ev.START_TIME * 1000).toISOString().slice(0, 10) === kickoffDay);
          if (matched) return { id: ev.EVENT_ID, homeId: ev.HOME_PARTICIPANT_IDS?.[0] ?? null };
        }
      }
      return null;
    } catch (err) {
      this.logger.warn(`Fixtures lookup failed for ${anchorId}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /** Backwards-compatible head-to-head only. */
  async getH2H(homeTeamName: string, awayTeamName: string, kickoffISO?: string): Promise<AfH2HFixture[]> {
    return (await this.getBundle(homeTeamName, awayTeamName, kickoffISO)).h2h;
  }

  /**
   * Head-to-head history plus each team's recent form, from a single FlashScore
   * h2h response. Every item is normalised so the subject team is `teams.home`
   * (the fixture home for h2h; the team itself for its form list) — this makes
   * win tallies and W/L/D badges trivial on the client.
   */
  async getBundle(homeTeamName: string, awayTeamName: string, kickoffISO?: string): Promise<FlBundle> {
    const empty: FlBundle = { h2h: [], homeForm: [], awayForm: [] };
    if (!this.hasKey) return empty;

    const [homeId, awayId] = await Promise.all([
      this.getTeamId(homeTeamName),
      this.getTeamId(awayTeamName),
    ]);

    // Anchor on whichever team resolved; the kickoff date covers the other one
    // when provider names diverge (e.g. Czechia vs Czech Republic).
    const anchorId = homeId ?? awayId;
    if (!anchorId) {
      this.logger.warn(`Could not resolve team ids: ${homeTeamName}=${homeId}, ${awayTeamName}=${awayId}`);
      return empty;
    }
    const opponentId = anchorId === homeId ? awayId : homeId;
    const kickoffDay = kickoffISO ? kickoffISO.slice(0, 10) : null;

    const event = await this.findEvent(anchorId, opponentId, kickoffDay);
    if (!event) {
      this.logger.warn(`No FlashScore event found for ${homeTeamName} vs ${awayTeamName}`);
      return empty;
    }

    try {
      const data = await this.fetch<{ DATA?: FlH2HTab[] }>(
        `/events/h2h?locale=en_INT&event_id=${event.id}`,
      );
      const overall = data?.DATA?.find((t) => t.TAB_NAME === 'Overall') ?? data?.DATA?.[0];
      const groups = overall?.GROUPS ?? [];

      const h2hGroup = groups.find((g) => /head-to-head/i.test(g.GROUP_LABEL));
      const lastGroups = groups.filter((g) => /last matches/i.test(g.GROUP_LABEL));

      // Resolve each team's FlashScore id, falling back to the id common to its
      // own "Last matches" group when a name didn't resolve via search.
      const homeFocal = homeId ?? this.otherId(h2hGroup, awayId);
      const awayFocal = awayId ?? this.otherId(h2hGroup, homeId);

      const homeGroup =
        lastGroups.find((g) => FlashLiveAdapter.groupFocalId(g) === homeFocal) ??
        (awayId ? lastGroups.find((g) => FlashLiveAdapter.groupFocalId(g) !== awayId) : lastGroups[0]);
      const awayGroup = lastGroups.find((g) => g !== homeGroup);

      const homeSubject = homeFocal ?? (homeGroup && FlashLiveAdapter.groupFocalId(homeGroup));
      const awaySubject = awayFocal ?? (awayGroup && FlashLiveAdapter.groupFocalId(awayGroup));

      return {
        h2h: (h2hGroup?.ITEMS ?? []).map((m) => this.mapItem(m, homeSubject ?? undefined)),
        homeForm: (homeGroup?.ITEMS ?? []).map((m) => this.mapItem(m, homeSubject ?? undefined)).slice(0, 10),
        awayForm: (awayGroup?.ITEMS ?? []).map((m) => this.mapItem(m, awaySubject ?? undefined)).slice(0, 10),
      };
    } catch (err) {
      this.logger.warn(`H2H fetch failed for event ${event.id}: ${err instanceof Error ? err.message : String(err)}`);
      return empty;
    }
  }

  /**
   * Confirmed match lineups (formation, starting XI, substitutes, coach) for
   * each team — only present once FlashScore publishes them (≈1h before
   * kickoff). Returns null when no lineups are available yet.
   */
  async getLineups(homeTeamName: string, awayTeamName: string, kickoffISO?: string): Promise<LineupBundle | null> {
    if (!this.hasKey) return null;

    const [homeId, awayId] = await Promise.all([
      this.getTeamId(homeTeamName),
      this.getTeamId(awayTeamName),
    ]);
    const anchorId = homeId ?? awayId;
    if (!anchorId) return null;
    const opponentId = anchorId === homeId ? awayId : homeId;
    const kickoffDay = kickoffISO ? kickoffISO.slice(0, 10) : null;

    const event = await this.findEvent(anchorId, opponentId, kickoffDay);
    if (!event) return null;

    try {
      const data = await this.fetch<{ DATA?: FlLineupBlock[] }>(
        `/events/lineups?locale=en_INT&event_id=${event.id}`,
      );
      const blocks = new Map((data?.DATA ?? []).map((b) => [b.FORMATION_NAME, b]));
      const starting = blocks.get('Starting Lineups')?.FORMATIONS ?? [];
      if (starting.length < 2) return null; // not published yet

      const subs = blocks.get('Substitutes')?.FORMATIONS ?? [];
      const coaches = blocks.get('Coaches')?.FORMATIONS ?? [];

      // FORMATION_LINE 1 = event home, 2 = event away → align to fixture sides.
      const homeIsLine1 = !homeId || !event.homeId || event.homeId === homeId;
      const homeLine = homeIsLine1 ? 1 : 2;
      const awayLine = homeIsLine1 ? 2 : 1;

      const build = (line: number): TeamLineup => {
        const start = starting.find((f) => f.FORMATION_LINE === line);
        const disp = start?.FORMATION_DISPOSTION ?? '';
        const lines = disp.split('-').map((n) => parseInt(n, 10)).filter((n) => !isNaN(n));
        return {
          formation: lines.slice(1).join('-'), // drop leading GK "1"
          lines,
          coach: this.lineupName(coaches.find((f) => f.FORMATION_LINE === line)?.MEMBERS?.[0]),
          startingXI: [...(start?.MEMBERS ?? [])]
            .sort((a, b) => a.PLAYER_POSITION - b.PLAYER_POSITION)
            .map((m) => this.mapPlayer(m)),
          substitutes: (subs.find((f) => f.FORMATION_LINE === line)?.MEMBERS ?? []).map((m) => this.mapPlayer(m)),
        };
      };

      return { home: build(homeLine), away: build(awayLine) };
    } catch (err) {
      this.logger.warn(`Lineups fetch failed for event ${event.id}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  private mapPlayer(m: FlLineupMember): LineupPlayer {
    return {
      id: m.PLAYER_ID,
      name: m.SHORT_NAME || m.PLAYER_FULL_NAME.replace(/\s*\(G\)\s*$/, ''),
      number: m.PLAYER_NUMBER ?? null,
    };
  }

  private lineupName(m: FlLineupMember | undefined): string | null {
    if (!m) return null;
    return (m.SHORT_NAME || m.PLAYER_FULL_NAME || '').trim() || null;
  }

  /** The participant id in a group that isn't `knownId` (the two-team h2h case). */
  private otherId(group: FlH2HGroup | undefined, knownId: string | null): string | null {
    for (const m of group?.ITEMS ?? []) {
      if (m.UQ && m.UQ !== knownId) return m.UQ;
      if (m.UO && m.UO !== knownId) return m.UO;
    }
    return null;
  }

  /** The participant id shared by every item in a "Last matches" group. */
  private static groupFocalId(group: FlH2HGroup): string | null {
    const counts = new Map<string, number>();
    for (const m of group.ITEMS) {
      for (const id of [m.UQ, m.UO]) {
        if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    let best: string | null = null;
    let max = 0;
    for (const [id, n] of counts) {
      if (n > max) { max = n; best = id; }
    }
    return best;
  }

  /** Map a FlashScore item; when `subjectId` is given, orient it as `teams.home`. */
  private mapItem(m: FlH2HItem, subjectId?: string): AfH2HFixture {
    let home = m.HOME_SCORE_FULL != null ? parseInt(m.HOME_SCORE_FULL, 10) : null;
    let away = m.AWAY_SCORE_FULL != null ? parseInt(m.AWAY_SCORE_FULL, 10) : null;
    let homeName = m.HOME_PARTICIPANT_NAME_ONE ?? '';
    let awayName = m.AWAY_PARTICIPANT_NAME_ONE ?? '';
    let homeLogo = m.HOME_IMAGES?.[0] ?? '';
    let awayLogo = m.AWAY_IMAGES?.[0] ?? '';

    // Normalise so the subject team is on the home side.
    if (subjectId && m.UO === subjectId && m.UQ !== subjectId) {
      [home, away] = [away, home];
      [homeName, awayName] = [awayName, homeName];
      [homeLogo, awayLogo] = [awayLogo, homeLogo];
    }

    return {
      fixture: {
        id: FlashLiveAdapter.numericId(m.EVENT_ID),
        date: new Date(m.START_TIME * 1000).toISOString(),
        status: { short: 'FT', elapsed: null },
        venue: { name: null, city: null },
      },
      league: {
        id: 0,
        name: m.EVENT_NAME ?? '',
        country: m.COUNTRY_NAME ?? '',
        logo: '',
        season: new Date(m.START_TIME * 1000).getFullYear(),
      },
      teams: {
        home: { id: 0, name: homeName, logo: homeLogo, winner: null },
        away: { id: 0, name: awayName, logo: awayLogo, winner: null },
      },
      goals: { home, away },
      score: {
        halftime: { home: null, away: null },
        fulltime: { home, away },
      },
    };
  }
}
