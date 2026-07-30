// V2 Manga Schema Entity Definitions for Runa Frontend
import type { AnimeFormat, AnimeStatus } from '@runa/database';
import type {
  CharacterV2Entity,
  ExternalLink,
  MediaSourceOrigin,
  AnimeStaffV2Entity,
} from './anime.entities';

// ─── Relation ────────────────────────────────────────────────────────────────

export interface MangaRelationV2Entity {
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

// ─── Character join ───────────────────────────────────────────────────────────

export interface MangaCharacterV2Entity {
  id: number;
  mediaType: string;
  mediaId: number;
  characterId: number;
  actorId: number | null;
  role: string | null;
  order: number | null;
  animeId: number | null;
  mangaId: number | null;
  character: CharacterV2Entity;
  actor: null; // manga characters have no voice actors
}

// ─── Images ───────────────────────────────────────────────────────────────────

export interface MangaImages {
  mal?: { pictures?: string[] };
  anilist?: { cover?: string | null; banner?: string | null };
}

// ─── Search result ────────────────────────────────────────────────────────────

export interface MangaSearchEntity {
  id: number;
  titlePrimary: string;
  titleSecondary: string | null;
  coverImage: string | null;
  format: AnimeFormat;
  status: AnimeStatus;
  isAdult: boolean;
  averageScore: number | null;
}

// ─── Full manga detail entity (v2) ────────────────────────────────────────────

export interface MangaEntity {
  id: number;
  anilistId: number | null;
  malId: number | null;
  mangaUpdatesId: number | null;

  titlePrimary: string;
  titleSecondary: string | null;
  titleNative: string | null;

  coverImage: string | null;
  bannerImage: string | null;
  images: MangaImages | null;

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
  source: string | null;
  format: AnimeFormat;
  status: AnimeStatus;

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
  locked: boolean;

  siteUrl: string | null;
  externalLinks: ExternalLink[] | null;
  sources: MediaSourceOrigin[] | null;

  ageRating: string | null;
  ageRatingGuide: string | null;

  alUpdatedAt: number | null;
  malUpdatedAt: number | null;

  createdAt: string | Date;
  updatedAt: string | Date;

  characters: MangaCharacterV2Entity[];
  studios: never[];
  staff: AnimeStaffV2Entity[];
  relations: MangaRelationV2Entity[];
}
