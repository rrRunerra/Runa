import type { Metadata } from "next";
import "@/app/globals.css";

import LynxNavProvider from "@/components/lynx/LynxNavProvider";
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
    <div className="flex h-screen w-full">
      <LynxNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col h-full">
          {children}
        </SidebarInset>
      </LynxNavProvider>
    </div>
  );
}
