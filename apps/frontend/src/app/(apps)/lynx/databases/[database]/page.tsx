import { auth } from "@runa/auth";
import { hasPermission, LynxFlags } from "@runa/permissions";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import DatabaseTable from "@/components/lynx/DatabaseTable";
import { getServerTranslation } from "@/lib/serverTranslation";

export default async function DatabasePage({
  params,
}: {
  params: Promise<{ database: string }>;
}): Promise<React.JSX.Element> {
  const { database } = await params;

  const session = await auth();
  if (!session?.user || !hasPermission(session.user?.permissions, LynxFlags.MANAGE_DATABASE)) {
    return <AccessDenied />;
  }

  const { t } = await getServerTranslation();

  return (
    <div className="container mx-auto p-6 md:p-8 flex flex-col gap-6 md:gap-8 select-none">
      <PageHeader
        title={database}
        description={t("manageRecords", { database })}
        backHref="/lynx/databases"
        backLabel={t("backToDatabases")}
      />

      <DatabaseTable database={database} />
    </div>
  );
}

