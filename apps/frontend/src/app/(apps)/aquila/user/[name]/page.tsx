import { Metadata } from "next";
import UserPage from "./UserPageClient";
import { getUserProfile } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const user = await getUserProfile(name);

  if (!user) {
    return {
      title: `Aquila > User > ${name}`,
      description: `Check out ${name}'s profile on Aquila.`,
    };
  }

  const displayName = user.displayName || user.username;
  const title = displayName;
  const description = `Check out ${displayName}'s profile on Aquila.`;
  const image = user.avatarUrl;

  return {
    title: `Aquila > User > ${displayName}`,
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
      type: "profile",
      username: user.username,
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
  return <UserPage />;
}
