"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavigationProvider } from "@/components/Providers/NavigationProvider";
import { SidebarProvider as SidebarNavigationProvider } from "@/components/Providers/rrSidebarProvider";
import { ThemeProvider } from "next-themes";
import { THEMES } from "@/config/themes";
import SpotlightSearch from "@/components/SpotlightSearch";

export default function Providers({ children }: { children: React.ReactNode }) {
  const allThemes = [
    "light",
    "dark",
    "system",
    ...THEMES.flatMap((t) => [`${t.id}-light`, `${t.id}-dark`]),
  ];

  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" themes={allThemes}>
        <SidebarProvider>
          <TooltipProvider>
            <NavigationProvider>
              <SidebarNavigationProvider>
                {children}
                <SpotlightSearch />
              </SidebarNavigationProvider>
            </NavigationProvider>
          </TooltipProvider>
        </SidebarProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
