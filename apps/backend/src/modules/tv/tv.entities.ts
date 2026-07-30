import { TvStatus } from '@runa/database';

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

  status: TvStatus;
  isAdult: boolean;
  synonyms: string[];
  trailers?: any;
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
  statusDistribution?: any;
  scoreDistribution?: any;

  sources?: any;

  ageRating?: string | null;
  ageRatingGuide?: string | null;
  contentRatings?: any;

  imdbUpdatedAt?: number | null;
  tvdbUpdatedAt?: number | null;
  tvmazeUpdatedAt?: number | null;

  createdAt: Date;
  updatedAt: Date;

  seasons?: any[];
  episodes?: any[];
  characters?: any[];
  studiosList?: any[];
  staff?: any[];
  relations?: any[];
}
