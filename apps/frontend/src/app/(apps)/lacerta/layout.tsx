import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import RrLacertaNavProvider from "@/components/rrComponents/rrProviders/rrLacertaNavProvider";

export const metadata: Metadata = {
  title: "Lacerta",
  description: "Cloud storage",
};

export default function LacertaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrLacertaNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </RrLacertaNavProvider>
    </div>
  );
}
