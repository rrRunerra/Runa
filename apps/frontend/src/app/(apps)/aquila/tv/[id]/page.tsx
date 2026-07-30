import { Metadata } from "next";
import TvDetailsPage from "./TvDetailsClient";
import { getMediaDetails, cleanDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tv = await getMediaDetails("tv", id);

  if (!tv) {
    return {
      title: "Aquila > TV Show Not Found",
      description: "This TV show details page could not be found.",
    };
  }

  const title =
    (tv as any).titlePrimary ??
    (tv as any).titleSecondary ??
    "TV Show Details";
  const description = cleanDescription((tv as any).description, 160);
  const image = (tv as any).coverImage ?? "";
  const keywords: string[] = Array.isArray((tv as any).genres)
    ? (tv as any).genres
    : [];

  return {
    title: `Aquila > TV > ${title}`,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, alt: title }] : [],
      type: "video.tv_show",
      siteName: "Aquila",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function Page({ params: _ }: PageProps) {
  return <TvDetailsPage />;
}
