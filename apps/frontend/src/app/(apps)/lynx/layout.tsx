import type { Metadata } from "next";
import "@/app/globals.css";

import RrLynxNavProvider from "@/components/rrComponents/rrProviders/rrLynxNavProvider";
import { SidebarInset } from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Lynx",
  description: "Discord bot dashboard",
};

export default function LynxLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrLynxNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-x-hidden overflow-y-auto no-scrollbar flex flex-col relative isolate before:absolute before:inset-0 before:bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.08),transparent_50%)] before:pointer-events-none before:z-0">
          <div className="relative z-10 flex flex-col flex-1">
            {children}
          </div>
        </SidebarInset>
      </RrLynxNavProvider>
    </div>
  );
}
