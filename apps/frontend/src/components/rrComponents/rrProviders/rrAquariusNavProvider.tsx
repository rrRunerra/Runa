"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { getAquariusSidebarConfig } from "@/config/sidebarConfigs/aquariusSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrAquariusNavProviderProps {
  children: React.ReactNode;
}

export default function RrAquariusNavProvider({
  children,
}: RrAquariusNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getAquariusSidebarConfig(t);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions, t]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
