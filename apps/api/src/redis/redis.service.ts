import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;
  private available = false;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    this.client = new Redis(url, {
      lazyConnect: true,
      enableReadyCheck: false,
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
    });
    this.client.on('error', (err: Error) => {
      if (this.available) this.logger.warn(`Redis error: ${err.message}`);
    });
    try {
      await this.client.connect();
      await this.client.ping();
      this.available = true;
      this.logger.log('Redis connected');
    } catch {
      this.logger.warn('Redis unavailable — caching disabled (graceful degradation)');
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }

  async get(key: string): Promise<string | null> {
    if (!this.available) return null;
    try {
      return await this.client.get(key);
    } catch {
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } catch {
      // graceful degradation
    }
  }

  async del(key: string): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.del(key);
    } catch {
      // graceful degradation
    }
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
    const value = await factory();
    await this.set(key, JSON.stringify(value), ttlSeconds);
    return value;
  }
}
