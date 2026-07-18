"use server";

import { auth } from "@runa/auth";
import { prisma } from "@runa/database";
import { hasPermission, RunaFlags } from "@runa/permissions";
import { createCacheClient } from "@runa/cache";

export interface SessionRefreshResult {
  success: boolean;
  processed: number;
  error?: string;
}

export async function triggerGlobalSessionRefresh(
  batchSize: number = 100
): Promise<SessionRefreshResult> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    return { success: false, processed: 0, error: "Unauthorized" };
  }

  try {
    const cache = createCacheClient();
    let processed = 0;
    let cursor: string | undefined = undefined;

    while (true) {
      const users = await prisma.user.findMany({
        take: batchSize,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: { id: true },
        orderBy: { id: "asc" },
      });

      if (users.length === 0) {
        break;
      }

      const userIds: string[] = users.map((u) => u.id);
      
      // Delete cached permissions in parallel for this batch
      await Promise.all(
        userIds.map((userId) => cache.del(`user:permissions:${userId}`))
      );

      processed += userIds.length;
      cursor = userIds[userIds.length - 1];
    }

    return { success: true, processed };
  } catch (error: unknown) {
    console.error("[MONOCEROS] Failed to trigger global session refresh:", error);
    const msg = error instanceof Error ? error.message : "Internal error";
    return { success: false, processed: 0, error: msg };
  }
}
