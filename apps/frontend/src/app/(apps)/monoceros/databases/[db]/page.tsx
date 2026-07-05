import { auth } from "@runa/auth";
import { redirect } from "next/navigation";
import { hasPermission, RunaFlags } from "@runa/permissions";
import MonocerosDatabaseTable from "./components/MonocerosDatabaseTable";

export default async function MonocerosDbDetailPage({
  params,
}: {
  params: Promise<{ db: string }>;
}) {
  const { db } = await params;

  const session = await auth();
  if (!session || !hasPermission(session.user.permissions, RunaFlags.ADMINISTRATOR)) {
    redirect("/monoceros/unauthorized");
  }

  return (
    <div className="container mx-auto p-6 md:p-8 space-y-6 md:space-y-8 select-none">
      <MonocerosDatabaseTable db={db} />
    </div>
  );
}
