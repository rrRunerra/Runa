"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
import { getLacertaSidebarConfig } from "@/config/sidebarConfigs/lacertaSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrLacertaNavProviderProps {
  children: React.ReactNode;
}

export default function RrLacertaNavProvider({
  children,
}: RrLacertaNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getLacertaSidebarConfig(t);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions, t]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
