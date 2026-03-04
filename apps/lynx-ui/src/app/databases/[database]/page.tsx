import { PageHeader } from "@/components/PageHeader";
import { DatabaseViewer } from "./DatabaseViewer";

export default async function DatabasePage({
  params,
}: {
  params: Promise<{ database: string }>;
}) {
  const { database } = await params;

  return (
    <div className="container mx-auto p-8 space-y-8">
      <PageHeader
        title={database}
        description={`Viewing data for model: ${database}`}
        backHref="/databases"
        backLabel="Back to Databases"
      />

      <div className="relative z-10">
        <DatabaseViewer modelName={database} />
      </div>
    </div>
  );
}
