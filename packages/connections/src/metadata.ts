export enum ConnectionCapability {
  ANIME = "ANIME",
  MANGA = "MANGA",
  MOVIES = "MOVIES",
  TV_SHOWS = "TV_SHOWS",
  GAME = "GAME",
  AUTH = "AUTH",
  SHOWCASE = "SHOWCASE",
  BOOKS = "BOOKS",
  CALENDAR = "CALENDAR",
}

export interface ConnectionSearchResult {
  id: string;
  title: string;
  image?: string;
  format?: string;
  episodes?: number;
  chapters?: number;
}

export interface ConnectionMetadata {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  accentColor: string;
  glowColor: string;
  capabilities: ConnectionCapability[];
  primaryApp: "aquila" | "lynx" | "polaris";
  search?(query: string, type: "ANIME" | "MANGA" | "MOVIES" | "TV_SHOWS"): Promise<ConnectionSearchResult[]>;
}

export const PROVIDERS_METADATA: ConnectionMetadata[] = [
  {
    id: "anilist",
    name: "AniList",
    description: "Sync your watch list progress automatically.",
    url: "https://anilist.co",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/AniList_logo.svg/960px-AniList_logo.svg.png",
    accentColor: "bg-[#3db4f2]/10 border-[#3db4f2]/20 text-[#3db4f2] hover:bg-[#3db4f2]/20",
    glowColor: "shadow-[#3db4f2]/10",
    capabilities: [ConnectionCapability.ANIME, ConnectionCapability.MANGA, ConnectionCapability.SHOWCASE],
    primaryApp: "aquila",
    async search(query: string, type: "ANIME" | "MANGA"): Promise<ConnectionSearchResult[]> {
      const graphqlQuery = `
        query ($search: String, $type: MediaType) {
          Page(page: 1, perPage: 10) {
            media(search: $search, type: $type) {
              id title { romaji english } coverImage { medium } format chapters episodes
            }
          }
        }
      `;
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: graphqlQuery,
          variables: { search: query, type },
        }),
      });
      const data = await res.json();
      return (data.data?.Page?.media || []).map((item: any) => ({
        id: item.id.toString(),
        title: item.title.english || item.title.romaji,
        image: item.coverImage.medium,
        format: item.format,
        episodes: item.episodes,
        chapters: item.chapters,
      }));
    },
  },
  {
    id: "mal",
    name: "MyAnimeList",
    description: "Keep your traditional anime lists synchronized.",
    url: "https://myanimelist.net",
    icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/MyAnimeList_favicon.svg/3840px-MyAnimeList_favicon.svg.png?utm_source=commons.wikimedia.org&utm_campaign=index&utm_content=thumbnail",
    accentColor: "bg-[#2e51a2]/10 border-[#2e51a2]/20 text-[#2e51a2] hover:bg-[#2e51a2]/20",
    glowColor: "shadow-[#2e51a2]/10",
    capabilities: [ConnectionCapability.ANIME, ConnectionCapability.MANGA, ConnectionCapability.SHOWCASE],
    primaryApp: "aquila",
    async search(query: string, type: "ANIME" | "MANGA"): Promise<ConnectionSearchResult[]> {
      const path = type.toLowerCase() === "manga" ? "manga" : "anime";
      const cleanQuery = (query || "").trim();

      if (!cleanQuery) return [];

      if (typeof window !== "undefined") {
        const res = await fetch(`/api/mal/search?q=${encodeURIComponent(cleanQuery)}&type=${path}`);
        if (!res.ok) {
          let details = res.statusText || `Status ${res.status}`;
          try {
            const errData = await res.json();
            if (errData && typeof errData === "object") {
              details = errData.error || errData.message || details;
            }
          } catch {}
          throw new Error(`MyAnimeList search failed: ${details}`);
        }
        return await res.json();
      }

      const clientId =
        typeof process !== "undefined"
          ? process.env.NEXT_PUBLIC_MAL_CLIENT_ID || process.env.MAL_CLIENT_ID || ""
          : "";

      if (!clientId) {
        throw new Error("MyAnimeList Client ID is not configured (NEXT_PUBLIC_MAL_CLIENT_ID / MAL_CLIENT_ID missing)");
      }

      const fields =
        path === "anime"
          ? "id,title,main_picture,alternative_titles,media_type,num_episodes"
          : "id,title,main_picture,alternative_titles,media_type,num_chapters,num_volumes";

      const formatNode = (item: any): ConnectionSearchResult => {
        const englishTitle = item.alternative_titles?.en?.trim();
        const mainTitle = item.title?.trim();
        return {
          id: item.id.toString(),
          title: englishTitle || mainTitle || "Untitled",
          image: item.main_picture?.medium || item.main_picture?.large,
          format: item.media_type ? item.media_type.toUpperCase() : undefined,
          episodes: item.num_episodes,
          chapters: item.num_chapters,
        };
      };

      const fetchOfficial = async (url: string) => {
        try {
          const res = await fetch(url, { headers: { "X-MAL-CLIENT-ID": clientId } });
          if (res.ok) {
            return await res.json();
          }
        } catch {}
        return null;
      };

      // 1. Direct ID / MAL URL
      const malUrlMatch = cleanQuery.match(/myanimelist\.net\/(anime|manga)\/(\d+)/i);
      const directId = malUrlMatch ? malUrlMatch[2] : /^\d+$/.test(cleanQuery) ? cleanQuery : null;

      if (directId) {
        const data = await fetchOfficial(`https://api.myanimelist.net/v2/${path}/${directId}?fields=${fields}`);
        if (data && data.id) {
          return [formatNode(data)];
        }
      }

      // 2. Strategy 1: Exact query (if length >= 3)
      if (cleanQuery.length >= 3) {
        const data = await fetchOfficial(`https://api.myanimelist.net/v2/${path}?q=${encodeURIComponent(cleanQuery)}&limit=10&fields=${fields}`);
        const results = (data?.data || []).map((entry: any) => formatNode(entry.node || entry));
        if (results.length > 0) return results;
      }

      // 3. Strategy 2: Sanitized query
      const sanitized = cleanQuery.replace(/[:\-_\/\\'"!?,.~#@$%^&*()+=<>]/g, " ").replace(/\s+/g, " ").trim();
      if (sanitized && sanitized !== cleanQuery && sanitized.length >= 3) {
        const data = await fetchOfficial(`https://api.myanimelist.net/v2/${path}?q=${encodeURIComponent(sanitized)}&limit=10&fields=${fields}`);
        const results = (data?.data || []).map((entry: any) => formatNode(entry.node || entry));
        if (results.length > 0) return results;
      }

      // 4. Strategy 3: Leading core terms
      const words = (sanitized || cleanQuery).split(/\s+/).filter(Boolean);
      if (words.length > 2) {
        const leadingQuery = words.slice(0, 3).join(" ");
        if (leadingQuery.length >= 3 && leadingQuery !== sanitized && leadingQuery !== cleanQuery) {
          const data = await fetchOfficial(`https://api.myanimelist.net/v2/${path}?q=${encodeURIComponent(leadingQuery)}&limit=10&fields=${fields}`);
          const results = (data?.data || []).map((entry: any) => formatNode(entry.node || entry));
          if (results.length > 0) return results;
        }
      }

      return [];
    },
  },
  {
    id: "simkl",
    name: "Simkl",
    description: "Sync your anime, movies, and TV shows in one place.",
    url: "https://simkl.com",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/simkl.png",
    accentColor: "bg-[#e50914]/10 border-[#e50914]/20 text-[#e50914] hover:bg-[#e50914]/20",
    glowColor: "shadow-[#e50914]/10",
    capabilities: [ConnectionCapability.ANIME, ConnectionCapability.MOVIES, ConnectionCapability.TV_SHOWS, ConnectionCapability.SHOWCASE],
    primaryApp: "aquila",
    async search(query: string, type: "ANIME" | "MANGA" | "MOVIES" | "TV_SHOWS"): Promise<ConnectionSearchResult[]> {
      const clientId = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SIMKL_CLIENT_ID || process.env.SIMKL_CLIENT_ID || "" : "";
      let path = "anime";
      if (type === "MOVIES") {
        path = "movie";
      } else if (type === "TV_SHOWS") {
        path = "tv";
      } else if (type === "MANGA") {
        return [];
      }
      const res = await fetch(
        `https://api.simkl.com/search/${path}?q=${encodeURIComponent(query)}&client_id=${clientId}`,
        {
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Astral-App/1.0",
          },
        }
      );
      if (!res.ok) {
        let details = res.statusText || `Status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData && typeof errData === "object") {
            details = errData.error_description || errData.error || errData.message || details;
          }
        } catch {}
        throw new Error(`Simkl search failed: ${details}`);
      }
      const data = await res.json();
      return (data || []).map((item: any) => ({
        id: (item.ids?.simkl || item.ids?.simkl_id || item.simkl_id || item.id || "").toString(),
        title: item.title,
        image: item.poster ? `https://simkl.in/posters/${item.poster}_m.jpg` : undefined,
        format: item.type,
        episodes: item.episodes ? (Array.isArray(item.episodes) ? item.episodes.length : undefined) : undefined,
      }));
    },
  },
  {
    id: "trakt",
    name: "Trakt",
    description: "Sync your movies, TV shows, and anime watch progress in one place.",
    url: "https://trakt.tv",
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/trakt.png",
    accentColor: "bg-[#ed1c24]/10 border-[#ed1c24]/20 text-[#ed1c24] hover:bg-[#ed1c24]/20",
    glowColor: "shadow-[#ed1c24]/10",
    capabilities: [ConnectionCapability.ANIME, ConnectionCapability.MOVIES, ConnectionCapability.TV_SHOWS, ConnectionCapability.SHOWCASE],
    primaryApp: "aquila",
    async search(query: string, type: "ANIME" | "MANGA" | "MOVIES" | "TV_SHOWS"): Promise<ConnectionSearchResult[]> {
      const clientId = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_TRAKT_CLIENT_ID || process.env.TRAKT_CLIENT_ID || "" : "";
      let path = "show";
      if (type === "MOVIES") {
        path = "movie";
      } else if (type === "MANGA") {
        return [];
      }
      const res = await fetch(
        `https://api.trakt.tv/search/${path}?query=${encodeURIComponent(query)}`,
        {
          headers: {
            "Content-Type": "application/json",
            "trakt-api-version": "2",
            "trakt-api-key": clientId,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Runa/1.0",
          },
        }
      );
      if (!res.ok) {
        throw new Error(`Trakt search failed: ${res.status} ${res.statusText}`.trim());
      }
      const data = await res.json();
      return (data || []).map((item: any) => {
        const media = item.movie || item.show;
        if (!media) return null;
        return {
          id: media.ids?.trakt?.toString() || "",
          title: media.title,
          format: item.type,
        };
      }).filter((x: any): x is ConnectionSearchResult => x !== null);
    },
  },
  {
    id: "discord",
    name: "Discord",
    description: "Connect with your Discord account.",
    url: "https://discord.com",
    icon: "https://assets-global.website-files.com/6257adef93867e50d84d30e2/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png",
    accentColor: "bg-[#5865f2]/10 border-[#5865f2]/20 text-[#5865f2] hover:bg-[#5865f2]/20",
    glowColor: "shadow-[#5865f2]/10",
    capabilities: [ConnectionCapability.AUTH, ConnectionCapability.SHOWCASE],
    primaryApp: "lynx",
  },
  {
    id: "google",
    name: "Google",
    description: "Connect your Google Account to sync profile, login, and calendar schedules.",
    url: "https://calendar.google.com",
    icon: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg",
    accentColor: "bg-[#4285f4]/10 border-[#4285f4]/20 text-[#4285f4] hover:bg-[#4285f4]/20",
    glowColor: "shadow-[#4285f4]/10",
    capabilities: [ConnectionCapability.AUTH, ConnectionCapability.SHOWCASE, ConnectionCapability.CALENDAR],
    primaryApp: "polaris",
  },
  {
    id: "apple",
    name: "Apple",
    description: "Connect your Apple ID to sync profile, login, and iCloud calendar schedules.",
    url: "https://www.icloud.com/calendar",
    icon: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    accentColor: "bg-[#0070c9]/10 border-[#0070c9]/20 text-[#0070c9] hover:bg-[#0070c9]/20",
    glowColor: "shadow-[#0070c9]/10",
    capabilities: [ConnectionCapability.AUTH, ConnectionCapability.SHOWCASE, ConnectionCapability.CALENDAR],
    primaryApp: "polaris",
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    description: "Connect your Xiaomi Mi Account to sync profile, login, and calendar schedules.",
    url: "https://i.mi.com",
    icon: "https://upload.wikimedia.org/wikipedia/commons/a/ae/Xiaomi_logo_%282021-%29.svg",
    accentColor: "bg-[#ff6900]/10 border-[#ff6900]/20 text-[#ff6900] hover:bg-[#ff6900]/20",
    glowColor: "shadow-[#ff6900]/10",
    capabilities: [ConnectionCapability.AUTH, ConnectionCapability.SHOWCASE, ConnectionCapability.CALENDAR],
    primaryApp: "polaris",
  },
];
