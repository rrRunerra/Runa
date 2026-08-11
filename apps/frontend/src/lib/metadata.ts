import { Media } from "@/types/aquila";

export interface UserProfile {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  profileSettings?: {
    bio?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/**
 * Strips HTML tags from a string and truncates it.
 */
export function cleanDescription(html: string | undefined | null, maxLength = 240): string {
  if (!html) return "";

  let result = "";
  let inTag = false;
  let quoteChar: string | null = null;

  for (let i = 0; i < html.length; i++) {
    const char = html[i];

    if (inTag) {
      if (quoteChar) {
        if (char === quoteChar) {
          quoteChar = null;
        }
      } else if (char === '"' || char === "'") {
        quoteChar = char;
      } else if (char === '>') {
        inTag = false;
      }
    } else {
      if (char === '<') {
        inTag = true;
      } else {
        result += char;
      }
    }
  }

  // Clean up any double spaces, trim, and truncate
  const stripped = result.replace(/\s+/g, " ").trim();
  if (stripped.length <= maxLength) return stripped;
  return stripped.slice(0, maxLength).trim() + "...";
}

/**
 * Formats a raw media status string into a clean, human-readable label.
 */
export function formatMediaStatus(status: string | undefined | null, mediaType?: string): string | null {
  if (!status || status === "UNKNOWN") return null;
  const s = status.toUpperCase().replace(/\s+/g, "_");

  switch (s) {
    case "FINISHED":
      return mediaType === "anime" ? "Finished Airing" : "Finished";
    case "RELEASING":
      return mediaType === "manga" ? "Publishing" : "Releasing";
    case "NOT_YET_RELEASED":
    case "NOT_YET_AIRED":
      return "Not Yet Released";
    case "CANCELLED":
      return "Cancelled";
    case "HIATUS":
    case "ON_HIATUS":
      return "On Hiatus";
    case "ENDED":
      return "Ended";
    case "RETURNING_SERIES":
    case "CONTINUING":
      return "Continuing";
    case "IN_PRODUCTION":
      return "In Production";
    case "POST_PRODUCTION":
      return "Post Production";
    case "RELEASED":
      return "Released";
    case "PLANNED":
      return "Planned";
    case "PUBLISHED":
      return "Published";
    case "EARLY_ACCESS":
      return "Early Access";
    case "UPCOMING":
      return "Upcoming";
    default:
      // Convert SNAKE_CASE or camelCase to Title Case
      return status
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

/**
 * Formats rich media server metadata description including:
 * averageScore, episode count, seasons, status, and cleaned description.
 */
export function formatMediaMetadataDescription(media: any, type: string): string {
  if (!media) return "";
  const mediaType = type.toLowerCase();

  // 1. Average Score
  let scoreFormatted: string | null = null;
  const rawScore =
    media.averageScore ??
    media.alAverageScore ??
    media.imdbRating ??
    media.metacriticScore ??
    media.rawgRating ??
    media.googleBooksRating;

  if (typeof rawScore === "number" && rawScore > 0) {
    if (media.averageScore !== undefined && media.averageScore !== null) {
      if (media.averageScore > 10) {
        scoreFormatted = `${Math.round(media.averageScore)}%`;
      } else {
        scoreFormatted = `${Number(media.averageScore).toFixed(1)}/10`;
      }
    } else if (media.alAverageScore) {
      scoreFormatted = `${Math.round(media.alAverageScore)}%`;
    } else if (media.imdbRating) {
      scoreFormatted = `${Number(media.imdbRating).toFixed(1)}/10`;
    } else if (media.metacriticScore) {
      scoreFormatted = `${Math.round(media.metacriticScore)}/100`;
    } else if (media.rawgRating) {
      scoreFormatted = `${Number(media.rawgRating).toFixed(1)}/5`;
    } else if (media.googleBooksRating) {
      scoreFormatted = `${Number(media.googleBooksRating).toFixed(1)}/5`;
    }
  }

  // 2. Episode / Chapter / Page / Runtime Count
  let countFormatted: string | null = null;
  const epCount = media.episodeCount ?? media.episodes;
  if (typeof epCount === "number" && epCount > 0) {
    countFormatted = `${epCount} ${epCount === 1 ? "Episode" : "Episodes"}`;
  } else if (mediaType === "manga") {
    const chapters = media.chapterCount ?? media.chapters;
    const volumes = media.volumeCount ?? media.volumes;
    const parts = [];
    if (typeof chapters === "number" && chapters > 0) parts.push(`${chapters} Chapters`);
    if (typeof volumes === "number" && volumes > 0) parts.push(`${volumes} Volumes`);
    if (parts.length > 0) countFormatted = parts.join(" • ");
  } else if (mediaType === "books" || mediaType === "book") {
    const pages = media.pageCount ?? media.pages;
    if (typeof pages === "number" && pages > 0) {
      countFormatted = `${pages} Pages`;
    }
  } else if (mediaType === "movies" || mediaType === "movie") {
    const runtime = media.runtime ?? media.averageRuntime;
    if (typeof runtime === "number" && runtime > 0) {
      countFormatted = `${runtime} min`;
    }
  }

  // 3. Seasons
  let seasonsFormatted: string | null = null;
  const seasonCount = media.seasonCount ?? (Array.isArray(media.seasons) ? media.seasons.length : null);
  if (typeof seasonCount === "number" && seasonCount > 0) {
    seasonsFormatted = `${seasonCount} ${seasonCount === 1 ? "Season" : "Seasons"}`;
  } else if (media.seasonSeason && media.seasonSeason !== "UNKNOWN") {
    const seasonStr =
      String(media.seasonSeason).charAt(0).toUpperCase() +
      String(media.seasonSeason).slice(1).toLowerCase();
    seasonsFormatted = media.seasonYear ? `${seasonStr} ${media.seasonYear}` : seasonStr;
  }

  // 4. Status
  const statusFormatted = formatMediaStatus(media.status, mediaType);

  // Combine top stats line
  const metaParts: string[] = [];
  if (scoreFormatted) metaParts.push(`⭐ ${scoreFormatted}`);
  if (countFormatted) metaParts.push(countFormatted);
  if (seasonsFormatted) metaParts.push(seasonsFormatted);
  if (statusFormatted) metaParts.push(statusFormatted);

  const headerLine = metaParts.join(" • ");
  const rawDesc = media.description ?? media.tagline ?? media.overview ?? "";
  const cleanDesc = cleanDescription(rawDesc, 240);

  if (headerLine && cleanDesc) {
    return `${headerLine}\n\n${cleanDesc}`;
  }
  if (headerLine) return headerLine;
  return cleanDesc || "Check out details on Aquila.";
}

/**
 * Formats user list metadata description displaying count for all statuses.
 */
export function formatUserListDescription(
  type: string,
  counts: Record<string, number> | null,
  displayName: string,
): string {
  if (!counts) {
    return `Check out ${displayName}'s tracked ${type} on Aquila.`;
  }

  const mediaType = type.toLowerCase();
  const total = counts.all ?? 0;
  const onHold = counts.on_hold ?? counts.onHold ?? 0;
  const dropped = counts.dropped ?? 0;
  const completed = counts.completed ?? 0;

  let inProgressLabel = "Watching";
  let inProgressCount = counts.watching ?? 0;
  let planLabel = "Plan to Watch";
  let planCount = counts.planning ?? counts.plan_to_watch ?? 0;

  if (mediaType === "manga") {
    inProgressLabel = "Reading";
    inProgressCount = counts.reading ?? 0;
    planLabel = "Plan to Read";
    planCount = counts.planning ?? counts.plan_to_read ?? 0;
  } else if (mediaType === "games" || mediaType === "game") {
    inProgressLabel = "Playing";
    inProgressCount = counts.playing ?? 0;
    planLabel = "Plan to Play";
    planCount = counts.planning ?? counts.plan_to_play ?? 0;
  } else if (mediaType === "books" || mediaType === "book") {
    inProgressLabel = "Reading";
    inProgressCount = counts.reading ?? 0;
    planLabel = "Plan to Read";
    planCount = counts.planning ?? counts.plan_to_read ?? 0;
  } else if (mediaType === "movies" || mediaType === "movie") {
    inProgressLabel = "Watching";
    inProgressCount = counts.watching ?? 0;
    planLabel = "Plan to Watch";
    planCount = counts.planning ?? counts.plan_to_watch ?? 0;
  }

  return `Total: ${total} • ${inProgressLabel}: ${inProgressCount} • Completed: ${completed} • ${planLabel}: ${planCount} • On-Hold: ${onHold} • Dropped: ${dropped}`;
}

/**
 * Fetches lightweight user list status counts from the API.
 */
export async function getUserListCounts(
  type: string,
  username: string,
): Promise<Record<string, number> | null> {
  let apiType = type.toLowerCase();
  if (apiType === "movies") apiType = "movie";
  else if (apiType === "books") apiType = "book";
  else if (apiType === "games") apiType = "game";

  try {
    const res = await fetch(`${API_URL}/list/${apiType}/user/${username}/counts`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(`Error fetching user ${apiType} list counts for metadata:`, e);
    return null;
  }
}

/**
 * Fetches details for any media type (anime, manga, tv, movies, books, games) from the API.
 */
export async function getMediaDetails(type: string, id: string): Promise<Media | null> {
  let apiType = type.toLowerCase();
  if (apiType === "movies") apiType = "movie";
  else if (apiType === "books") apiType = "book";
  else if (apiType === "games") apiType = "game";

  try {
    const res = await fetch(`${API_URL}/${apiType}/${id}`, {
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
    const res = await fetch(`${API_URL}/users/${username}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error("Error fetching user profile for metadata:", e);
    return null;
  }
}
