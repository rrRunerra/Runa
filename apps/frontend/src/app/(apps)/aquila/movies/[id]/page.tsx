import { Metadata } from "next";
import MovieDetailsPage from "./MovieDetailsClient";
import { getMediaDetails, cleanDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const movie = await getMediaDetails("movies", id);

  if (!movie) {
    return {
      title: "Aquila > Movie Not Found",
      description: "This movie details page could not be found.",
    };
  }

  const title =
    (movie as any).titlePrimary ??
    (movie as any).titleSecondary ??
    "Movie Details";
  const description = cleanDescription((movie as any).description, 160);
  const image = (movie as any).coverImage ?? "";
  const keywords: string[] = Array.isArray((movie as any).genres)
    ? (movie as any).genres
    : [];

  return {
    title: `Aquila > Movie > ${title}`,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, alt: title }] : [],
      type: "video.movie",
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
  return <MovieDetailsPage />;
}
