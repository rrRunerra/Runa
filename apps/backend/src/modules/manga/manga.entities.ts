import { MangaFormat, MangaStatus } from '@runa/database';
import type { RelationEntity } from '../anime/anime.entities';

export interface MangaCharacterEntity {
  mangaId: number;
  characterId: number;
  role: string | null;
  order: number | null;
}

export interface MangaStudioEntity {
  mangaId: number;
  studioId: number;
  isMain: boolean | null;
}

export interface MangaSearchEntity {
  id: number;
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
  titleEnglish: string | null;
  titleRomaji: string | null;
  titleNative: string | null;
  coverImageLarge: string | null;
  bannerImage: string | null;
  description: string | null;
  startDateYear: number | null;
  startDateMonth: number | null;
  startDateDay: number | null;
  endDateYear: number | null;
  endDateMonth: number | null;
  endDateDay: number | null;
  chapters: number | null;
  volumes: number | null;
  genres: string[];
  tags: unknown | null;
  source: string | null;
  format: MangaFormat;
  status: MangaStatus;
  isAdult: boolean | null;
  averageScore: number | null;
  favourites: number | null;
  synonyms: string[];
  hashtag: string | null;
  countryOfOrigin: string | null;
  locked: boolean;
  anilistUpdatedAt: number | null;
  updatedAt: Date;
  mangaCharacters: MangaCharacterEntity[];
  mangaStudios: MangaStudioEntity[];
  mangaMangaRelations: RelationEntity[];
}
