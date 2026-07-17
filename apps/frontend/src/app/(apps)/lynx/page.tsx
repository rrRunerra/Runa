import { auth } from "@runa/auth";
import { prisma } from "@runa/database";
import LynxDashboardClient, { StatsPayload } from "@/components/lynx/LynxDashboardClient";

async function getStats(): Promise<StatsPayload | null> {
  const backendUrl = `${process.env.LYNX_API_URL}/stats`;
  try {
    const res = await fetch(backendUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    console.error("Failed to fetch bot stats:", error);
    return null;
  }
}

export default async function LynxHome(): Promise<React.JSX.Element> {
  const session = await auth();

  // Fetch metrics and recent logs in parallel
  const [stats, initialLogs] = await Promise.all([
    getStats(),
    prisma.lynxLogs.findMany({
      orderBy: {
        id: "desc",
      },
      take: 6,
    }).catch(() => []),
  ]);

  // Convert Date objects to strings for serialization
  const serializedLogs = initialLogs.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
  }));

  return (
    <LynxDashboardClient
      initialStats={stats}
      initialLogs={serializedLogs}
      session={session}
    />
  );
}

