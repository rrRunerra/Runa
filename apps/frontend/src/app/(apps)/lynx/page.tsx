import { auth } from "@runa/auth";
import { prisma } from "@runa/database";
import AccessDenied from "@/components/lynx/AccessDenied";
import LynxDashboardClient from "@/components/lynx/LynxDashboardClient";
import "dotenv/config";

async function getStats() {
  const port = process.env.LYNX_PORT || 4444;
  const backendUrl = `http://localhost:${port}/stats`;
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

export default async function LynxHome() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

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
    />
  );
}
