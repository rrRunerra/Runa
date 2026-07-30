// V2 Anime Schema Entity Definitions for Runa Frontend
import type { AnimeFormat, AnimeStatus } from '@runa/database';

export interface AiringScheduleV2Entity {
  id: number;
  animeId: number;
  episodeNumber: number;
  airingAt: string | Date;
  anilistAiringId: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface MediaTrailer {
  id: string;
  site: string;
  thumbnail: string;
}

export interface ExternalLink {
  url: string;
  icon: string | null;
  site: string;
}

export interface MediaSourceOrigin {
  url?: string;
  provider: string;
  fetchedAt?: string;
  externalId?: string;
}

export interface ThemeSongs {
  openings?: string[];
  endings?: string[];
}

export interface AnimeEpisodeV2Entity {
  id: number;
  animeId: number;
  number: number;
  type: string;
  titlePrimary: string | null;
  titleSecondary: string | null;
  titleNative: string | null;
  description: string | null;
  duration: number | null;
  airDate: string | null;
  thumbnail: string | null;
  isFiller: boolean;
  isRecap: boolean;
  streamingLinks?: any;
  opStart?: any;
  opEnd?: any;
  edStart?: any;
  edEnd?: any;
  recapStart?: any;
  recapEnd?: any;
  skipTimestamps?: any;
  malEpisodeId?: number | null;
  anidbEpisodeId?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CharacterV2Entity {
  id: number;
  anilistId: number | null;
  malId?: number | null;
  aniDBId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;
  namePrimary: string;
  nameNative: string | null;
  nameAlternative: string[];
  nameAlternativeSpoiler: string[];
  image: string | null;
  images?: any;
  description: string | null;
  gender: string | null;
  age: string | null;
  bloodType: string | null;
  dateOfBirthYear: number | null;
  dateOfBirthMonth: number | null;
  dateOfBirthDay: number | null;
  favorites?: number;
  alFavorites: number | null;
  sources?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface ActorV2Entity {
  id: number;
  anilistId: number | null;
  malId?: number | null;
  aniDBId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;
  namePrimary: string;
  nameNative: string | null;
  nameAlternative: string[];
  image: string | null;
  images?: any;
  description: string | null;
  language: string | null;
  sources?: any;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AnimeCharacterV2Entity {
  id: number;
  mediaType: string;
  mediaId: number;
  characterId: number;
  actorId: number | null;
  role: string | null;
  order: number | null;
  character: CharacterV2Entity;
  actor: ActorV2Entity | null;
}

export interface StudioV2Entity {
  id: number;
  name: string;
  isAnimationStudio?: boolean;
  siteUrl?: string | null;
}

export interface AnimeStudioV2Entity {
  id: number;
  mediaType: string;
  mediaId: number;
  studioId: number;
  isMain: boolean;
  studio: StudioV2Entity;
}

export interface StaffV2Entity {
  id: number;
  namePrimary: string;
  nameNative: string | null;
  image: string | null;
  description?: string | null;
  language?: string | null;
}

export interface AnimeStaffV2Entity {
  id: number;
  mediaType?: string;
  mediaId?: number;
  staffId?: number;
  role: string;
  staff: StaffV2Entity | any;
}

export interface AnimeRelationV2Entity {
  id: number;
  sourceType: string;
  sourceId: number;
  targetType: string;
  targetId: number;
  relationType?: string;
  type?: string;
  targetMedia?: {
    id: number;
    anilistId?: number | null;
    titlePrimary?: string;
    titleSecondary?: string | null;
    titleNative?: string | null;
    coverImage?: string | null;
    format?: AnimeFormat;
    status?: AnimeStatus;
    seasonYear?: number;
  } | null;
}

export interface AnimeImages {
  mal?: {
    pictures?: string[];
  };
  tvdb?: {
    banners?: string[];
    posters?: string[];
    backgrounds?: string[];
  };
  anilist?: {
    cover?: {
      color?: string;
      large?: string;
      medium?: string;
      extraLarge?: string;
    };
    banner?: string;
  };
}

export interface AnimeSearchEntity {
  id: number;
  titlePrimary: string;
  titleSecondary: string | null;
  coverImage: string | null;
  format: AnimeFormat;
  status: AnimeStatus;
  isAdult: boolean;
  averageScore: number | null;
}

export interface AnimeEntity {
  id: number;
  anilistId: number | null;
  malId: number | null;
  aniDBId: number | null;
  tvDBId: number | null;
  bangumiId: number | null;

  titlePrimary: string;
  titleSecondary: string | null;
  titleNative: string | null;

  coverImage: string | null;
  bannerImage: string | null;
  images: AnimeImages | null;

  description: string | null;
  hashtag: string | null;
  countryOfOrigin: string | null;

  episodeCount: number | null;
  episodeDuration: number | null;
  episodes: AnimeEpisodeV2Entity[];
  airingSchedule: AiringScheduleV2Entity[];

  startDateYear: number;
  startDateMonth: number | null;
  startDateDay: number | null;

  endDateYear: number | null;
  endDateMonth: number | null;
  endDateDay: number | null;

  genres: string[];
  source: string;
  format: AnimeFormat;
  status: AnimeStatus;
  seasonSeason: string;
  seasonYear: number;

  averageScore: number | null;
  favorites: number;
  popularity: number;
  totalScoreSum: number | null;
  scoredCount: number | null;
  statusDistribution: Record<string, number>;
  scoreDistribution: Record<string, number>;

  alAverageScore: number | null;
  alFavorites: number | null;
  alPopularity: number | null;

  malAverageScore: number | null;
  malFavorites: number | null;
  malPopularity: number | null;

  isAdult: boolean;
  synonyms: string[];
  trailers: MediaTrailer[] | null;
  locked: boolean;

  siteUrl: string | null;
  externalLinks: ExternalLink[] | null;
  sources: MediaSourceOrigin[] | null;

  themeSongs: ThemeSongs | null;

  ageRating: string | null;
  ageRatingGuide: string | null;

  nextAiringEpisodeNumber: number | null;
  nextAiringAt: string | Date | null;

  alUpdatedAt: number | null;
  malUpdatedAt: number | null;
  anidbUpdatedAt: number | null;

  createdAt: string | Date;
  updatedAt: string | Date;

  characters: AnimeCharacterV2Entity[];
  studios: AnimeStudioV2Entity[];
  staff: AnimeStaffV2Entity[];
  relations?: AnimeRelationV2Entity[];

  localPopularity?: number;
  localFavoritesCount?: number;
  localAverageScore?: number;
  localStatusDistribution?: Record<string, number>;
  localScoreDistribution?: Record<string, number>;
  localTotalScoreSum?: number;
  localScoredCount?: number;
}
