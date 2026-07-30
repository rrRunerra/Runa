import { ActorEntity } from '../actor/actor.entities';

export interface MovieSearchEntity {
  id: number;
  tvdbId?: number | null;
  imdbId?: string | null;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
  releaseDateYear?: number | null;
}

export interface MovieCharacterV2Entity {
  id: number;
  characterId: number;
  namePrimary: string;
  nameNative: string | null;
  image: string | null;
  role: string | null;
  actor: ActorEntity | null;
}

export interface MovieStudioV2Entity {
  id: number;
  name: string;
  isMain: boolean;
}

export interface MovieStaffV2Entity {
  id: number;
  actor: ActorEntity;
  role: string;
  customRole: string | null;
}

export interface MovieRelationEntity {
  id: number;
  type: string;
  targetType: 'ANIME' | 'MANGA' | 'MOVIE' | 'TV' | 'BOOK' | 'GAME';
  targetId: number;
  titlePrimary: string;
  coverImage: string | null;
  format: string;
  status: string;
}

export interface MovieEntity {
  id: number;
  tvDBId: number | null;
  imdbId: string | null;
  traktId: number | null;
  tmdbId?: number | null;

  titlePrimary: string;
  titleSecondary: string | null;
  titleNative: string | null;
  tagline: string | null;

  coverImage: string | null;
  bannerImage: string | null;
  images: any | null;

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
  trailers: any | null;
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

  sources: any | null;

  ageRating: string | null;
  ageRatingGuide: string | null;

  imdbUpdatedAt: number | null;
  tvdbUpdatedAt: number | null;

  createdAt: Date;
  updatedAt: Date;

  characters: MovieCharacterV2Entity[];
  studios: MovieStudioV2Entity[];
  staff: MovieStaffV2Entity[];
  relations: MovieRelationEntity[];
}
