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

  const title = tv.title.english || tv.title.romaji || "TV Show Details";
  const description = cleanDescription(tv.description, 160);
  const image = tv.coverImage.extraLarge || tv.coverImage.large;

  return {
    title: `Aquila > TV > ${title}`,
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
      type: "video.tv_show",
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
  return <TvDetailsPage />;
}
