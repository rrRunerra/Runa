"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as SidebarNavigationProvider } from "@/components/Providers/rrSidebarProvider";
import { ThemeProvider } from "next-themes";
import RrSpotlightSearch from "@/components/rrComponents/rrSpotlightSearch";
import { RrDecryptModal } from "@/components/rrComponents/rrDecryptModal";

import { RrCryptoProvider } from "@/components/Providers/rrCryptoProvider";
import { RrThemeProvider } from "@/components/Providers/rrThemeProvider";
import { RrSpotlightProvider } from "@/components/Providers/rrSpotlightProvider";
import { RrNotificationAndBookmarksProvider } from "@/components/Providers/rrNotificationAndBookmarksProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RrCryptoProvider>
        <RrNotificationAndBookmarksProvider>
          <RrSpotlightProvider>
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
                      <RrDecryptModal />
                    </SidebarNavigationProvider>
                  </TooltipProvider>
                </SidebarProvider>
              </ThemeProvider>
            </RrThemeProvider>
          </RrSpotlightProvider>
        </RrNotificationAndBookmarksProvider>
      </RrCryptoProvider>
    </SessionProvider>
  );
}
