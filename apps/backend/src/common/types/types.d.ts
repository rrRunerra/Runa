export interface SearchMedia {
  id: string;
  title: {
    romaji: string;
    english: string;
  };
  coverImage: {
    large: string;
  };
  format: string;
  status: string;
  isAdult: boolean;
}

export interface MediaRelation {
  id: string;
  relationType: string;
  title: { romaji: string; english?: string };
  format: string;
  type: string;
}

export interface MediaCharacter {
  name: string;
  personName?: string;
  image: string;
  role?: string;
}

export interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

export interface MediaExternalLink {
  id: string;
  url: string;
  site: string;
}

export interface MediaStudio {
  name: string;
}

export interface MediaSeason {
  id: string;
  number: number;
  name?: string;
  image?: string;
  episodeCount?: number;
  episodes?: MediaEpisode[];
}

export interface MediaEpisode {
  id: string;
  number: number;
  name: string;
  overview?: string;
  image?: string;
  airDate?: string;
}

export interface Media {
  id: string;
  title: {
    romaji: string;
    english?: string;
    native?: string;
  };
  coverImage: {
    extraLarge?: string;
    large: string;
    color?: string;
  };
  bannerImage?: string;
  format: string;
  status: string;
  description: string;
  startDate?: { year: number; month: number; day: number };
  endDate?: { year: number; month: number; day: number };
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  chapters?: number;
  volumes?: number;
  runtime?: number;
  budget?: string;
  boxOffice?: string;
  genres: string[];
  source?: string;
  tags?: { name: string; rank?: number }[];
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  externalLinks?: MediaExternalLink[];
  studios?: MediaStudio[];
  staff?: { id: string; name: string; role: string }[];
  seasons?: MediaSeason[];
}

export interface RemoteId {
  id: string;
  type: number;
  sourceName: string;
}

export interface Overviews {
  [languageCode: string]: string;
}

export interface Translations {
  [languageCode: string]: string;
}

export interface SearchMediaItem {
  objectID: string;
  aliases?: string[];
  country?: string;
  director?: string;
  extended_title?: string;
  genres?: string[];
  studios?: string[];
  id: string;
  image_url?: string;
  name: string;
  first_air_time?: string;
  overview?: string;
  primary_language?: string;
  primary_type?: string;
  status?: string;
  type?: string;
  tvdb_id?: string;
  year?: string;
  slug?: string;
  overviews?: Overviews;
  translations?: Translations;
  remote_ids?: RemoteId[];
  thumbnail?: string;
}

export interface SearchApiResponse {
  status: 'success' | 'error';
  data: SearchMediaItem[];
}
