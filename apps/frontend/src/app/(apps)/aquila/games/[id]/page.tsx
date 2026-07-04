import { Metadata } from "next";
import GameDetailsPage from "./GameDetailsClient";
import { getMediaDetails, cleanDescription } from "@/lib/metadata";

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

  const title = game.titleString ?? "Game Details";
  const description = cleanDescription(game.description, 160);
  const image =
    typeof game.coverImage === "string" ? game.coverImage : "";
  const bannerImage =
    typeof game.backgroundImage === "string" ? game.backgroundImage : image;
  const keywords: string[] = Array.isArray(game.genres) ? game.genres : [];

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

export default async function Page({ params }: PageProps) {
  return <GameDetailsPage />;
}
