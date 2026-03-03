"use client";
import { NavigationContext } from "../context/NavigationContext";
import { NavbarConfig } from "../types/navbar";
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
