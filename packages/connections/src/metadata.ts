export enum ConnectionCapability {
  ANIME = "ANIME",
  MANGA = "MANGA",
  MOVIES = "MOVIES",
  TV_SHOWS = "TV_SHOWS",
  AUTH = "AUTH",
  SHOWCASE = "SHOWCASE",
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
  primaryApp: "aquila" | "lynx";
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
      const path = type.toLowerCase(); // 'anime' or 'manga'
      const res = await fetch(
        `https://api.jikan.moe/v4/${path}?q=${encodeURIComponent(query)}&limit=10`
      );
      const data = await res.json();
      return (data.data || []).map((item: any) => ({
        id: item.mal_id.toString(),
        title: item.title_english || item.title,
        image: item.images?.jpg?.image_url,
        format: item.type,
        episodes: item.episodes,
        chapters: item.chapters,
      }));
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
      const clientId = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SIMKL_CLIENT_ID || "" : "";
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
        throw new Error(`Simkl search failed: ${res.statusText}`);
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
];
