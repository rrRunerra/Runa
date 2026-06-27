import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import RrAquilaNavProvider from "@/components/rrComponents/rrProviders/rrAquilaNavProvider";

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
      <RrAquilaNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </RrAquilaNavProvider>
    </div>
  );
}
