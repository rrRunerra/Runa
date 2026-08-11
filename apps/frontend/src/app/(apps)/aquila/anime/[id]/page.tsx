import { Metadata } from "next";
import AnimeDetailsPage from "./AnimeDetailsClient";
import { getMediaDetails, formatMediaMetadataDescription } from "@/lib/metadata";
import { AnimeEntity } from "@/types/anime.entities";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const anime = (await getMediaDetails("anime", id)) as AnimeEntity | null;

  if (!anime) {
    return {
      title: "Aquila > Anime Not Found",
      description: "This anime details page could not be found.",
    };
  }

  const title =
    anime.titlePrimary ??
    anime.titleSecondary ??
    anime.titleNative ??
    "Anime Details";
  const description = formatMediaMetadataDescription(anime, "anime");
  const image =
    typeof anime.coverImage === "string"
      ? anime.coverImage
      : (anime.images?.anilist?.cover?.extraLarge ?? anime.images?.anilist?.cover?.large ?? "");
  const keywords: string[] = Array.isArray(anime.genres) ? anime.genres : [];

  return {
    title: `Aquila > Anime > ${title}`,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, alt: title }] : [],
      type: "video.other",
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

export default async function Page({ params }: PageProps) {
  return <AnimeDetailsPage />;
}
