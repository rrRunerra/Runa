import React from "react";
import RrEmailFolderView from "@/components/rrComponents/pegasus/email/rrEmailFolderView";

interface PageProps {
  params: Promise<{
    folder: string;
  }>;
}

export default async function Page({ params }: PageProps): Promise<React.JSX.Element> {
  const { folder } = await params;
  return <RrEmailFolderView accountId="unified" folder={folder} />;
}
