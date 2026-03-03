import { DatabaseViewer } from "./DatabaseViewer";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default async function DatabasePage({
  params,
}: {
  params: Promise<{ database: string }>;
}) {
  const { database } = await params;

  return (
    <div className="container mx-auto p-8 space-y-8 relative">
      <div className="relative z-10 flex flex-col gap-4">
        <Link
          href="/lynx/databases"
          className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Databases
        </Link>
      </div>

      <div className="relative z-10">
        <DatabaseViewer modelName={database} />
      </div>
    </div>
  );
}
