import { Metadata } from "next";
import UserMoviesPage from "./UserMoviesClient";
import { getUserProfile } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const user = await getUserProfile(name);

  if (!user) {
    return {
      title: `Aquila > User > ${name} > Movies List`,
      description: `Check out ${name}'s movies list on Aquila.`,
    };
  }

  const displayName = user.displayName || user.username;
  const title = `${displayName}'s Movies List`;
  const description = `Check out ${displayName}'s tracked movies on Aquila.`;
  const image = user.avatarUrl;

  return {
    title: `Aquila > User > ${displayName} > Movies List`,
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
  return <UserMoviesPage />;
}
