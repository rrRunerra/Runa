"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { getMonocerosSidebarConfig } from "@/config/sidebarConfigs/monocerosSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrMonocerosNavProviderProps {
  children: React.ReactNode;
}

export default function RrMonocerosNavProvider({
  children,
}: RrMonocerosNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getMonocerosSidebarConfig(t);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions, t]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
