import { Metadata } from "next";
import GameDetailsPage from "./GameDetailsClient";
import { getMediaDetails, cleanDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const game = await getMediaDetails("games", id);

  if (!game) {
    return {
      title: "Aquila > Game Not Found",
      description: "This game details page could not be found.",
    };
  }

  const title = game.title.english || game.title.romaji || "Game Details";
  const description = cleanDescription(game.description, 160);
  const image = game.coverImage.extraLarge || game.coverImage.large;

  return {
    title: `Aquila > Game > ${title}`,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: image,
          alt: title,
        },
      ],
      type: "website",
      siteName: "Aquila",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function Page({ params }: PageProps) {
  return <GameDetailsPage />;
}
