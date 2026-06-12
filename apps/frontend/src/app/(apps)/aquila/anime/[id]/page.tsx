import { Metadata } from "next";
import AnimeDetailsPage from "./AnimeDetailsClient";
import { getMediaDetails, cleanDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const anime = await getMediaDetails("anime", id);

  if (!anime) {
    return {
      title: "Aquila > Anime Not Found",
      description: "This anime details page could not be found.",
    };
  }

  const title = anime.title.english || anime.title.romaji || "Anime Details";
  const description = cleanDescription(anime.description, 160);
  const image = anime.coverImage.extraLarge || anime.coverImage.large;

  return {
    title: `Aquila > Anime > ${title}`,
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
      type: "video.other",
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
  // We resolve params on the server side in Next 15+, and then we render the client-side component.
  // The client-side component can read params using useParams() from next/navigation,
  // or we can pass it down if needed. Since the original component uses useParams(),
  // it will continue to work perfectly out-of-the-box.
  return <AnimeDetailsPage />;
}
