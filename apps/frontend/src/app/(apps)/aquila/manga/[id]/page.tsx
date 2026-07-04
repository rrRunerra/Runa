import { Metadata } from "next";
import MangaDetailsPage from "./MangaDetailsClient";
import { getMediaDetails, cleanDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const manga = await getMediaDetails("manga", id);

  if (!manga) {
    return {
      title: "Aquila > Manga Not Found",
      description: "This manga details page could not be found.",
    };
  }

  const title = manga.titleEnglish ?? manga.titleRomaji ?? manga.titleString ?? manga.title?.english ?? manga.title?.romaji ?? "Manga Details";
  const description = cleanDescription(manga.description, 160);
  const image = typeof manga.coverImage === "string" ? manga.coverImage : (manga.coverImageLarge ?? manga.coverImage?.extraLarge ?? manga.coverImage?.large ?? "");

  return {
    title: `Aquila > Manga > ${title}`,
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
      type: "book",
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
  return <MangaDetailsPage />;
}
