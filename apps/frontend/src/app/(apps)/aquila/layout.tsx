import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import AquilaNavProvider from "@/components/aquila/AquilaNavProvider";

export const metadata: Metadata = {
  title: "Aquila",
  description: "Media Tracker",
};

export default function AquilaLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AquilaNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </AquilaNavProvider>
    </div>
  );
}
