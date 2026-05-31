import { Injectable, NotFoundException } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import * as schema from '@ai-score/db';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import type { League, LeagueRef } from '@ai-score/shared';

type LeagueRow = typeof schema.leagues.$inferSelect;

@Injectable()
export class LeaguesService {
  constructor(
    private readonly db: DatabaseService,
    private readonly redis: RedisService,
  ) {}

  async findAll(sportId = 1): Promise<League[]> {
    return this.redis.getOrSet(`leagues:all:${sportId}`, 3600, async () => {
      const rows = await this.db.db
        .select()
        .from(schema.leagues)
        .where(eq(schema.leagues.sportId, sportId))
        .orderBy(asc(schema.leagues.name));
      return rows.map(this.toLeague);
    });
  }

  async findOne(id: number): Promise<League> {
    return this.redis.getOrSet(`leagues:one:${id}`, 3600, async () => {
      const [row] = await this.db.db
        .select()
        .from(schema.leagues)
        .where(eq(schema.leagues.id, id))
        .limit(1);
      if (!row) throw new NotFoundException(`League ${id} not found`);
      return this.toLeague(row);
    });
  }

  private toLeague(row: LeagueRow): League {
    return {
      id: row.id,
      name: row.name,
      shortName: row.shortName ?? null,
      logo: row.logo ?? null,
      country: row.country ?? '',
      countryCode: row.countryCode ?? null,
      season: row.season,
      type: row.type as 'League' | 'Cup' | 'Other',
      startDate: row.startDate ?? null,
      endDate: row.endDate ?? null,
    };
  }
}
