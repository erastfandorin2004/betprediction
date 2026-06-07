import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { formatOddsBlock } from '@ai-score/shared';
import { manualOddsFor } from './manual-odds';
import { ApiFootballAdapter } from '../api-football/api-football.adapter';

export interface OddsLine {
  map: Record<string, number>; // for value calc
  block: string;               // human-readable odds block for the prompt
}

// Live bookmaker line via The Odds API (the-odds-api.com). Real decimal odds for
// 1X2 (h2h) and totals across EU bookmakers. Needs THE_ODDS_API_KEY (free tier).
// Returns an odds map keyed like formatOddsBlock expects; {} when unavailable.

interface OddsOutcome { name: string; price: number; point?: number }
interface OddsEvent {
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers: { key: string; markets: { key: string; outcomes: OddsOutcome[] }[] }[];
}

@Injectable()
export class OddsAdapter {
  private readonly logger = new Logger(OddsAdapter.name);
  private readonly base = 'https://api.the-odds-api.com/v4';
  private soccerKeys: string[] | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly apiFootball: ApiFootballAdapter,
  ) {}

  private get apiKey(): string {
    return this.config.get<string>('theOddsApi.apiKey') ?? '';
  }
  get hasKey(): boolean {
    return !!this.apiKey;
  }

  private static norm(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
  }

  // Active soccer sport keys (the /sports list call does not consume quota).
  private async getSoccerKeys(): Promise<string[]> {
    if (this.soccerKeys) return this.soccerKeys;
    const res = await fetch(`${this.base}/sports?apiKey=${this.apiKey}&all=true`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`sports ${res.status}`);
    const list = (await res.json()) as { key: string; active: boolean; group: string }[];
    this.soccerKeys = list.filter((s) => s.active && s.key.startsWith('soccer_')).map((s) => s.key);
    return this.soccerKeys;
  }

  // Real line for a match: user-provided manual line first, then The Odds API.
  // dateISO нужен для надёжного резолва ПРЕДСТОЯЩЕГО матча у API-Football (без
  // даты headtohead?last= не находит ещё не сыгранный матч → линии нет).
  async getOdds(homeName: string, awayName: string, dateISO?: string): Promise<OddsLine> {
    const manual = manualOddsFor(homeName, awayName);
    if (manual) {
      this.logger.log(`Manual odds line used for ${homeName} vs ${awayName}`);
      return { map: manual.map, block: manual.block };
    }

    // Основной источник линии — API-Football. The Odds API остаётся фолбэком.
    try {
      const live = await this.apiFootball.getOddsMap(homeName, awayName, dateISO);
      if (live && Object.keys(live.map).length) {
        this.logger.log(`API-Football odds used for ${homeName} vs ${awayName}`);
        return live;
      }
    } catch (err) {
      this.logger.warn(`API-Football odds failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!this.hasKey) return { map: {}, block: '' };
    const home = OddsAdapter.norm(homeName);
    const away = OddsAdapter.norm(awayName);
    try {
      const keys = await this.getSoccerKeys();
      // Prioritise international competitions where national teams play.
      const ordered = [
        ...keys.filter((k) => /nations|friendl|world|euro|qualif|copa|conmebol|uefa|fifa/.test(k)),
        ...keys.filter((k) => !/nations|friendl|world|euro|qualif|copa|conmebol|uefa|fifa/.test(k)),
      ].slice(0, 8);

      for (const key of ordered) {
        const res = await fetch(
          `${this.base}/sports/${key}/odds?apiKey=${this.apiKey}&regions=eu&markets=h2h,totals&oddsFormat=decimal`,
          { signal: AbortSignal.timeout(8000) },
        );
        if (!res.ok) continue;
        const events = (await res.json()) as OddsEvent[];
        const ev = events.find((e) => {
          const h = OddsAdapter.norm(e.home_team);
          const a = OddsAdapter.norm(e.away_team);
          return (h.includes(home) || home.includes(h)) && (a.includes(away) || away.includes(a));
        });
        if (ev) {
          this.logger.log(`Odds found for ${homeName} vs ${awayName} in ${key}`);
          const map = this.mapEvent(ev, homeName, awayName);
          return { map, block: formatOddsBlock(map) };
        }
      }
      this.logger.warn(`No live odds found for ${homeName} vs ${awayName}`);
      return { map: {}, block: '' };
    } catch (err) {
      this.logger.warn(`Odds fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      return { map: {}, block: '' };
    }
  }

  // Average prices across bookmakers → odds map (1/X/2, over/under totals).
  private mapEvent(ev: OddsEvent, homeName: string, awayName: string): Record<string, number> {
    const home = OddsAdapter.norm(homeName);
    const acc: Record<string, number[]> = {};
    const add = (k: string, v: number) => { (acc[k] ??= []).push(v); };

    for (const bk of ev.bookmakers) {
      for (const m of bk.markets) {
        if (m.key === 'h2h') {
          for (const o of m.outcomes) {
            const n = OddsAdapter.norm(o.name);
            if (n === 'draw') add('X', o.price);
            else if (n.includes(home) || home.includes(n)) add('1', o.price);
            else add('2', o.price);
          }
        } else if (m.key === 'totals') {
          for (const o of m.outcomes) {
            if (o.point == null) continue;
            const line = String(o.point).replace('.', '_');
            const side = o.name.toLowerCase().startsWith('o') ? 'over' : 'under';
            add(`${side}_${line}`, o.price);
          }
        }
      }
    }

    const out: Record<string, number> = {};
    for (const [k, arr] of Object.entries(acc)) {
      out[k] = Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
    }
    return out;
  }
}
