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
  public client: Redis;

  constructor(redisUrlOrClient: string | Redis) {
    if (typeof redisUrlOrClient === "string") {
      this.client = new Redis(redisUrlOrClient, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: true,
        connectTimeout: 5000,
        lazyConnect: false,
        retryStrategy(times) {
          return Math.min(times * 100, 3000);
        },
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
    return this.client.keys(pattern || "*");
  }

  public async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  public async flush(): Promise<void> {
    await this.client.flushdb();
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.client.status !== "end") {
        await this.client.quit();
      }
    } catch {
      this.client.disconnect();
    }
  }
}

export class FallbackCache implements Cache {
  public readonly client: Redis;
  private readonly redis: RedisCache;
  private readonly memory: MemoryCache;
  private hasLoggedOffline = false;

  constructor(redisUrl: string) {
    this.client = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
      connectTimeout: 5000,
      lazyConnect: false,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      },
    });

    this.client.on("error", (err) => {
      if (!this.hasLoggedOffline) {
        console.warn(
          `[CACHE] Redis connection error: ${err.message}. Falling back to In-Memory cache if unavailable.`
        );
        this.hasLoggedOffline = true;
      }
    });

    this.client.on("ready", () => {
      if (this.hasLoggedOffline) {
        console.log("[CACHE] Redis connection is ready. Returning to Redis cache.");
        this.hasLoggedOffline = false;
      }
    });

    this.redis = new RedisCache(this.client);
    this.memory = new MemoryCache();
  }

  private isRedisAvailable(): boolean {
    const status = this.client.status;
    return status === "ready" || status === "connect" || status === "connecting";
  }

  private handleRedisError(operation: string, err: unknown): void {
    const msg = err instanceof Error ? err.message : String(err);
    if (!this.hasLoggedOffline) {
      console.warn(`[CACHE] Redis ${operation} failed, falling back to In-Memory cache. Error: ${msg}`);
      this.hasLoggedOffline = true;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    if (this.isRedisAvailable()) {
      try {
        return await this.redis.get<T>(key);
      } catch (err: unknown) {
        this.handleRedisError("get", err);
        return this.memory.get<T>(key);
      }
    }
    return this.memory.get<T>(key);
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (this.isRedisAvailable()) {
      try {
        await this.redis.set<T>(key, value, ttlSeconds);
        return;
      } catch (err: unknown) {
        this.handleRedisError("set", err);
        await this.memory.set<T>(key, value, ttlSeconds);
        return;
      }
    }
    await this.memory.set<T>(key, value, ttlSeconds);
  }

  public async del(key: string): Promise<void> {
    if (this.isRedisAvailable()) {
      try {
        await this.redis.del(key);
        return;
      } catch (err: unknown) {
        this.handleRedisError("del", err);
        await this.memory.del(key);
        return;
      }
    }
    await this.memory.del(key);
  }

  public async keys(pattern?: string): Promise<string[]> {
    if (this.isRedisAvailable()) {
      try {
        return await this.redis.keys(pattern ?? "*");
      } catch (err: unknown) {
        this.handleRedisError("keys", err);
        return this.memory.keys(pattern);
      }
    }
    return this.memory.keys(pattern);
  }

  public async ttl(key: string): Promise<number> {
    if (this.isRedisAvailable()) {
      try {
        return await this.redis.ttl(key);
      } catch (err: unknown) {
        this.handleRedisError("ttl", err);
        return this.memory.ttl(key);
      }
    }
    return this.memory.ttl(key);
  }

  public async flush(): Promise<void> {
    if (this.isRedisAvailable()) {
      try {
        await this.redis.flush();
        await this.memory.flush();
        return;
      } catch (err: unknown) {
        this.handleRedisError("flush", err);
        await this.memory.flush();
        return;
      }
    }
    await this.memory.flush();
  }

  public async disconnect(): Promise<void> {
    await this.redis.disconnect();
  }
}

declare global {
  var __runaCacheGlobal: Cache | undefined;
}

let cachedClient: Cache | undefined = globalThis.__runaCacheGlobal;

export function createCacheClient(): Cache {
  if (cachedClient) {
    return cachedClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl && process.env.CACHE_DRIVER === "redis") {
    cachedClient = new FallbackCache(redisUrl);
  } else {
    cachedClient = new MemoryCache();
  }

  globalThis.__runaCacheGlobal = cachedClient;
  return cachedClient;
}
