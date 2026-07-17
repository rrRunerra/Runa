export interface TvSearchEntity {
  id: number;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
}

export interface TvCharacterEntity {
  id: number;
  name: string;
  personName: string;
  image: string | null;
  role: string | null;
  actorId: number | null;
}

export interface TvTrailerEntity {
  id: string;
  name: string;
  url: string;
  language: string;
}

export interface TvEpisodeEntity {
  id: number;
  number: number;
  name: string;
  overview: string | null;
  image: string | null;
  airDate: string | null;
}

export interface TvSeasonEntity {
  id: number;
  number: number;
  name: string | null;
  image: string | null;
  episodeCount: number;
  episodes: TvEpisodeEntity[];
}

export interface TvEntity {
  id: number;
  tvdbId: number;
  tmdbId: number | null;
  imdbId: string | null;
  titleEnglish: string | null;
  titleRomaji: string | null;
  titleNative: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  description: string | null;
  slug: string | null;
  status: string | null;
  averageRuntime: number | null;
  firstAired: string | null;
  genres: string[];
  studios: string[];
  characters: TvCharacterEntity[] | null;
  seasons: TvSeasonEntity[] | null;
  trailers: TvTrailerEntity[] | null;
  originalCountry: string | null;
  originalLanguage: string | null;
  contentRating: string | null;
  locked: boolean;
  updatedAt: Date;
  episodeCount?: number | null;
}
