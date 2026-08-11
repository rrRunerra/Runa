import { Metadata } from "next";
import UserMangaPage from "./UserMangaClient";
import { getUserProfile, getUserListCounts, formatUserListDescription } from "@/lib/metadata";
import { getServerSession } from "next-auth";
import { authOptions } from "@runa/auth";

interface PageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { name } = await params;
  const [user, counts] = await Promise.all([
    getUserProfile(name),
    getUserListCounts("manga", name),
  ]);

  if (!user) {
    return {
      title: `Aquila > User > ${name} > Manga List`,
      description: `Check out ${name}'s manga list on Aquila.`,
    };
  }

  const displayName = user.displayName || user.username;
  const title = `${displayName}'s Manga List`;
  const description = formatUserListDescription("manga", counts, displayName);
  const image = user.avatarUrl;

  return {
    title: `Aquila > User > ${displayName} > Manga List`,
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
  const { name } = await params;
  const session = await getServerSession(authOptions);

  const headers: HeadersInit = {};
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }

  let initialData = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list/manga/user/${name}?limit=30&status=All&sort=last_updated`,
      { headers, next: { revalidate: 0 } }
    );
    if (res.ok) {
      initialData = await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch initial Manga list data on server", e);
  }

  return <UserMangaPage initialData={initialData} />;
}
