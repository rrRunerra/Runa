// V2 Book Schema Entity Definitions for Runa Frontend
import type { MediaSourceOrigin } from './anime.entities';

export interface BookStudioV2Entity {
  id: number;
  name: string;
  isMain: boolean;
}

export interface BookCharacterV2Entity {
  id: number;
  characterId: number;
  namePrimary: string;
  nameNative?: string | null;
  image?: string | null;
  role?: string | null;
  actor?: {
    id: number;
    namePrimary: string;
    nameNative?: string | null;
    image?: string | null;
  } | null;
}

export interface BookStaffV2Entity {
  id: number;
  role: string;
  customRole?: string | null;
  actor?: {
    id: number;
    namePrimary: string;
    nameNative?: string | null;
    image?: string | null;
  } | null;
}

export interface BookRelationV2Entity {
  id: number;
  type: string;
  targetType: string;
  targetId: number;
  titlePrimary: string;
  coverImage?: string | null;
  format?: string;
  status?: string;
}

export interface BookSearchEntity {
  id: number;
  titlePrimary: string;
  titleSecondary: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
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
  seriesPosition?: number | string | null;
  format?: string | null;

  website?: string | null;
  siteUrl?: string | null;
  previewLink?: string | null;
  infoLink?: string | null;
  buyLink?: string | null;

  releaseDateYear?: number | null;
  releaseDateMonth?: number | null;
  releaseDateDay?: number | null;
  releaseDate?: string | Date | null;

  pageCount?: number | null;
  chapterCount?: number | null;
  volumeCount?: number | null;

  genres: string[];
  subjects: string[];
  tags: string[];

  publishers: string[];
  authors: string[];

  status: string;
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

  statusDistribution?: Record<string, number>;
  scoreDistribution?: Record<string, number>;

  sources?: MediaSourceOrigin[] | null;

  retailPrice?: number | null;
  retailPriceCurrency?: string | null;
  ageRating?: string | null;
  ageRatingGuide?: string | null;
  contentRatings?: Array<{ name: string; country: string }> | null;

  googleBooksUpdatedAt?: number | null;

  createdAt: string | Date;
  updatedAt: string | Date;

  characters: BookCharacterV2Entity[];
  studios: BookStudioV2Entity[];
  staff: BookStaffV2Entity[];
  relations: BookRelationV2Entity[];

  // Optional local aggregate fallbacks
  localPopularity?: number;
  localFavoritesCount?: number;
  localAverageScore?: number;
  localStatusDistribution?: Record<string, number>;
  localScoreDistribution?: Record<string, number>;
  localTotalScoreSum?: number;
  localScoredCount?: number;
}
