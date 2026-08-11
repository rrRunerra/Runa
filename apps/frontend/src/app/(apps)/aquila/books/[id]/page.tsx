import { Metadata } from "next";
import BookDetailsPage from "./BookDetailsClient";
import { getMediaDetails, formatMediaMetadataDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const book = await getMediaDetails("books", id);

  if (!book) {
    return {
      title: "Aquila > Book Not Found",
      description: "This book details page could not be found.",
    };
  }

  const title =
    (book as any).titlePrimary ??
    (book as any).titleSecondary ??
    "Book Details";
  const description = formatMediaMetadataDescription(book, "book");
  const image = (book as any).coverImage ?? "";
  const keywords: string[] = Array.isArray((book as any).genres)
    ? (book as any).genres
    : [];

  return {
    title: `Aquila > Book > ${title}`,
    description,
    keywords,
    openGraph: {
      title,
      description,
      images: image ? [{ url: image, alt: title }] : [],
      type: "book",
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
  return <BookDetailsPage />;
}
