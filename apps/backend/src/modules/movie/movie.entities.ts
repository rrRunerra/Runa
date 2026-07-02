export interface MovieSearchEntity {
  id: number;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
}

export interface MovieCharacterEntity {
  name: string;
  personName: string;
  image: string | null;
  role: string | null;
}

export interface MovieStudioEntity {
  name: string;
}

export interface MovieTrailerEntity {
  id: string;
  name: string;
  url: string;
  language: string;
}

export interface MovieEntity {
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
  releaseDate: string | null;
  status: string | null;
  runtime: number | null;
  budget: string | null;
  revenue: string | null;
  boxOffice: string | null;
  genres: string[];
  studios: string[];
  tags: Record<string, any> | null;
  characters: MovieCharacterEntity[] | null;
  trailers: MovieTrailerEntity[] | null;
  originalCountry: string | null;
  originalLanguage: string | null;
  contentRating: string | null;
  startDateYear: number | null;
  startDateMonth: number | null;
  startDateDay: number | null;
  endDateYear: number | null;
  endDateMonth: number | null;
  endDateDay: number | null;
  locked: boolean;
  updatedAt: Date;
}
