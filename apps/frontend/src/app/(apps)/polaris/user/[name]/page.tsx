import { Metadata } from "next";
import UserPageClient from "./UserPageClient";
import { getUserProfile, cleanDescription } from "@/lib/metadata";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  
  // Fetch user profile info on the server
  const user = await getUserProfile(name);
  if (!user) {
    return {
      title: `Polaris > User > ${name}`,
      description: `Check out ${name}'s profile on Polaris.`,
    };
  }

  // Fetch lists details concurrently on the server to populate list metadata
  const categories = ["anime", "manga", "tv", "movie", "game", "book"];
  const listCounts = await Promise.all(
    categories.map(async (cat) => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL;
        const res = await fetch(`${API_URL}/list/${cat}/user/${name}?limit=1`, {
          next: { revalidate: 60 } // Cache list metrics for 60 seconds
        });
        if (res.ok) {
          const data = await res.json();
          return data.counts?.all || 0;
        }
      } catch (e) {
        // Skip on error
      }
      return 0;
    })
  );

  const totalTracked = listCounts.reduce((a, b) => a + b, 0);
  const displayName = user.displayName || user.username;
  const title = `Polaris > User > ${displayName}`;
  const bio = user.profileSettings?.bio;
  const cleanedBio = bio ? cleanDescription(bio) : "";
  const description = cleanedBio || `Check out ${displayName}'s profile on Polaris.`;
  const image = user.avatarUrl;

  return {
    title,
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
      siteName: "Polaris",
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
  return <UserPageClient />;
}
