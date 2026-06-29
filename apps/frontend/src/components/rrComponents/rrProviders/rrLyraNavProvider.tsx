"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { getLyraSidebarConfig } from "../../../../config/lyraSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrLyraNavProviderProps {
  children: React.ReactNode;
}

export default function RrLyraNavProvider({
  children,
}: RrLyraNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getLyraSidebarConfig();
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
