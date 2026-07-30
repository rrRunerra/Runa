// V2 Game Schema Entity Definitions for Runa Frontend
import type { MediaSourceOrigin } from './anime.entities';

export interface GameStudioV2Entity {
  id: number;
  name: string;
  isMain: boolean;
}

export interface GameTrailerV2Entity {
  name: string;
  site?: string;
  video?: string | null;
  preview?: string | null;
  url?: string | null;
}

export interface GameCharacterV2Entity {
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

export interface GameStaffV2Entity {
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

export interface GameRelationV2Entity {
  id: number;
  type: string;
  targetType: string;
  targetId: number;
  titlePrimary: string;
  coverImage?: string | null;
  format?: string;
  status?: string;
}

export interface GameImages {
  cover?: string;
  banner?: string;
  screenshots?: string[];
}

export interface GameSearchEntity {
  id: number;
  titlePrimary: string;
  titleSecondary: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
}

export interface GameEntity {
  id: number;
  rawgId?: number | null;
  igdbId?: number | null;
  steamAppId?: number | null;
  giantbombId?: number | null;
  vndbId?: number | null;

  titlePrimary: string;
  titleSecondary?: string | null;
  titleNative?: string | null;
  slug?: string | null;
  tagline?: string | null;

  coverImage?: string | null;
  bannerImage?: string | null;
  backgroundImage?: string | null;
  images?: GameImages | null;

  description?: string | null;
  originalLanguage?: string | null;
  countryOfOrigin?: string | null;
  website?: string | null;
  siteUrl?: string | null;

  releaseDateYear?: number | null;
  releaseDateMonth?: number | null;
  releaseDateDay?: number | null;
  releaseDate?: string | Date | null;

  genres: string[];
  tags: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  franchise?: string | null;
  gameModes: string[];
  playerPerspectives: string[];

  status: string;
  isAdult: boolean;
  synonyms: string[];
  trailers?: GameTrailerV2Entity[];
  locked: boolean;

  averageScore?: number | null;
  metacriticScore?: number | null;
  metacriticUserScore?: number | null;
  rawgRating?: number | null;
  rawgRatingsCount?: number | null;
  igdbRating?: number | null;
  igdbRatingCount?: number | null;
  steamRating?: number | null;
  steamPositivePercent?: number | null;

  hltbMainStory?: number | null;
  hltbExtraStory?: number | null;
  hltbCompletionist?: number | null;

  favorites: number;
  popularity: number;
  totalScoreSum?: number | null;
  scoredCount?: number | null;

  statusDistribution?: Record<string, number>;
  scoreDistribution?: Record<string, number>;

  sources?: MediaSourceOrigin[] | null;

  esrbRating?: string | null;
  pegiRating?: string | null;
  ageRating?: string | null;
  ageRatingGuide?: string | null;
  contentRatings?: Array<{ name: string; country: string }> | null;

  rawgUpdatedAt?: number | null;
  igdbUpdatedAt?: number | null;
  steamUpdatedAt?: number | null;

  createdAt: string | Date;
  updatedAt: string | Date;

  characters: GameCharacterV2Entity[];
  studios: GameStudioV2Entity[];
  staff: GameStaffV2Entity[];
  relations: GameRelationV2Entity[];

  // Optional local aggregate fallbacks
  localPopularity?: number;
  localFavoritesCount?: number;
  localAverageScore?: number;
  localStatusDistribution?: Record<string, number>;
  localScoreDistribution?: Record<string, number>;
  localTotalScoreSum?: number;
  localScoredCount?: number;
}
