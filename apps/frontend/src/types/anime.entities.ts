// Copied from backend module for frontend type safety
import { AnimeFormat, AnimeStatus } from '@runa/database';

// Shared sub-entity types (used by both anime and manga)
export interface MediaTag {
  name: string;
  rank: number;
}

export interface AiringSchedule {
  airingAt: number;
  timeUntilAiring: number;
  episode: number;
}

export interface MediaTrailer {
  id: string;
  site: string;
  thumbnail: string;
}

export interface CharacterEntity {
  id: number;
  anilistId: number | null;
  nameFirst: string | null;
  nameMiddle: string | null;
  nameLast: string | null;
  nameNative: string | null;
  nameAlternative: string[];
  nameAlternativeSpoiler: string[];
  image: string | null;
  description: string | null;
  gender: string | null;
  age: string | null;
  bloodType: string | null;
  dateOfBirthYear: number | null;
  dateOfBirthMonth: number | null;
  dateOfBirthDay: number | null;
}

export interface StudioEntity {
  id: number;
  anilistId: number | null;
  name: string | null;
  isAnimationStudio: boolean;
  siteUrl: string | null;
}

export interface ActorEntity {
  id: number;
  peopleId: number | null;
  anilistStaffId: number | null;
  name: string | null;
  personName: string | null;
  image: string | null;
  peopleType: string | null;
}

export interface AnimeCharacterEntity {
  animeId: number;
  characterId: number;
  voiceActorId: number | null;
  role: string | null;
  order: number | null;
  character?: CharacterEntity;
  voiceActor?: ActorEntity | null;
}

export interface AnimeStudioEntity {
  animeId: number;
  studioId: number;
  isMain: boolean | null;
  studio?: StudioEntity;
}

export interface RelationEntity {
  id: number;
  animeId: number | null;
  mangaId: number | null;
  relatedAnimeId: number | null;
  relatedMangaId: number | null;
  relationType: string | null;
  relatedAnime?: AnimeEntity;
  relatedManga?: any; // MangaEntity not imported here
  anime?: AnimeEntity;
  manga?: any; // MangaEntity not imported here
}

export interface AnimeSearchEntity {
  id: number;
  title: string;
  secondaryTitle: string | null;
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
  season: string | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  genres: string[];
  tags: MediaTag[] | null;
  source: string | null;
  format: AnimeFormat;
  status: AnimeStatus;
  isAdult: boolean | null;
  averageScore: number | null;
  favourites: number | null;
  synonyms: string[];
  hashtag: string | null;
  countryOfOrigin: string | null;
  nextAiringEpisode: AiringSchedule | null;
  trailers: MediaTrailer | null;
  locked: boolean;
  anilistUpdatedAt: number | null;
  updatedAt: Date;
  animeCharacters: AnimeCharacterEntity[];
  animeStudios: AnimeStudioEntity[];
  animeRelations: RelationEntity[];
}
