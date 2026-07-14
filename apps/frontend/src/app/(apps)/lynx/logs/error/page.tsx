import { auth } from "@runa/auth";
import { hasPermission, LynxFlags } from "@runa/permissions";
import { LynxLogType, prisma } from "@runa/database";
import AccessDenied from "@/components/lynx/AccessDenied";
import { LogTerminal } from "@/components/lynx/LogTerminal";
import { getServerTranslation } from "@/lib/serverTranslation";

export default async function ErrorLogsPage(): Promise<React.JSX.Element> {
  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.VIEW_LOGS)) {
    return <AccessDenied />;
  }

  const limit = 50;
  const initialLogs = await prisma.lynxLogs.findMany({
    where: {
      type: LynxLogType.ERROR,
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

  const { t } = await getServerTranslation();

  return (
    <div className="p-4 md:p-6 h-screen flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold tracking-tight">{t("errorLogs")}</h1>
      </div>

      <LogTerminal
        initialLogs={initialLogs}
        initialCursor={nextCursor}
        type={LynxLogType.ERROR}
      />
    </div>
  );
}
