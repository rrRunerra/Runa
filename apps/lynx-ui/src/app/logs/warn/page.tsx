import { prisma, LynxLogType } from "@runa/database";
import { LogTerminal } from "@/components/LogTerminal";

export default async function WarnLogsPage() {
  const limit = 50;
  const initialLogs = await prisma.lynxLogs.findMany({
    where: {
      type: LynxLogType.WARN,
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
        <h1 className="text-2xl font-bold tracking-tight">Warning Logs</h1>
      </div>

      <LogTerminal
        initialLogs={initialLogs}
        initialCursor={nextCursor}
        type={LynxLogType.WARN}
      />
    </div>
  );
}
