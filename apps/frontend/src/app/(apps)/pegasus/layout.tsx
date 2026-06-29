import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import RrPegasusNavProvider from "@/components/rrComponents/rrProviders/rrPegasusNavProvider";

export const metadata: Metadata = {
  title: "Pegasus",
  description: "Mail Client",
};

export default function PegasusLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrPegasusNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </RrPegasusNavProvider>
    </div>
  );
}
