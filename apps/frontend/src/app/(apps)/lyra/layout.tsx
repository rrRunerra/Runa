import type { Metadata } from "next";
import "@/app/globals.css";

import { SidebarInset } from "@/components/ui/sidebar";
import RrLyraNavProvider from "@/components/rrComponents/rrProviders/rrLyraNavProvider";

export const metadata: Metadata = {
  title: "Lyra",
  description: "Music player",
};

export default function LyraLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <RrLyraNavProvider>
        <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col">
          {children}
        </SidebarInset>
      </RrLyraNavProvider>
    </div>
  );
}
