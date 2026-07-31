import type { Metadata, Viewport } from "next";
import {
  Geist,
  Geist_Mono,
  Inter,
  Roboto,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { cn } from "@/lib/utils";
import Providers from "./providers";
import { Toaster } from "@/components/ui/sonner";
import { RrI18nServerProvider } from "@/components/Providers/rrI18nServerProvider";

const jetbrainsMonoHeading = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-heading",
});

const roboto = Roboto({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Runa",
  description: "Runa — your unified app center",
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "h-full",
        "antialiased",
        "font-sans",
        roboto.variable,
        jetbrainsMonoHeading.variable,
      )}
    >
      <body className="h-screen flex flex-col">
        <RrI18nServerProvider>
          <Providers>{children}</Providers>
        </RrI18nServerProvider>
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
