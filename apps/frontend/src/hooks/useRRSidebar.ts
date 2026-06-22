"use client";
import { SidebarNavigationContext } from "@/components/Providers/rrSidebarProvider";
import { SidebarConfig } from "@/types/SidebarConfig";
import { useContext, useEffect } from "react";

export function useRRSidebar(config: SidebarConfig) {
  const context = useContext(SidebarNavigationContext);

  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  useEffect(() => {
    if (config) {
      context.setSidebarConfig(config);
    }
  }, [config, context]);

  return context;
}
