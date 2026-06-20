"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AppSideBar from "@/components/AppSideBar";
import { getPegasusSidebarConfig } from "../../../config/pegasusSidebarConfig";

interface PegasusNavProviderProps {
  children: React.ReactNode;
}

export default function PegasusNavProvider({
  children,
}: PegasusNavProviderProps): React.JSX.Element {
  const { data: session } = useSession();
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);

  const fetchEmailAccounts = (): void => {
    if (session?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/emails`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch email accounts");
          return res.json();
        })
        .then((data) => setEmailAccounts(Array.isArray(data) ? data : []))
        .catch((err) => console.error("Failed to fetch email accounts in sidebar", err));
    }
  };

  useEffect(() => {
    fetchEmailAccounts();

    const handleSidebarChanged = (): void => {
      fetchEmailAccounts();
    };

    window.addEventListener("runa-sidebar-changed", handleSidebarChanged);
    return () => {
      window.removeEventListener("runa-sidebar-changed", handleSidebarChanged);
    };
  }, [session?.accessToken]);

  const navConfig = useMemo(
    () => getPegasusSidebarConfig(session, emailAccounts),
    [session, emailAccounts]
  );

  return (
    <>
      <AppSideBar navConfig={navConfig} />
      {children}
    </>
  );
}
