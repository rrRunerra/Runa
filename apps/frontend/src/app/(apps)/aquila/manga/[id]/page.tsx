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

  const title =
    (manga as any).titlePrimary ??
    (manga as any).titleSecondary ??
    "Manga Details";
  const description = cleanDescription((manga as any).description, 160);
  const image = (manga as any).coverImage ?? "";

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

export default async function Page({ params: _ }: PageProps) {
  return <MangaDetailsPage />;
}
