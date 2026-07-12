import { Metadata } from "next";
import DiscoverClientPage from "./DiscoverClient";

interface PageProps {
  params: Promise<{ type: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { type } = await params;
  const formattedType = type.charAt(0).toUpperCase() + type.slice(1);

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/discover/${type}?limit=1`,
    );
    if (res.ok) {
      const data = await res.json();
      const totalCount = data.metadata.totalCount;
      return {
        title: `Aquila > Discover ${formattedType} (${totalCount.toLocaleString()} items)`,
        description: `Browse and search all available ${formattedType}.`,
      };
    }
  } catch (e) {
    console.error("Failed to generate SSR metadata:", e);
  }

  return {
    title: `Aquila > Discover ${formattedType}`,
    description: `Browse and search all available ${formattedType}.`,
  };
}

export default async function Page({
  params,
}: PageProps): Promise<React.JSX.Element> {
  const { type } = await params;
  return <DiscoverClientPage type={type} />;
}
