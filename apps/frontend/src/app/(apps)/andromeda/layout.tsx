import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import RrAndromedaNavProvider from "@/components/rrComponents/rrProviders/rrAndromedaNavProvider";

export const metadata: Metadata = {
  title: "Andromeda",
  description: "Docs/Knowledge base",
};

export default function AndromedaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrAndromedaNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </RrAndromedaNavProvider>
    </div>
  );
}
