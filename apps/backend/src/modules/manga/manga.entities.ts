import { MangaFormat, MangaStatus } from '@runa/database';
import type {
  CharacterEntity,
  StudioEntity,
  ActorEntity,
} from '../anime/anime.entities';

export interface MangaCharacterEntity {
  mediaType: string;
  mediaId: number;
  characterId: number;
  actorId: number | null;
  role: string | null;
  order: number | null;
  character?: CharacterEntity;
}

export interface MangaStudioEntity {
  mediaType: string;
  mediaId: number;
  studioId: number;
  isMain: boolean | null;
  studio?: StudioEntity;
}

export interface MangaStaffEntity {
  mediaType: string;
  mediaId: number;
  staffId: number;
  role: string;
  customRole: string | null;
  staff?: ActorEntity;
}

export interface MangaSearchEntity {
  id: number;
  anilistId?: number;
  malId?: number;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: MangaFormat;
  status: MangaStatus;
  isAdult: boolean;
  averageScore: number | null;
}

export interface MangaEntity {
  id: number;
  anilistId: number | null;
  malId: number | null;
  mangaUpdatesId: string | null;

  titlePrimary: string;
  titleSecondary: string | null;
  titleNative: string | null;

  coverImage: string | null;
  bannerImage: string | null;
  images?: any;

  description: string | null;
  hashtag: string | null;
  countryOfOrigin: string | null;

  volumeCount: number | null;
  chapterCount: number | null;

  serialization: string | null;
  imprint: string | null;
  publishers: string[];
  demographics: string[];
  readingDirection: string | null;

  startDateYear: number | null;
  startDateMonth: number | null;
  startDateDay: number | null;
  endDateYear: number | null;
  endDateMonth: number | null;
  endDateDay: number | null;

  genres: string[];
  source: string;
  format: MangaFormat;
  status: MangaStatus;

  averageScore: number | null;
  favorites: number;
  popularity: number;

  alAverageScore: number | null;
  alFavorites: number | null;
  alPopularity: number | null;

  malAverageScore: number | null;
  malFavorites: number | null;
  malPopularity: number | null;

  isAdult: boolean;
  synonyms: string[];
  locked: boolean;

  ageRating: string | null;
  ageRatingGuide: string | null;

  siteUrl: string | null;
  externalLinks?: any;
  sources?: any;

  alUpdatedAt: number | null;
  malUpdatedAt: number | null;

  createdAt: Date;
  updatedAt: Date;

  characters: MangaCharacterEntity[];
  studios: MangaStudioEntity[];
  staff: MangaStaffEntity[];
  relations?: any[];
}
