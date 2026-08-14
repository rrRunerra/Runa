export type ExportFormat =
  | "json"
  | "mal-xml"
  | "anilist-xml"
  | "simkl-xml"
  | "trakt-json";

export interface MediaTypeOption {
  id: string;
  key: string;
}

export const MEDIA_TYPES: MediaTypeOption[] = [
  { id: "anime", key: "anime" },
  { id: "manga", key: "manga" },
  { id: "tv", key: "tv" },
  { id: "movie", key: "movie" },
  { id: "game", key: "game" },
  { id: "book", key: "book" },
];
