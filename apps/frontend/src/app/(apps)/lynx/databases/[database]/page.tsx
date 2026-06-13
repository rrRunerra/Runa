import { auth } from "@runa/auth";
import { hasPermission, BitField, LynxFlags } from "@runa/permissions";
import AccessDenied from "@/components/lynx/AccessDenied";
import { PageHeader } from "@/components/lynx/LynxPageHeader";
import DatabaseTable from "@/components/lynx/DatabaseTable";

export default async function DatabasePage({
  params,
}: {
  params: Promise<{ database: string }>;
}) {
  const { database } = await params;

  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, LynxFlags.MANAGE_DATABASE)) {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <PageHeader
        title={database}
        description={`Manage records, fields, and indexes for: ${database}`}
        backHref="/lynx/databases"
        backLabel="Back to Databases"
      />

      <DatabaseTable database={database} />
    </div>
  );
}
