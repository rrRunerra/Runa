export interface RawgSearchResult {
  id: number;
  name: string;
  slug: string;
  background_image?: string;
  released?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
  esrb_rating?: { slug: string };
  tags?: { name: string; slug: string }[];
}

export interface RawgSearchResponse {
  results: RawgSearchResult[];
  count: number;
}

export interface RawgGameDetail {
  id: number;
  name: string;
  name_original?: string;
  slug: string;
  description?: string;
  description_raw?: string;
  background_image?: string;
  background_image_additional?: string;
  released?: string;
  rating?: number;
  ratings_count?: number;
  metacritic?: number;
  genres?: { name: string }[];
  platforms?: { platform: { name: string } }[];
  developers?: { name: string }[];
  publishers?: { name: string }[];
  tags?: { name: string; slug: string; language?: string }[];
  esrb_rating?: { slug: string; name?: string };
  added?: number;
  playtime?: number;
}
