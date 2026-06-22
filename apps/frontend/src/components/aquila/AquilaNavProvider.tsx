"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getAquilaSidebarConfig } from "../../../config/aquilaSidebarConfig";
import RrSidebar from "../rrComponents/rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface AquilaNavProviderProps {
  children: React.ReactNode;
}

/**
 * Aquila-specific wrapper around AppSideBar.
 * Fetches the user's connections and builds the nav config,
 * then passes everything into the generic sidebar.
 */
export default function AquilaNavProvider({
  children,
}: AquilaNavProviderProps) {
  const { data: session } = useSession();
  const [connections, setConnections] = useState<any[]>([]);

  useEffect(() => {
    if (session?.accessToken) {
      fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/connections?capabilities=ANIME,MANGA,MOVIES,TV_SHOWS`,
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        },
      )
        .then((res) => res.json())
        .then((data) => setConnections(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Failed to fetch connections", err));
    }
  }, [session?.accessToken]);

  const sideBarConfig = useMemo(() => {
    const rawConfig = getAquilaSidebarConfig(session, connections);
    return filterSidebarConfig(rawConfig, session?.user?.permissions);
  }, [session, connections]);

  return (
    <>
      <RrSidebar sidebarConfig={sideBarConfig} />
      {children}
    </>
  );
}
