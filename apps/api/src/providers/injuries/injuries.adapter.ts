import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { pickTeamId } from '../api-football/api-football.adapter';

// Injuries/suspensions from API-Football (api-sports.io DIRECT endpoint, key
// `API_FOOTBALL_KEY`). FlashLive has no injuries feed and the RapidAPI key is
// subscribed to FlashLive (403 on api-football), so this needs its own key.
// Gracefully returns [] when the key is missing or the plan blocks the season.

interface AfInjuryItem {
  player?: { name?: string; reason?: string | null; type?: string | null };
  team?: { id?: number };
  fixture?: { date?: string };
}

@Injectable()
export class InjuriesAdapter {
  private readonly logger = new Logger(InjuriesAdapter.name);
  private readonly base = 'https://v3.football.api-sports.io';
  private readonly teamIdCache = new Map<string, number | null>();

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string {
    return this.config.get<string>('apiFootball.apiKey') ?? '';
  }
  get hasKey(): boolean {
    return !!this.apiKey;
  }

  private async fetch<T>(path: string): Promise<T> {
    const res = await fetch(`${this.base}${path}`, {
      headers: { 'x-apisports-key': this.apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`API-Football ${res.status} on ${path}`);
    return res.json() as Promise<T>;
  }

  private async getTeamId(name: string): Promise<number | null> {
    const cached = this.teamIdCache.get(name);
    if (cached !== undefined) return cached;
    try {
      const data = await this.fetch<{ response: { team: { id: number; name: string; national?: boolean } }[] }>(
        `/teams?search=${encodeURIComponent(name)}`,
      );
      const id = pickTeamId(data.response ?? [], name);
      this.teamIdCache.set(name, id);
      return id;
    } catch (err) {
      this.logger.warn(`Injuries team search failed for "${name}": ${err instanceof Error ? err.message : String(err)}`);
      return null;
    }
  }

  // "Player (reason), Player2 (reason)" — most recent unique players for a team.
  private async teamInjuries(name: string, season: number): Promise<string> {
    const id = await this.getTeamId(name);
    if (!id) return '';
    try {
      const data = await this.fetch<{ response: AfInjuryItem[] }>(
        `/injuries?team=${id}&season=${season}`,
      );
      const items = [...(data.response ?? [])]
        .sort((a, b) => (b.fixture?.date ?? '').localeCompare(a.fixture?.date ?? ''));
      const seen = new Set<string>();
      const names: string[] = [];
      for (const it of items) {
        const n = it.player?.name;
        if (!n || seen.has(n)) continue;
        seen.add(n);
        const reason = it.player?.reason || it.player?.type || '';
        names.push(reason ? `${n} (${reason})` : n);
        if (names.length >= 6) break;
      }
      return names.join(', ');
    } catch (err) {
      this.logger.warn(`Injuries fetch failed for "${name}": ${err instanceof Error ? err.message : String(err)}`);
      return '';
    }
  }

  // Returns "Хозяева: …; Гости: …" or '' when nothing available.
  async getInjuries(homeName: string, awayName: string, season: number, homeLabel: string, awayLabel: string): Promise<string> {
    if (!this.hasKey) return '';
    const [home, away] = await Promise.all([
      this.teamInjuries(homeName, season),
      this.teamInjuries(awayName, season),
    ]);
    const parts = [
      home ? `${homeLabel}: ${home}` : null,
      away ? `${awayLabel}: ${away}` : null,
    ].filter(Boolean);
    return parts.join('; ');
  }
}
