import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../../../../packages/ui/src/index.css";

import { SidebarInset } from "@/components/sidebar";
import Providers from "./providers";
import LynxSideBar from "@/components/LynxSideBar";
import { lynxSidebarConfig } from "@/config/lynxSidebarConfig";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lynx",
  description: "Discord bot dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <Providers>
          <div className="flex h-screen w-full">
            <LynxSideBar navConfig={lynxSidebarConfig} />
            <SidebarInset className="bg-background pt-2 overflow-y-auto no-scrollbar flex flex-col h-full">
              {children}
            </SidebarInset>
          </div>
        </Providers>
      </body>
    </html>
  );
}
