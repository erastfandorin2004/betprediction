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

interface FlResultEvent {
  EVENT_ID: string;
  START_TIME: number;
  HOME_PARTICIPANT_IDS?: string[];
  AWAY_PARTICIPANT_IDS?: string[];
  HOME_PARTICIPANT_NAME_ONE?: string;
  AWAY_PARTICIPANT_NAME_ONE?: string;
  HOME_SCORE_CURRENT?: string | number;
  AWAY_SCORE_CURRENT?: string | number;
  HOME_IMAGES?: string[];
  AWAY_IMAGES?: string[];
}

interface FlResultGroup {
  NAME?: string;
  SHORT_NAME?: string;
  COUNTRY_NAME?: string;
  EVENTS?: FlResultEvent[];
}

interface FlSquadItem {
  PLAYER_ID: string;
  PLAYER_NAME: string;
  PLAYER_TYPE_ID: string; // GOALKEEPER | DEFENDER | MIDFIELDER | FORWARD | COACH
  PLAYER_JERSEY_NUMBER?: number | null;
}

interface FlSquadGroup {
  GROUP_LABEL: string;
  ITEMS?: FlSquadItem[];
}

/** Roster player with shirt number (from /teams/squad). */
export interface SquadMember {
  id: string;
  name: string;
  position: string; // FlashScore type id, maps to GK/DEF/MID/FWD
  shirtNumber: number | null;
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

interface FlStatItem {
  INCIDENT_NAME: string;
  VALUE_HOME: string;
  VALUE_AWAY: string;
}

interface FlStatGroup {
  GROUP_LABEL: string;
  ITEMS: FlStatItem[];
}

interface FlStatStage {
  STAGE_NAME: string; // "Match" | "1st Half" | "2nd Half"
  GROUPS: FlStatGroup[];
}

export interface MatchStat {
  name: string; // FlashScore incident name, e.g. "Shots on target"
  home: string;
  away: string;
}

interface FlSummaryParticipant {
  INCIDENT_TYPE: string; // GOAL, PENALTY_SCORED, YELLOW_CARD, RED_CARD, ASSISTANCE…
  PARTICIPANT_NAME: string;
  HOME_SCORE?: string;
  AWAY_SCORE?: string;
}

interface FlSummaryItem {
  INCIDENT_TEAM: number; // 1 = event home, 2 = event away
  INCIDENT_TIME: string; // "45+2'"
  INCIDENT_PARTICIPANTS: FlSummaryParticipant[];
}

interface FlSummaryStage {
  STAGE_NAME: string; // "1st Half" | "2nd Half" | …
  ITEMS: FlSummaryItem[];
}

export type SummaryEventType = 'goal' | 'penalty_goal' | 'penalty_missed' | 'yellow' | 'red' | 'marker';

export interface SummaryEvent {
  time: string;
  team: 'home' | 'away' | null; // null for HT/FT markers
  type: SummaryEventType;
  player: string | null;
  assist: string | null;
  scoreHome: number | null;
  scoreAway: number | null;
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
  // Promise caches dedupe concurrent calls (4 fetchers hit the same match) and
  // survive the adapter lifetime; failures are evicted so they can be retried.
  private readonly teamIdCache = new Map<string, Promise<string | null>>();
  private readonly eventCache = new Map<string, Promise<{ id: string; homeId: string | null } | null>>();
  private readonly formCache = new Map<string, Promise<AfH2HFixture[]>>();
  private readonly squadCache = new Map<string, Promise<SquadMember[]>>();
  // Rotating pool of RapidAPI keys — index advances when a key hits its monthly
  // quota; exhausted indices are skipped for the rest of this process lifetime.
  private keyIndex = 0;
  private readonly exhaustedKeys = new Set<number>();

  constructor(private readonly config: ConfigService) {}

  private get keys(): string[] {
    return this.config.get<string[]>('rapidApi.footballApiKeys') ?? [];
  }

  private get hasKey(): boolean {
    return this.keys.some((_, i) => !this.exhaustedKeys.has(i));
  }

  /** Index of the current usable key, advancing past monthly-exhausted ones. */
  private activeIndex(): number {
    const ks = this.keys;
    for (let i = 0; i < ks.length; i++) {
      const idx = (this.keyIndex + i) % ks.length;
      if (!this.exhaustedKeys.has(idx)) {
        this.keyIndex = idx;
        return idx;
      }
    }
    return -1;
  }

  private async fetch<T>(path: string, retries = 2): Promise<T> {
    const idx = this.activeIndex();
    if (idx < 0) throw new Error('No FlashLive key available (all monthly quotas exhausted)');

    const res = await fetch(`${this.base}${path}`, {
      headers: {
        'x-rapidapi-key': this.keys[idx] ?? '',
        'x-rapidapi-host': this.host,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-requests-remaining');
      // Only the MONTHLY-quota message means the key is truly spent — the word
      // "exceeded" also appears in the transient per-second limit, so match the
      // specific phrase (or a remaining counter of exactly 0).
      const monthlyExhausted = remaining === '0' || /monthly quota/i.test(await res.clone().text().catch(() => ''));
      // Mark exactly the key THIS request used (concurrent calls may have moved keyIndex).
      if (monthlyExhausted && this.keys.length > 1 && !this.exhaustedKeys.has(idx)) {
        this.exhaustedKeys.add(idx);
        this.logger.warn(`Key #${idx + 1}/${this.keys.length} monthly quota exhausted — rotating`);
        if (this.activeIndex() >= 0) return this.fetch<T>(path, retries);
      } else if (retries > 0) {
        // Transient per-second limit — back off and retry.
        await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
        return this.fetch<T>(path, retries - 1);
      }
    }
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

  /** Unix-seconds → ISO, tolerant of missing/invalid timestamps. */
  private static isoDate(startTime: number | undefined): string {
    const ms = Number.isFinite(startTime) ? (startTime as number) * 1000 : Date.now();
    return new Date(ms).toISOString();
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
    if (cached) return cached;

    const p = (async () => {
      const data = await this.fetch<FlSearchItem[]>(
        `/search/multi-search?locale=en_INT&query=${encodeURIComponent(teamName)}&sport_id=1`,
      );
      const participants = (data ?? []).filter((x) => x.TYPE === 'participants');
      const target = FlashLiveAdapter.norm(teamName);
      // Prefer an exact (normalized) name match — avoids U21/U23/Ol. youth sides.
      const exact = participants.find((p) => FlashLiveAdapter.norm(p.NAME) === target);
      return (exact ?? participants[0])?.ID ?? null;
    })().catch((err) => {
      this.logger.warn(`Team search failed for "${teamName}": ${err instanceof Error ? err.message : String(err)}`);
      this.teamIdCache.delete(teamName); // allow a later retry
      return null;
    });

    this.teamIdCache.set(teamName, p);
    return p;
  }

  /**
   * Find the FlashScore event id for a fixture by scanning BOTH teams' upcoming
   * fixtures (a smaller nation may have none listed, so the other side covers
   * it), matching on the opponent id or — when provider names diverge — the
   * kickoff date, since a team plays at most once per day.
   */
  private async findEvent(
    homeId: string | null,
    awayId: string | null,
    kickoffDay: string | null,
  ): Promise<{ id: string; homeId: string | null } | null> {
    const key = `${homeId ?? ''}:${awayId ?? ''}:${kickoffDay ?? ''}`;
    const cached = this.eventCache.get(key);
    if (cached) return cached;

    const p = (async () => {
      for (const [anchor, opponent] of [[homeId, awayId], [awayId, homeId]] as const) {
        if (!anchor) continue;
        const found = await this.lookupEvent(anchor, opponent, kickoffDay);
        if (found) return found;
      }
      return null;
    })().catch((err) => {
      this.logger.warn(`Event lookup failed (${homeId}/${awayId}): ${err instanceof Error ? err.message : String(err)}`);
      this.eventCache.delete(key); // allow a later retry
      return null;
    });

    this.eventCache.set(key, p);
    return p;
  }

  private async lookupEvent(
    anchorId: string,
    opponentId: string | null,
    kickoffDay: string | null,
  ): Promise<{ id: string; homeId: string | null } | null> {
    const data = await this.fetch<{ DATA?: FlFixtureGroup[] }>(
      `/teams/fixtures?locale=en_INT&team_id=${anchorId}&sport_id=1&page=1`,
    );
    for (const group of data?.DATA ?? []) {
      for (const ev of group.EVENTS ?? []) {
        const ids = [...(ev.HOME_PARTICIPANT_IDS ?? []), ...(ev.AWAY_PARTICIPANT_IDS ?? [])];
        const sameDay =
          !!kickoffDay && Number.isFinite(ev.START_TIME) &&
          FlashLiveAdapter.isoDate(ev.START_TIME).slice(0, 10) === kickoffDay;
        if ((opponentId && ids.includes(opponentId)) || sameDay) {
          return { id: ev.EVENT_ID, homeId: ev.HOME_PARTICIPANT_IDS?.[0] ?? null };
        }
      }
    }
    return null;
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

    if (!homeId && !awayId) {
      this.logger.warn(`Could not resolve team ids: ${homeTeamName}=${homeId}, ${awayTeamName}=${awayId}`);
      return empty;
    }
    const kickoffDay = kickoffISO ? kickoffISO.slice(0, 10) : null;

    const event = await this.findEvent(homeId, awayId, kickoffDay);
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
   * A team's recent results straight from /teams/results — only needs the team
   * to resolve by name (no event lookup), so it fills form for every team even
   * when the upcoming fixture isn't found. Normalised so the team is `home`.
   */
  async getTeamForm(teamName: string): Promise<AfH2HFixture[]> {
    if (!this.hasKey) return [];
    const id = await this.getTeamId(teamName);
    if (!id) return [];

    const cached = this.formCache.get(id);
    if (cached) return cached;

    const p = (async () => {
      const data = await this.fetch<{ DATA?: FlResultGroup[] }>(
        `/teams/results?locale=en_INT&team_id=${id}&sport_id=1&page=1`,
      );
      const events: { ev: FlResultEvent; comp: string; country: string }[] = [];
      for (const g of data?.DATA ?? []) {
        for (const ev of g.EVENTS ?? []) {
          events.push({ ev, comp: g.SHORT_NAME || g.NAME || '', country: g.COUNTRY_NAME || '' });
        }
      }
      events.sort((a, b) => b.ev.START_TIME - a.ev.START_TIME);
      return events.slice(0, 10).map(({ ev, comp, country }) => this.mapResultEvent(ev, comp, country, id));
    })().catch((err) => {
      this.logger.warn(`Team form failed for "${teamName}": ${err instanceof Error ? err.message : String(err)}`);
      this.formCache.delete(id);
      return [];
    });

    this.formCache.set(id, p);
    return p;
  }

  /** Full team roster with shirt numbers (from /teams/squad), coach excluded. */
  async getSquad(teamName: string): Promise<SquadMember[]> {
    if (!this.hasKey) return [];
    const id = await this.getTeamId(teamName);
    if (!id) return [];

    const cached = this.squadCache.get(id);
    if (cached) return cached;

    const p = (async () => {
      const data = await this.fetch<{ DATA?: FlSquadGroup[] }>(
        `/teams/squad?locale=en_INT&team_id=${id}&sport_id=1`,
      );
      const out: SquadMember[] = [];
      for (const g of data?.DATA ?? []) {
        for (const it of g.ITEMS ?? []) {
          if (it.PLAYER_TYPE_ID === 'COACH') continue;
          out.push({
            id: it.PLAYER_ID,
            name: it.PLAYER_NAME,
            position: it.PLAYER_TYPE_ID,
            shirtNumber: it.PLAYER_JERSEY_NUMBER ?? null,
          });
        }
      }
      return out;
    })().catch((err) => {
      this.logger.warn(`Squad fetch failed for "${teamName}": ${err instanceof Error ? err.message : String(err)}`);
      this.squadCache.delete(id);
      return [];
    });

    this.squadCache.set(id, p);
    return p;
  }

  private mapResultEvent(ev: FlResultEvent, comp: string, country: string, focalId: string): AfH2HFixture {
    const num = (v: string | number | undefined) => {
      const n = typeof v === 'number' ? v : parseInt(v ?? '', 10);
      return isNaN(n) ? null : n;
    };
    let home = num(ev.HOME_SCORE_CURRENT);
    let away = num(ev.AWAY_SCORE_CURRENT);
    let homeName = ev.HOME_PARTICIPANT_NAME_ONE ?? '';
    let awayName = ev.AWAY_PARTICIPANT_NAME_ONE ?? '';
    let homeLogo = ev.HOME_IMAGES?.[0] ?? '';
    let awayLogo = ev.AWAY_IMAGES?.[0] ?? '';

    // Normalise so the focal team is the home side.
    if (!(ev.HOME_PARTICIPANT_IDS ?? []).includes(focalId) && (ev.AWAY_PARTICIPANT_IDS ?? []).includes(focalId)) {
      [home, away] = [away, home];
      [homeName, awayName] = [awayName, homeName];
      [homeLogo, awayLogo] = [awayLogo, homeLogo];
    }

    return {
      fixture: {
        id: FlashLiveAdapter.numericId(ev.EVENT_ID),
        date: FlashLiveAdapter.isoDate(ev.START_TIME),
        status: { short: 'FT', elapsed: null },
        venue: { name: null, city: null },
      },
      league: {
        id: 0,
        name: comp,
        country,
        logo: '',
        season: new Date(ev.START_TIME * 1000).getFullYear(),
      },
      teams: {
        home: { id: 0, name: homeName, logo: homeLogo, winner: null },
        away: { id: 0, name: awayName, logo: awayLogo, winner: null },
      },
      goals: { home, away },
      score: { halftime: { home: null, away: null }, fulltime: { home, away } },
    };
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
    if (!homeId && !awayId) return null;
    const kickoffDay = kickoffISO ? kickoffISO.slice(0, 10) : null;

    const event = await this.findEvent(homeId, awayId, kickoffDay);
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

  /**
   * Full-match statistics (possession, shots, corners, cards…). Returns null
   * when not available yet (future matches). Values aligned to fixture sides.
   */
  async getStats(homeTeamName: string, awayTeamName: string, kickoffISO?: string): Promise<MatchStat[] | null> {
    if (!this.hasKey) return null;

    const [homeId, awayId] = await Promise.all([
      this.getTeamId(homeTeamName),
      this.getTeamId(awayTeamName),
    ]);
    if (!homeId && !awayId) return null;
    const kickoffDay = kickoffISO ? kickoffISO.slice(0, 10) : null;

    const event = await this.findEvent(homeId, awayId, kickoffDay);
    if (!event) return null;

    try {
      const data = await this.fetch<{ DATA?: FlStatStage[] }>(
        `/events/statistics?locale=en_INT&event_id=${event.id}`,
      );
      const match = data?.DATA?.find((s) => s.STAGE_NAME === 'Match') ?? data?.DATA?.[0];
      if (!match) return null;

      // VALUE_HOME is the event home → swap when our fixture home is the event away.
      const swap = !!homeId && !!event.homeId && event.homeId !== homeId;

      const seen = new Set<string>();
      const out: MatchStat[] = [];
      for (const g of match.GROUPS ?? []) {
        for (const it of g.ITEMS ?? []) {
          if (seen.has(it.INCIDENT_NAME)) continue;
          seen.add(it.INCIDENT_NAME);
          out.push({
            name: it.INCIDENT_NAME,
            home: swap ? it.VALUE_AWAY : it.VALUE_HOME,
            away: swap ? it.VALUE_HOME : it.VALUE_AWAY,
          });
        }
      }
      return out.length ? out : null;
    } catch (err) {
      this.logger.warn(`Stats fetch failed for event ${event.id}: ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  /**
   * Match summary timeline — goals (with running score + assist), cards,
   * penalties, plus HT/FT markers. Null when no events yet (future matches).
   */
  async getSummary(homeTeamName: string, awayTeamName: string, kickoffISO?: string): Promise<SummaryEvent[] | null> {
    if (!this.hasKey) return null;

    const [homeId, awayId] = await Promise.all([
      this.getTeamId(homeTeamName),
      this.getTeamId(awayTeamName),
    ]);
    if (!homeId && !awayId) return null;
    const kickoffDay = kickoffISO ? kickoffISO.slice(0, 10) : null;

    const event = await this.findEvent(homeId, awayId, kickoffDay);
    if (!event) return null;

    const KEEP: Record<string, SummaryEventType> = {
      GOAL: 'goal',
      PENALTY_SCORED: 'penalty_goal',
      PENALTY_MISSED: 'penalty_missed',
      YELLOW_CARD: 'yellow',
      RED_CARD: 'red',
      YELLOW_RED_CARD: 'red',
    };

    try {
      const data = await this.fetch<{ DATA?: FlSummaryStage[] }>(
        `/events/summary?locale=en_INT&event_id=${event.id}`,
      );
      const stages = data?.DATA ?? [];
      if (!stages.length) return null;

      // INCIDENT_TEAM 1 = event home → flip when fixture home is the event away.
      const swap = !!homeId && !!event.homeId && event.homeId !== homeId;

      const out: SummaryEvent[] = [];
      let rh = 0, ra = 0; // running score in event orientation
      const mark = (time: string): SummaryEvent => ({
        time, team: null, type: 'marker', player: null, assist: null,
        scoreHome: swap ? ra : rh, scoreAway: swap ? rh : ra,
      });

      for (const st of stages) {
        for (const it of st.ITEMS ?? []) {
          const ps = it.INCIDENT_PARTICIPANTS ?? [];
          const main = ps.find((p) => KEEP[p.INCIDENT_TYPE]);
          const type = main && KEEP[main.INCIDENT_TYPE];
          if (!main || !type) continue;
          let team: 'home' | 'away' = it.INCIDENT_TEAM === 1 ? 'home' : 'away';
          if (swap) team = team === 'home' ? 'away' : 'home';
          const assist = ps.find((p) => p.INCIDENT_TYPE === 'ASSISTANCE')?.PARTICIPANT_NAME ?? null;

          let scoreHome: number | null = null;
          let scoreAway: number | null = null;
          if (type === 'goal' || type === 'penalty_goal') {
            if (main.HOME_SCORE != null && main.AWAY_SCORE != null) {
              rh = parseInt(main.HOME_SCORE, 10);
              ra = parseInt(main.AWAY_SCORE, 10);
            } else if (it.INCIDENT_TEAM === 1) {
              rh++;
            } else {
              ra++;
            }
            scoreHome = swap ? ra : rh;
            scoreAway = swap ? rh : ra;
          }

          out.push({ time: it.INCIDENT_TIME, team, type, player: main.PARTICIPANT_NAME, assist, scoreHome, scoreAway });
        }
        if (st.STAGE_NAME === '1st Half') out.push(mark('HT'));
      }
      out.push(mark('FT'));

      return out;
    } catch (err) {
      this.logger.warn(`Summary fetch failed for event ${event.id}: ${err instanceof Error ? err.message : String(err)}`);
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
        date: FlashLiveAdapter.isoDate(m.START_TIME),
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
