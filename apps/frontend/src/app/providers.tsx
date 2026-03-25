"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NavigationProvider } from "@/components/Providers/NavigationProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <SidebarProvider>
        <TooltipProvider>
          <NavigationProvider>{children}</NavigationProvider>
        </TooltipProvider>
      </SidebarProvider>
    </SessionProvider>
  );
}
