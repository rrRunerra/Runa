import { Metadata } from "next";
import UserAnimePage from "./UserAnimeClient";
import { getUserProfile } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const user = await getUserProfile(name);

  if (!user) {
    return {
      title: `Aquila > User > ${name} > Anime List`,
      description: `Check out ${name}'s anime list on Aquila.`,
    };
  }

  const displayName = user.displayName || user.username;
  const title = `${displayName}'s Anime List`;
  const description = `Check out ${displayName}'s tracked anime on Aquila.`;
  const image = user.avatarUrl;

  return {
    title: `Aquila > User > ${displayName} > Anime List`,
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
  return <UserAnimePage />;
}
