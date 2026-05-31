import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, Pool } from '@ai-score/db';
import type { NodePgDatabase } from '@ai-score/db';
import * as schema from '@ai-score/db';

export type Db = NodePgDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: InstanceType<typeof Pool>;
  public db!: Db;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.getOrThrow<string>('database.url');
    this.pool = new Pool({ connectionString: url, max: 5 });
    this.db = drizzle(this.pool, { schema });
    await this.pool.query('SELECT 1');
    this.logger.log('PostgreSQL connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
