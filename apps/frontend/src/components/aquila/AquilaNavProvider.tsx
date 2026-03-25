"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AppSideBar from "@/components/AppSideBar";
import { getAquilaSidebarConfig } from "../../../config/aquilaSidebarConfig";

interface AquilaNavProviderProps {
  children: React.ReactNode;
}

/**
 * Aquila-specific wrapper around AppSideBar.
 * Fetches the user's connections and builds the nav config,
 * then passes everything into the generic sidebar.
 */
export default function AquilaNavProvider({ children }: AquilaNavProviderProps) {
  const { data: session } = useSession();
  const [connections, setConnections] = useState<any[]>([]);

  useEffect(() => {
    fetch("/aquila/api/connections")
      .then((res) => res.json())
      .then((data) => setConnections(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Failed to fetch connections", err));
  }, []);

  const navConfig = useMemo(
    () => getAquilaSidebarConfig(session, connections),
    [session, connections],
  );

  return (
    <>
      <AppSideBar navConfig={navConfig} />
      {children}
    </>
  );
}
