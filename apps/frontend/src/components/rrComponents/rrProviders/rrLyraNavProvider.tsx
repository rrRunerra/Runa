"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { getLyraSidebarConfig } from "@/config/sidebarConfigs/lyraSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrLyraNavProviderProps {
  children: React.ReactNode;
}

export default function RrLyraNavProvider({
  children,
}: RrLyraNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getLyraSidebarConfig(t);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions, t]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
