import { Metadata } from "next";
import UserBooksPage from "./UserBooksClient";
import { getUserProfile } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const user = await getUserProfile(name);

  if (!user) {
    return {
      title: `Aquila > User > ${name} > Books List`,
      description: `Check out ${name}'s books list on Aquila.`,
    };
  }

  const displayName = user.displayName || user.username;
  const title = `${displayName}'s Books List`;
  const description = `Check out ${displayName}'s tracked books on Aquila.`;
  const image = user.avatarUrl;

  return {
    title: `Aquila > User > ${displayName} > Books List`,
    description,
    openGraph: {
      title,
      description,
      images: image
        ? [
            {
              url: image,
              alt: displayName,
            },
          ]
        : [],
      type: "website",
      siteName: "Aquila",
    },
    twitter: {
      card: "summary",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function Page({ params }: PageProps) {
  return <UserBooksPage />;
}
