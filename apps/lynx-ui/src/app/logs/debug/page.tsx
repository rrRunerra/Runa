import { prisma, LynxLogType } from "@astral/database";
import { LogTerminal } from "../../../components/logs/LogTerminal";

export default async function DebugLogsPage() {
  const limit = 50;
  const initialLogs = await prisma.lynxLogs.findMany({
    where: {
      type: LynxLogType.DEBUG,
    },
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
        <h1 className="text-2xl font-bold tracking-tight">Debug Logs</h1>
      </div>

      <LogTerminal
        initialLogs={initialLogs}
        initialCursor={nextCursor}
        type={LynxLogType.DEBUG}
      />
    </div>
  );
}
