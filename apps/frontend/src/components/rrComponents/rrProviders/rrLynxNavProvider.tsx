"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getLynxSidebarConfig } from "@/config/sidebarConfigs/lynxSidebarConfig";
import { useSession } from "next-auth/react";
import { filterSidebarConfig } from "@/lib/navigation";
import RrSidebar from "../rrSidebar";

async function safeFetch<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(url, {
      cache: "force-cache",
    });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}

interface RrLynxNavProviderProps {
  children: React.ReactNode;
}

export default function RrLynxNavProvider({ children }: RrLynxNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();
  const { t } = useTranslation();
  const [data, setData] = useState({
    commands: [] as { name: string }[],
    events: [] as { name: string }[],
    crons: [] as { name: string }[],
    apis: [] as { name: string }[],
    databases: [] as string[],
  });

  useEffect(() => {
    Promise.all([
      safeFetch<{ name: string }[]>(`/lynx/api/commands/list`, []),
      safeFetch<{ name: string }[]>(`/lynx/api/events/list`, []),
      safeFetch<{ name: string }[]>(`/lynx/api/crons/list`, []),
      safeFetch<{ name: string }[]>(`/lynx/api/apis/list`, []),
      safeFetch<string[]>(`/lynx/api/db/list`, []),
    ]).then(([commands, events, crons, apis, databases]) => {
      setData({ commands, events, crons, apis, databases });
    });
  }, []);

  const sidebarConfig = useMemo(() => {
    const rawConfig = getLynxSidebarConfig(data, t);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [data, t, session?.user?.permissions]);


  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
