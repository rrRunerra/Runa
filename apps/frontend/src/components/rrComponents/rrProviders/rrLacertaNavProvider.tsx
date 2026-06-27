"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { getLacertaSidebarConfig } from "../../../../config/lacertaSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrLacertaNavProviderProps {
  children: React.ReactNode;
}

export default function RrLacertaNavProvider({
  children,
}: RrLacertaNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getLacertaSidebarConfig();
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
