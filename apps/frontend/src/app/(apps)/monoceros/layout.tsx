import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import RrMonocerosNavProvider from "@/components/rrComponents/rrProviders/rrMonocerosNavProvider";

export const metadata: Metadata = {
  title: "Monoceros",
  description: "Admin panel for Runa",
};

export default function MonocerosLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrMonocerosNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </RrMonocerosNavProvider>
    </div>
  );
}
