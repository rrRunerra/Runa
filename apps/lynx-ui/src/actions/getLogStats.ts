"use server";

import { prisma, LynxLogType } from "@runa/database";

export interface LogStats {
  total: number;
  byType: Record<LynxLogType, number>;
}

export async function getLogStats(
  context?: string,
  type?: LynxLogType,
): Promise<LogStats> {
  try {
    const where = {
      context: context ? { contains: context } : undefined,
      type: type ? { equals: type } : undefined,
    };

    // Run count queries in parallel
    const [total, groupByType] = await Promise.all([
      prisma.lynxLogs.count({ where }),
      prisma.lynxLogs.groupBy({
        by: ["type"],
        _count: {
          type: true,
        },
        where,
      }),
    ]);

    const byType: Record<string, number> = {};

    // Initialize all types to 0
    Object.values(LynxLogType).forEach((type) => {
      byType[type] = 0;
    });

    // Fill in actual counts
    groupByType.forEach((group) => {
      byType[group.type] = group._count.type;
    });

    return {
      total,
      byType: byType as Record<LynxLogType, number>,
    };
  } catch (error) {
    console.error("Error fetching log stats:", error);
    return {
      total: 0,
      byType: {} as Record<LynxLogType, number>,
    };
  }
}
