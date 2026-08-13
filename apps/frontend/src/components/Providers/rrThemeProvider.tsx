"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { rrApps } from "@/config/rrApps";

type ThemeContextType = {
  baseTheme: string;
  setBaseTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  baseTheme: "runa",
  setBaseTheme: () => {},
});

export const useBaseTheme = () => useContext(ThemeContext);

export function RrThemeProvider({ children }: { children: React.ReactNode }) {
  const [baseTheme, setBaseThemeState] = useState<string>("runa");
  const pathname = usePathname();

  const applyTheme = (theme: string, currentPathname: string | null) => {
    let targetTheme = theme;
    if (theme === "runa") {
      const activeApp = rrApps.find((app) =>
        currentPathname?.startsWith(app.href)
      );
      targetTheme = activeApp ? activeApp.name.toLowerCase() : "polaris";
    }
    document.documentElement.setAttribute("data-theme", targetTheme);
  };

  useEffect(() => {
    // On mount, read from localStorage
    const saved = localStorage.getItem("runa-base-theme");
    const themeToUse = saved || "runa";
    setBaseThemeState(themeToUse);
    applyTheme(themeToUse, pathname);
  }, []);

  useEffect(() => {
    applyTheme(baseTheme, pathname);
  }, [baseTheme, pathname]);

  const setBaseTheme = (theme: string) => {
    setBaseThemeState(theme);
    localStorage.setItem("runa-base-theme", theme);
    applyTheme(theme, pathname);
  };

  return (
    <ThemeContext.Provider value={{ baseTheme, setBaseTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
