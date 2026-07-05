import Redis from "ioredis";

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  keys(pattern?: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
  flush(): Promise<void>;
  disconnect?(): Promise<void>;
}

export class MemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expiresAt: number | null }>();

  public async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value as T;
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  public async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  public async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());
    const activeKeys: string[] = [];
    for (const key of allKeys) {
      const item = this.store.get(key);
      if (item && (item.expiresAt === null || Date.now() <= item.expiresAt)) {
        activeKeys.push(key);
      } else if (item) {
        this.store.delete(key);
      }
    }
    if (pattern) {
      const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return activeKeys.filter((key) => regexPattern.test(key));
    }
    return activeKeys;
  }

  public async ttl(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item) return -2;
    if (item.expiresAt !== null && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return -2;
    }
    if (item.expiresAt === null) return -1;
    return Math.round((item.expiresAt - Date.now()) / 1000);
  }

  public async flush(): Promise<void> {
    this.store.clear();
  }
}

export class RedisCache implements Cache {
  private client: Redis;

  constructor(redisUrlOrClient: string | Redis) {
    if (typeof redisUrlOrClient === "string") {
      this.client = new Redis(redisUrlOrClient, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    } else {
      this.client = redisUrlOrClient;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, data, "EX", ttlSeconds);
    } else {
      await this.client.set(key, data);
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async keys(pattern: string = "*"): Promise<string[]> {
    return this.client.keys(pattern);
  }

  public async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  public async flush(): Promise<void> {
    await this.client.flushdb();
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export class FallbackCache implements Cache {
  private redis: RedisCache;
  private memory: MemoryCache;
  private isRedisOffline = false;

  constructor(redisUrl: string) {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });

    client.on("error", (err) => {
      if (!this.isRedisOffline) {
        console.warn(
          `[CACHE] Redis error encountered, falling back to In-Memory cache. Error: ${err.message}`
        );
        this.isRedisOffline = true;
      }
    });

    client.on("connect", () => {
      if (this.isRedisOffline) {
        console.log("[CACHE] Redis connection re-established, returning to Redis cache.");
        this.isRedisOffline = false;
      }
    });

    this.redis = new RedisCache(client);
    this.memory = new MemoryCache();
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.isRedisOffline) {
      return this.memory.get<T>(key);
    }
    try {
      return await this.redis.get<T>(key);
    } catch (err: unknown) {
      this.isRedisOffline = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CACHE] Redis get failed, falling back to In-Memory cache. Error: ${msg}`);
      return this.memory.get<T>(key);
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.isRedisOffline) {
      return this.memory.set<T>(key, value, ttlSeconds);
    }
    try {
      await this.redis.set<T>(key, value, ttlSeconds);
    } catch (err: unknown) {
      this.isRedisOffline = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CACHE] Redis set failed, falling back to In-Memory cache. Error: ${msg}`);
      await this.memory.set<T>(key, value, ttlSeconds);
    }
  }

  public async del(key: string): Promise<void> {
    if (this.isRedisOffline) {
      return this.memory.del(key);
    }
    try {
      await this.redis.del(key);
    } catch (err: unknown) {
      this.isRedisOffline = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CACHE] Redis del failed, falling back to In-Memory cache. Error: ${msg}`);
      await this.memory.del(key);
    }
  }

  public async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }

  public async keys(pattern?: string): Promise<string[]> {
    if (this.isRedisOffline) {
      return this.memory.keys(pattern);
    }
    try {
      return await this.redis.keys(pattern);
    } catch (err: unknown) {
      this.isRedisOffline = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CACHE] Redis keys failed, falling back to In-Memory cache. Error: ${msg}`);
      return this.memory.keys(pattern);
    }
  }

  public async ttl(key: string): Promise<number> {
    if (this.isRedisOffline) {
      return this.memory.ttl(key);
    }
    try {
      return await this.redis.ttl(key);
    } catch (err: unknown) {
      this.isRedisOffline = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CACHE] Redis ttl failed, falling back to In-Memory cache. Error: ${msg}`);
      return this.memory.ttl(key);
    }
  }

  public async flush(): Promise<void> {
    if (this.isRedisOffline) {
      return this.memory.flush();
    }
    try {
      await this.redis.flush();
    } catch (err: unknown) {
      this.isRedisOffline = true;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[CACHE] Redis flush failed, falling back to In-Memory cache. Error: ${msg}`);
      await this.memory.flush();
    }
  }
}

export function createCacheClient(): Cache {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && process.env.CACHE_DRIVER === "redis") {
    return new FallbackCache(redisUrl);
  }
  return new MemoryCache();
}
