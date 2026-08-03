import React from "react";
import RrEmailFolderView from "@/components/rrComponents/pegasus/email/rrEmailFolderView";

interface PageProps {
  params: Promise<{
    id: string;
    folder: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id, folder } = await params;
  return <RrEmailFolderView accountId={id} folder={folder} />;
}
