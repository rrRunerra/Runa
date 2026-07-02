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

export interface TvdbMovieExtended {
  id: number;
  name: string;
  slug?: string;
  image?: string;
  overview?: string;
  runtime?: number;
  status?: { id: number; name: string };
  genres?: { id: number; name: string }[];
  studios?: { id: number; name: string }[];
  characters?: {
    id: number;
    name: string;
    personName: string;
    image?: string;
    peopleType?: string;
    peopleId?: number;
    sort?: number;
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
  releaseDate?: string;
  budget?: number;
  revenue?: number;
  boxOffice?: string;
}

export interface TvdbMovieResponse {
  status: string;
  data: TvdbMovieExtended;
}

export interface TvdbTranslation {
  name?: string;
  overview?: string;
}

export interface TvdbTranslationResponse {
  status: string;
  data: TvdbTranslation;
}
