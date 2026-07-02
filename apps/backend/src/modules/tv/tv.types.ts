export interface TvdbLoginResponse {
  data: {
    token: string;
  };
}

export interface TvdbSearchResult {
  tvdb_id: string;
  name: string;
  translations?: Record<string, string>;
  image?: string;
  thumbnail?: string;
  type?: string;
  status?: string;
  year?: string;
}

export interface TvdbSearchResponse {
  status: string;
  data: TvdbSearchResult[];
}

export interface TvdbSeriesExtended {
  id: number;
  name: string;
  slug?: string;
  image?: string;
  overview?: string;
  status?: { id: number; name: string };
  type?: { id: number; name: string };
  averageRuntime?: number;
  firstAired?: string;
  genres?: { id: number; name: string }[];
  companies?: {
    id: number;
    name: string;
    companyType?: { id: number; name: string };
  }[];
  characters?: {
    id: number;
    peopleId?: number;
    name: string;
    personName: string;
    image?: string;
    peopleType?: string;
  }[];
  artworks?: {
    id: number;
    image: string;
    type: number;
    thumbnail?: string;
  }[];
  originalCountry?: string;
  originalLanguage?: string;
  contentRatings?: { name: string; country: string }[];
  trailers?: {
    id: number;
    name: string;
    url: string;
    language: string;
  }[];
  remoteIds?: { id: string; type: number }[];
  seasons?: {
    id: number;
    number: number;
    name?: string;
    nameTranslations?: { language: string; name: string }[];
    image?: string;
    type?: { id: number };
  }[];
}

export interface TvdbSeriesResponse {
  status: string;
  data: TvdbSeriesExtended;
}

export interface TvdbEpisode {
  id: number;
  number: number;
  name?: string;
  nameTranslations?: { language: string; name: string }[];
  overview?: string;
  overviewTranslations?: { language: string; overview: string }[];
  image?: string;
  aired?: string;
  seasonNumber: number;
  runtime?: number;
}

export interface TvdbEpisodesResponse {
  status: string;
  data: {
    episodes: TvdbEpisode[];
  };
}

export interface TvdbTranslation {
  name?: string;
  overview?: string;
}

export interface TvdbTranslationResponse {
  status: string;
  data: TvdbTranslation;
}
