"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as SidebarNavigationProvider } from "@/components/Providers/rrSidebarProvider";
import { ThemeProvider } from "next-themes";
import RrSpotlightSearch from "@/components/rrComponents/rrSpotlightSearch";

import { rrE2eeProvider as RrE2eeProvider } from "@/components/Providers/rrE2eeProvider";
import { RrThemeProvider } from "@/components/Providers/rrThemeProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RrE2eeProvider>
        <RrThemeProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            themes={["light", "dark"]}
          >
            <SidebarProvider>
              <TooltipProvider>
                <SidebarNavigationProvider>
                  {children}
                  <RrSpotlightSearch />
                </SidebarNavigationProvider>
              </TooltipProvider>
            </SidebarProvider>
          </ThemeProvider>
        </RrThemeProvider>
      </RrE2eeProvider>
    </SessionProvider>
  );
}
