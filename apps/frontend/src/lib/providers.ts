export interface ConnectionProvider {
  key: string;
  name: string;
  tags: string[];
}

export const BASE_CONNECTION_PROVIDERS: ConnectionProvider[] = [
  { key: "anilist", name: "AniList", tags: ["Anime", "Manga"] },
  { key: "mal", name: "MyAnimeList", tags: ["Anime", "Manga"] },
];
