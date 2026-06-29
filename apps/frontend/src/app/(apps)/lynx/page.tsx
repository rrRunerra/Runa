import { auth } from "@runa/auth";
import { hasPermission, BitField, LynxFlags, RunaFlags } from "@runa/permissions";
import { prisma } from "@runa/database";
import AccessDenied from "@/components/lynx/AccessDenied";
import LynxDashboardClient from "@/components/lynx/LynxDashboardClient";
import "dotenv/config";

async function getStats() {
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

export default async function LynxHome() {
  const session = await auth();
  // if (!session || !hasPermission(session.user.permissions, RunaFlags.LOGGED_IN)) {
  //   return <AccessDenied />;
  // }

  

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
      session={ session}
    />
  );
}
