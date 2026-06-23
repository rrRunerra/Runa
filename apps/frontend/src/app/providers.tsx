"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as SidebarNavigationProvider } from "@/components/Providers/rrSidebarProvider";
import { ThemeProvider } from "next-themes";
import { THEMES } from "@/config/themes";
import SpotlightSearch from "@/components/SpotlightSearch";

import { rrE2eeProvider as RrE2eeProvider } from "@/components/Providers/rrE2eeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  const allThemes = [
    "light",
    "dark",
    "system",
    ...THEMES.flatMap((t) => [`${t.id}-light`, `${t.id}-dark`]),
  ];

  return (
    <SessionProvider>
      <RrE2eeProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" themes={allThemes}>
          <SidebarProvider>
            <TooltipProvider>
              <SidebarNavigationProvider>
                {children}
                <SpotlightSearch />
              </SidebarNavigationProvider>
            </TooltipProvider>
          </SidebarProvider>
        </ThemeProvider>
      </RrE2eeProvider>
    </SessionProvider>
  );
}
