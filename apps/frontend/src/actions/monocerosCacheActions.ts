"use server";

import { auth } from "@runa/auth";
import { hasPermission, RunaFlags } from "@runa/permissions";
import { createCacheClient } from "@runa/cache";

const cache = createCacheClient();

export async function getCacheKeys(pattern?: string): Promise<{ key: string; ttl: number }[]> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    throw new Error("Unauthorized");
  }

  try {
    const keys = await cache.keys(pattern);
    const keysWithTtl = await Promise.all(
      keys.map(async (key) => {
        const ttl = await cache.ttl(key);
        return { key, ttl };
      })
    );
    // Sort keys alphabetically
    return keysWithTtl.sort((a, b) => a.key.localeCompare(b.key));
  } catch (error) {
    console.error("Failed to get cache keys:", error);
    throw new Error("Failed to retrieve cache keys");
  }
}

export async function getCacheValue(key: string): Promise<{ value: any; ttl: number }> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    throw new Error("Unauthorized");
  }

  try {
    const [value, ttl] = await Promise.all([
      cache.get<any>(key),
      cache.ttl(key),
    ]);
    return { value, ttl };
  } catch (error) {
    console.error(`Failed to get cache value for key ${key}:`, error);
    throw new Error(`Failed to retrieve cache value for key ${key}`);
  }
}

export async function deleteCacheKey(key: string): Promise<void> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    throw new Error("Unauthorized");
  }

  try {
    await cache.del(key);
  } catch (error) {
    console.error(`Failed to delete cache key ${key}:`, error);
    throw new Error(`Failed to delete cache key ${key}`);
  }
}

export async function flushCache(): Promise<void> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    throw new Error("Unauthorized");
  }

  try {
    await cache.flush();
  } catch (error) {
    console.error("Failed to flush cache:", error);
    throw new Error("Failed to flush cache");
  }
}
