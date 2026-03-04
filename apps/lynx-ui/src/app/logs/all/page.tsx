import { prisma } from "@runa/database";
import { LogTerminal } from "@/components/LogTerminal";

export default async function LogsPage() {
  const limit = 50;
  const initialLogs = await prisma.lynxLogs.findMany({
    orderBy: {
      id: "desc",
    },
    take: limit + 1,
  });

  let nextCursor: number | undefined = undefined;
  if (initialLogs.length > limit) {
    const nextItem = initialLogs.pop();
    nextCursor = nextItem?.id;
  }

  return (
    <div className="p-4 md:p-6 h-screen flex flex-col space-y-4 w-full">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
      </div>

      <LogTerminal initialLogs={initialLogs} initialCursor={nextCursor} />
    </div>
  );
}
