"use server";

import { prisma, LynxLogs, LynxLogType } from "@runa/database";

export type LogEntry = LynxLogs;

export async function getLogs(
  cursor?: number,
  limit: number = 50,
  type?: LynxLogType,
  context?: string,
) {
  try {
    const logs = await prisma.lynxLogs.findMany({
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor item itself
      where: {
        type: type ? { equals: type } : undefined,
        context: context ? { contains: context } : undefined,
      },
      orderBy: {
        id: "desc",
      },
    });

    let nextCursor: number | undefined = undefined;
    if (logs.length > limit) {
      const nextItem = logs.pop();
      nextCursor = nextItem?.id;
    } else if (logs.length > 0) {
    }

    return {
      logs,
      nextCursor,
    };
  } catch (error) {
    console.error("Error fetching logs:", error);
    return { logs: [], nextCursor: undefined };
  }
}
