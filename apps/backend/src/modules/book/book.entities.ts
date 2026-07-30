import { BookStatus } from '@runa/database';

export interface BookSearchEntity {
  id: number;
  googleBookId?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
  releaseDateYear?: number | null;
}

export interface BookEntity {
  id: number;
  googleBookId?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;

  titlePrimary: string;
  titleSecondary?: string | null;
  subtitle?: string | null;
  slug?: string | null;
  tagline?: string | null;

  coverImage?: string | null;
  bannerImage?: string | null;
  images?: any;

  description?: string | null;
  originalLanguage?: string | null;
  countryOfOrigin?: string | null;
  series?: string | null;
  seriesPosition?: number | null;
  format?: string | null;
  website?: string | null;
  siteUrl?: string | null;
  previewLink?: string | null;
  infoLink?: string | null;
  buyLink?: string | null;

  releaseDateYear?: number | null;
  releaseDateMonth?: number | null;
  releaseDateDay?: number | null;
  releaseDate?: Date | null;

  pageCount?: number | null;
  chapterCount?: number | null;
  volumeCount?: number | null;

  genres: string[];
  subjects: string[];
  tags: string[];
  publishers: string[];
  authors: string[];
  status: BookStatus;
  isAdult: boolean;
  synonyms: string[];
  locked: boolean;

  averageScore?: number | null;
  googleBooksRating?: number | null;
  googleBooksRatingsCount?: number | null;

  favorites: number;
  popularity: number;
  totalScoreSum?: number | null;
  scoredCount?: number | null;
  statusDistribution?: any;
  scoreDistribution?: any;

  sources?: any;

  retailPrice?: number | null;
  retailPriceCurrency?: string | null;
  ageRating?: string | null;
  ageRatingGuide?: string | null;
  contentRatings?: any;

  googleBooksUpdatedAt?: number | null;

  createdAt: Date;
  updatedAt: Date;

  characters?: any[];
  studios?: any[];
  staff?: any[];
  relations?: any[];
}
