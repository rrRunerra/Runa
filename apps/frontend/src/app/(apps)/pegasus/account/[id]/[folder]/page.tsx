import React from "react";
import EmailFolderView from "@/components/pegasus/EmailFolderView";

interface PageProps {
  params: {
    id: string;
    folder: string;
  };
}

export default async function Page({ params }: PageProps) {
  const { id, folder } = await params;
  return <EmailFolderView accountId={id} folder={folder} />;
}
