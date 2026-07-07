import { Metadata } from "next";
import UserBooksPage from "./UserBooksClient";
import { getUserProfile } from "@/lib/metadata";
import { getServerSession } from "next-auth";
import { authOptions } from "@runa/auth";

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
  const { name } = await params;
  const session = await getServerSession(authOptions);

  const headers: HeadersInit = {};
  if (session?.accessToken) {
    headers["Authorization"] = `Bearer ${session.accessToken}`;
  }

  let initialData = null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/list/book/user/${name}?limit=30&offset=0&status=Reading&sort=last_updated`,
      { headers, next: { revalidate: 0 } }
    );
    if (res.ok) {
      initialData = await res.json();
    }
  } catch (e) {
    console.error("Failed to fetch initial Books list data on server", e);
  }

  return <UserBooksPage initialData={initialData} />;
}
