"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { getAndromedaSidebarConfig } from "../../../../config/andromedaSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrAndromedaNavProviderProps {
  children: React.ReactNode;
}

export default function RrAndromedaNavProvider({
  children,
}: RrAndromedaNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getAndromedaSidebarConfig();
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
