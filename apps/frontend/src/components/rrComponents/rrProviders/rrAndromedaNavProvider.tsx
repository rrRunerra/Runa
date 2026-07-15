"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

  const sidebarConfig = useMemo(() => {
    const rawConfig = getAndromedaSidebarConfig(t);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session?.user?.permissions, t]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
