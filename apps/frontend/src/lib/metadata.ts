import { Media } from "@/types/aquila";

export interface UserProfile {
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

/**
 * Strips HTML tags from a string and truncates it.
 */
export function cleanDescription(html: string | undefined, maxLength = 160): string {
  if (!html) return "";
  const stripped = html.replace(/<[^>]*>/g, "");
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).trim() + "...";
}

/**
 * Fetches details for any media type (anime, manga, tv, movies, books, games) from the API.
 */
export async function getMediaDetails(type: string, id: string): Promise<Media | null> {
  // Map page route name to API route name if they differ (e.g. movies -> movie, books -> book, games -> game)
  let apiType = type.toLowerCase();
  if (apiType === "movies") apiType = "movie";
  else if (apiType === "books") apiType = "book";
  else if (apiType === "games") apiType = "game";

  try {
    const res = await fetch(`${API_URL}/${apiType}/details/${id}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`Error fetching ${apiType} details for metadata:`, e);
    return null;
  }
}

/**
 * Fetches user profile data from the API.
 */
export async function getUserProfile(username: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`${API_URL}/user/${username}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Error fetching user profile for metadata:", e);
    return null;
  }
}
