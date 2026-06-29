"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { getMonocerosSidebarConfig } from "../../../../config/monocerosSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrMonocerosNavProviderProps {
  children: React.ReactNode;
}

export default function RrMonocerosNavProvider({
  children,
}: RrMonocerosNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getMonocerosSidebarConfig();
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
