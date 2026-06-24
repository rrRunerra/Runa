"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type ThemeContextType = {
  baseTheme: string;
  setBaseTheme: (theme: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  baseTheme: "default",
  setBaseTheme: () => {},
});

export const useBaseTheme = () => useContext(ThemeContext);

export function RrThemeProvider({ children }: { children: React.ReactNode }) {
  const [baseTheme, setBaseThemeState] = useState<string>("default");

  useEffect(() => {
    // On mount, read from localStorage
    const saved = localStorage.getItem("runa-base-theme");
    if (saved) {
      setBaseThemeState(saved);
      if (saved !== "default") {
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    }
  }, []);

  const setBaseTheme = (theme: string) => {
    setBaseThemeState(theme);
    localStorage.setItem("runa-base-theme", theme);
    if (theme !== "default") {
      document.documentElement.setAttribute("data-theme", theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  };

  return (
    <ThemeContext.Provider value={{ baseTheme, setBaseTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
