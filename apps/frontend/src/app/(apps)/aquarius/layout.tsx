import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import RrAquariusNavProvider from "@/components/rrComponents/rrProviders/rrAquariusNavProvider";

export const metadata: Metadata = {
  title: "Aquarius",
  description: "Social features",
};

export default function AquariusLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrAquariusNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </RrAquariusNavProvider>
    </div>
  );
}
