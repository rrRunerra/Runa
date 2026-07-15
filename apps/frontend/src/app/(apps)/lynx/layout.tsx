import type { Metadata } from "next";
import "@/app/globals.css";

import RrLynxNavProvider from "@/components/rrComponents/rrProviders/rrLynxNavProvider";
import { SidebarInset } from "@/components/ui/sidebar";
import { RrI18nProvider } from "@/components/Providers/rrI18nProvider";

export const metadata: Metadata = {
  title: "Lynx",
  description: "Discord bot dashboard",
};

export default function LynxLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrI18nProvider>
        <RrLynxNavProvider>
          <SidebarInset className="bg-background pt-2 overflow-x-hidden overflow-y-auto no-scrollbar flex flex-col relative isolate">
            <div className="relative z-10 flex flex-col flex-1">{children}</div>
          </SidebarInset>
        </RrLynxNavProvider>
      </RrI18nProvider>
    </div>
  );
}
