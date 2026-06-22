"use client";

import { useEffect, useMemo, useState } from "react";
import AppSideBar from "@/components/AppSideBar";
import { getLynxSidebarConfig } from "../../../config/lynxSidebarConfig";
import { useSession } from "next-auth/react";
import { filterSidebarConfig } from "@/lib/navigation";
import RrSidebar from "../rrComponents/rrSidebar";

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

interface LynxNavProviderProps {
  children: React.ReactNode;
}

/**
 * Lynx-specific wrapper around AppSideBar.
 * Fetches commands/events/crons/apis/databases from the Lynx bot API
 * and builds the nav config, then passes it into the generic sidebar.
 */
export default function LynxNavProvider({ children }: LynxNavProviderProps) {
  const { data: session } = useSession();
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
    const rawConfig = getLynxSidebarConfig(data);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [data, session?.user?.permissions]);

  return (
    <>
      <RrSidebar sidebarConfig={sidebarConfig} />
      {children}
    </>
  );
}
