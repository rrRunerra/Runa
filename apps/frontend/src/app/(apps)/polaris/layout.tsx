import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Polaris",
  description: "The only account you'll ever need.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
