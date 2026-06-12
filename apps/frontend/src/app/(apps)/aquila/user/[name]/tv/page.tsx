import { Metadata } from "next";
import UserTvShowsPage from "./UserTvClient";
import { getUserProfile } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const user = await getUserProfile(name);

  if (!user) {
    return {
      title: `Aquila > User > ${name} > TV List`,
      description: `Check out ${name}'s TV list on Aquila.`,
    };
  }

  const displayName = user.displayName || user.username;
  const title = `${displayName}'s TV List`;
  const description = `Check out ${displayName}'s tracked TV shows on Aquila.`;
  const image = user.avatarUrl;

  return {
    title: `Aquila > User > ${displayName} > TV List`,
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
  return <UserTvShowsPage />;
}
