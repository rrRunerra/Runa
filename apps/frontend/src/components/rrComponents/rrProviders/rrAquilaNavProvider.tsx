"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { getAquilaSidebarConfig } from "../../../../config/aquilaSidebarConfig";
import RrSidebar from "../rrSidebar";
import { filterSidebarConfig } from "@/lib/navigation";

interface RrAquilaNavProviderProps {
  children: React.ReactNode;
}

export default function RrAquilaNavProvider({
  children,
}: RrAquilaNavProviderProps): React.JSX.Element {
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
