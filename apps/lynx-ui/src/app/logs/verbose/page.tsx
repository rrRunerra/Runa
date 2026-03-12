import { auth } from "@runa/auth";
import { LynxLogType, prisma } from "@runa/database";
import AccessDenied from "@/components/AccessDenied";
import { LogTerminal } from "@/components/LogTerminal";

export default async function VerboseLogsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return <AccessDenied />;
  }

  const limit = 50;
  const initialLogs = await prisma.lynxLogs.findMany({
    where: {
      type: LynxLogType.VERBOSE,
    },
    orderBy: {
      id: "desc",
    },
    take: limit + 1,
  });

  let nextCursor: number | undefined;
  if (initialLogs.length > limit) {
    const nextItem = initialLogs.pop();
    nextCursor = nextItem?.id;
  }

  return (
    <div className="p-4 md:p-6 h-screen flex flex-col space-y-4 w-full">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">Verbose Logs</h1>
      </div>

      <LogTerminal
        initialLogs={initialLogs}
        initialCursor={nextCursor}
        type={LynxLogType.VERBOSE}
      />
    </div>
  );
}
