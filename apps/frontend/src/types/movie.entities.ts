// V2 Movie Schema Entity Definitions for Runa Frontend
import type {
  MediaSourceOrigin,
} from './anime.entities';

export interface MovieStudioV2Entity {
  id: number;
  name: string;
  isMain: boolean;
}

export interface MovieTrailerV2Entity {
  id: number | string;
  url: string;
  name: string;
  runtime?: number;
  language?: string;
}

export interface MovieActorV2Entity {
  id: number;
  tvDBId?: number | null;
  namePrimary: string;
  nameNative?: string | null;
  image?: string | null;
  role?: string | null;
}

export interface MovieCharacterV2Entity {
  id: number;
  characterId: number;
  namePrimary: string;
  nameNative?: string | null;
  image?: string | null;
  role?: string | null;
  actor?: MovieActorV2Entity | null;
}

export interface MovieStaffV2Entity {
  id: number;
  role: string;
  customRole?: string | null;
  actor?: MovieActorV2Entity | null;
  staff?: MovieActorV2Entity | null;
}

export interface MovieRelationV2Entity {
  id: number;
  sourceType: string;
  sourceId: number;
  targetType: string;
  targetId: number;
  relationType?: string;
  type?: string;
  targetMedia?: {
    id: number;
    titlePrimary?: string;
    titleSecondary?: string | null;
    titleNative?: string | null;
    coverImage?: string | null;
    format?: string;
    status?: string;
  } | null;
}

export interface MovieImages {
  tvdb?: {
    posters?: string[];
    backdrops?: string[];
  };
}

export interface MovieSearchEntity {
  id: number;
  titlePrimary: string;
  titleSecondary: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
}

export interface MovieEntity {
  id: number;
  tvDBId: number | null;
  imdbId: string | null;
  traktId: string | null;

  titlePrimary: string;
  titleSecondary: string | null;
  titleNative: string | null;

  tagline: string | null;
  coverImage: string | null;
  bannerImage: string | null;
  images: MovieImages | null;

  description: string | null;
  originalLanguage: string | null;
  countryOfOrigin: string | null;

  runtime: number | null;
  budget: string | null;
  revenue: string | null;
  homepage: string | null;
  siteUrl: string | null;

  releaseDateYear: number | null;
  releaseDateMonth: number | null;
  releaseDateDay: number | null;

  genres: string[];
  status: string;
  isAdult: boolean;
  synonyms: string[];
  trailers: MovieTrailerV2Entity[] | null;
  locked: boolean;

  averageScore: number | null;
  favorites: number;
  popularity: number;
  totalScoreSum: number | null;
  scoredCount: number | null;
  statusDistribution: Record<string, number>;
  scoreDistribution: Record<string, number>;

  imdbRating: number | null;
  imdbVotes: number | null;

  sources: MediaSourceOrigin[] | null;

  ageRating: string | null;
  ageRatingGuide: string | null;

  imdbUpdatedAt: number | null;
  tvdbUpdatedAt: number | null;

  createdAt: string | Date;
  updatedAt: string | Date;

  characters: MovieCharacterV2Entity[];
  studios: MovieStudioV2Entity[];
  staff: MovieStaffV2Entity[];
  relations: MovieRelationV2Entity[];

  // Optional local aggregate fallbacks
  localPopularity?: number;
  localFavoritesCount?: number;
  localAverageScore?: number;
  localStatusDistribution?: Record<string, number>;
  localScoreDistribution?: Record<string, number>;
  localTotalScoreSum?: number;
  localScoredCount?: number;
}
