"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as SidebarNavigationProvider } from "@/components/Providers/rrSidebarProvider";
import { ThemeProvider } from "next-themes";
import RrSpotlightSearch from "@/components/rrComponents/rrSpotlightSearch";
import { RrDecryptModal } from "@/components/rrComponents/rrDecryptModal";

import { RrCryptoProvider } from "@/components/Providers/rrCryptoProvider";
import { RrWebSocketProvider } from "@/components/Providers/rrWebSocketProvider";
import { RrThemeProvider } from "@/components/Providers/rrThemeProvider";
import { RrSpotlightProvider } from "@/components/Providers/rrSpotlightProvider";
import { RrNotificationAndBookmarksProvider } from "@/components/Providers/rrNotificationAndBookmarksProvider";
import { RrSessionWatcher } from "@/components/Providers/rrSessionWatcher";

// Silence false positive React 19 / next-themes script tag warning in development
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const origError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag")
    ) {
      return;
    }
    origError.apply(console, args);
  };
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <RrSessionWatcher />
      <RrCryptoProvider>
        <RrWebSocketProvider>
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
        </RrWebSocketProvider>
      </RrCryptoProvider>
    </SessionProvider>
  );
}
