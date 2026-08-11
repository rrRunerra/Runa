import { Metadata } from "next";
import GameDetailsPage from "./GameDetailsClient";
import { getMediaDetails, formatMediaMetadataDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const game = await getMediaDetails("games", id);

  if (!game) {
    return {
      title: "Aquila > Game Not Found",
      description: "This game details page could not be found.",
    };
  }

  const title =
    (game as any).titlePrimary ??
    (game as any).titleSecondary ??
    "Game Details";
  const description = formatMediaMetadataDescription(game, "game");
  const image = (game as any).coverImage ?? "";
  const bannerImage =
    (game as any).bannerImage ?? (game as any).backgroundImage ?? image;
  const keywords: string[] = Array.isArray((game as any).genres)
    ? (game as any).genres
    : [];

  return {
    title: `Aquila > Game > ${title}`,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: bannerImage
        ? [{ url: bannerImage, alt: title }]
        : image
          ? [{ url: image, alt: title }]
          : [],
      type: "website",
      siteName: "Aquila",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: bannerImage ? [bannerImage] : image ? [image] : [],
    },
  };
}

export default async function Page({ params: _ }: PageProps) {
  return <GameDetailsPage />;
}
