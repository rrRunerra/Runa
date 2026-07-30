// V2 TV entity types — matches the backend AquilaTvV2 API response

export interface TvSearchEntity {
  id: number;
  tvDBId?: number | null;
  tmdbId?: number | null;
  imdbId?: string | null;
  tvmazeId?: number | null;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
  firstAiredYear?: number | null;
}

export interface TvCharacterEntity {
  id: number;
  characterId: number;
  namePrimary: string;
  nameNative: string | null;
  image: string | null;
  role: string | null;
  actor: {
    id: number;
    namePrimary: string;
    nameNative: string | null;
    image: string | null;
  } | null;
}

export interface TvTrailerEntity {
  id: number;
  key: string;
  url: string;
  name: string;
  site: string;
  language: string;
}

export interface TvEpisodeEntity {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  titlePrimary: string | null;
  titleSecondary: string | null;
  description: string | null;
  duration: number | null;
  airDate: string | null;
  rating: number | null;
  episodeType: string | null;
  thumbnail: string | null;
  isFiller: boolean;
  isRecap: boolean;
}

export interface TvSeasonEntity {
  id: number;
  seasonNumber: number;
  titlePrimary: string | null;
  titleSecondary: string | null;
  description: string | null;
  posterImage: string | null;
  airDateYear: number | null;
  airDateMonth: number | null;
  airDateDay: number | null;
  episodeCount: number;
}

export interface TvStudioEntity {
  id: number;
  name: string;
  isMain: boolean;
}

export interface TvEntity {
  id: number;
  tvDBId?: number | null;
  imdbId?: string | null;
  tmdbId?: number | null;
  traktId?: number | null;
  tvmazeId?: number | null;
  tvrageId?: number | null;

  titlePrimary: string;
  titleSecondary?: string | null;
  titleNative?: string | null;
  tagline?: string | null;

  coverImage?: string | null;
  bannerImage?: string | null;
  images?: any;

  description?: string | null;
  originalLanguage?: string | null;
  countryOfOrigin?: string | null;
  episodeCount?: number | null;
  seasonCount?: number | null;
  averageRuntime?: number | null;
  homepage?: string | null;
  siteUrl?: string | null;
  showType?: string | null;

  broadcastTime?: string | null;
  broadcastDays: string[];

  firstAiredYear?: number | null;
  firstAiredMonth?: number | null;
  firstAiredDay?: number | null;

  lastAiredYear?: number | null;
  lastAiredMonth?: number | null;
  lastAiredDay?: number | null;

  genres: string[];
  tags: string[];
  networks: string[];
  studios: string[];

  status: string;
  isAdult: boolean;
  synonyms: string[];
  trailers?: TvTrailerEntity[];
  locked: boolean;

  averageScore?: number | null;
  imdbRating?: number | null;
  imdbVotes?: number | null;
  tvmazeRating?: number | null;
  rottenTomatoesScore?: number | null;
  awards?: string | null;

  favorites: number;
  popularity: number;
  totalScoreSum?: number | null;
  scoredCount?: number | null;
  statusDistribution?: Record<string, number>;
  scoreDistribution?: Record<string, number>;

  sources?: any;

  ageRating?: string | null;
  ageRatingGuide?: string | null;
  contentRatings?: any;

  imdbUpdatedAt?: number | null;
  tvdbUpdatedAt?: number | null;
  tvmazeUpdatedAt?: number | null;

  createdAt: Date;
  updatedAt: Date;

  seasons?: TvSeasonEntity[];
  episodes?: TvEpisodeEntity[];
  characters?: TvCharacterEntity[];
  studiosList?: TvStudioEntity[];
  staff?: any[];
  relations?: any[];


}
