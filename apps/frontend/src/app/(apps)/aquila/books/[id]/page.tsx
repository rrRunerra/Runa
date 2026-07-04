import { Metadata } from "next";
import BookDetailsPage from "./BookDetailsClient";
import { getMediaDetails, cleanDescription } from "@/lib/metadata";

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

  const title = book.titleString ?? "Book Details";
  const description = cleanDescription(book.description, 160);
  const image = typeof book.coverImage === "string" ? book.coverImage : "";

  return {
    title: `Aquila > Book > ${title}`,
    description,
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

export default async function Page({ params }: PageProps) {
  return <BookDetailsPage />;
}
