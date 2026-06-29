"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { getAquariusSidebarConfig } from "../../../../config/aquariusSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrAquariusNavProviderProps {
  children: React.ReactNode;
}

export default function RrAquariusNavProvider({
  children,
}: RrAquariusNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getAquariusSidebarConfig();
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
