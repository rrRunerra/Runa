"use client";
import { SidebarProvider } from "@/components/sidebar";
import {
  AlertProvider,
  ConfirmProvider,
  NavigationProvider,
  TooltipProvider,
} from "@runa/ui";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <TooltipProvider>
          <AlertProvider>
            <ConfirmProvider>
              <NavigationProvider>{children}</NavigationProvider>
            </ConfirmProvider>
          </AlertProvider>
        </TooltipProvider>
      </SidebarProvider>
    </SessionProvider>
  );
}
