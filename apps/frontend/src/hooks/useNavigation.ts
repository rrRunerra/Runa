"use client";
import { NavigationContext } from "@/components/Providers/NavigationProvider";
import { NavbarConfig } from "@/types/NavbarConfig";
import { useContext, useEffect } from "react";

export function useNavigation(config?: NavbarConfig) {
  const context = useContext(NavigationContext);

  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }

  useEffect(() => {
    if (config) {
      context.setNavbarConfig(config);
    }
  }, [config, context]);

  return context;
}
