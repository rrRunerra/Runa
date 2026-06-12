import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createCacheClient, Cache } from '@runa/cache';

@Injectable()
export class CacheService implements Cache, OnModuleDestroy {
  private readonly client: Cache = createCacheClient();

  async get<T>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this.client.set<T>(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    return this.client.del(key);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client.disconnect) {
      await this.client.disconnect();
    }
  }
}
