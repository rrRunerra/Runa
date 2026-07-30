import { AnimeFormat, AnimeStatus, AnimeSource, AnimeSeason, StaffRole, CharacterRole } from '@runa/database';

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

export interface AiringScheduleEntity {
  id: number;
  animeId: number;
  episodeNumber: number;
  airingAt: Date;
  anilistAiringId?: number | null;
}

export interface EpisodeEntity {
  id: number;
  animeId: number;
  number: number;
  type: string;
  titlePrimary: string;
  titleSecondary?: string | null;
  titleNative?: string | null;
  description?: string | null;
  duration?: number | null;
  airDate?: Date | null;
  thumbnail?: string | null;
  isFiller: boolean;
  isRecap: boolean;
  streamingLinks?: any;
  opStart?: number | null;
  opEnd?: number | null;
  edStart?: number | null;
  edEnd?: number | null;
  recapStart?: number | null;
  recapEnd?: number | null;
  skipTimestamps?: any;
  malEpisodeId?: number | null;
  anidbEpisodeId?: number | null;
}

export interface CharacterV2Entity {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  aniDBId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;
  namePrimary: string;
  nameFirst?: string | null;
  nameMiddle?: string | null;
  nameLast?: string | null;
  nameNative?: string | null;
  nameAlternative: string[];
  nameAlternativeSpoiler: string[];
  image?: string | null;
  images?: any;
  description?: string | null;
  gender?: string | null;
  age?: string | null;
  bloodType?: string | null;
  dateOfBirthYear?: number | null;
  dateOfBirthMonth?: number | null;
  dateOfBirthDay?: number | null;
  favorites?: number | null;
  alFavorites?: number | null;
  sources?: any;
}

export interface CharacterEntity {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  namePrimary?: string | null;
  nameFirst?: string | null;
  nameMiddle?: string | null;
  nameLast?: string | null;
  nameNative?: string | null;
  nameAlternative?: string[];
  nameAlternativeSpoiler?: string[];
  image?: string | null;
  images?: any;
  description?: string | null;
  gender?: string | null;
  age?: string | null;
  bloodType?: string | null;
  dateOfBirthYear?: number | null;
  dateOfBirthMonth?: number | null;
  dateOfBirthDay?: number | null;
  favorites?: number | null;
  alFavorites?: number | null;
  sources?: any;
}

export interface StudioV2Entity {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  aniDBId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;
  name: string;
  isAnimationStudio: boolean;
  siteUrl?: string | null;
  favorites?: number | null;
  alFavorites?: number | null;
  sources?: any;
}

export interface StudioEntity {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  name?: string | null;
  isAnimationStudio?: boolean | null;
  siteUrl?: string | null;
  favorites?: number | null;
  alFavorites?: number | null;
  sources?: any;
}

export interface ActorV2Entity {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  aniDBId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;
  namePrimary: string;
  name?: string | null;
  personName?: string | null;
  peopleId?: number | null;
  anilistStaffId?: number | null;
  nameNative?: string | null;
  nameAlternative?: string[];
  image?: string | null;
  images?: any;
  peopleType?: string | null;
  description?: string | null;
  language?: string | null;
  sources?: any;
}

export interface ActorEntity {
  id: number;
  peopleId?: number | null;
  anilistStaffId?: number | null;
  anilistId?: number | null;
  malId?: number | null;
  namePrimary?: string | null;
  name?: string | null;
  personName?: string | null;
  nameNative?: string | null;
  nameAlternative?: string[];
  image?: string | null;
  images?: any;
  peopleType?: string | null;
  description?: string | null;
  language?: string | null;
  sources?: any;
}

export interface MediaCharacterV2Entity {
  id: number;
  mediaType: string;
  mediaId: number;
  characterId: number;
  actorId?: number | null;
  role: CharacterRole;
  order?: number | null;
  character?: CharacterV2Entity;
  actor?: ActorV2Entity | null;
}

export interface MediaStudioV2Entity {
  id: number;
  mediaType: string;
  mediaId: number;
  studioId: number;
  isMain: boolean;
  studio?: StudioV2Entity;
}

export interface MediaStaffV2Entity {
  id: number;
  mediaType: string;
  mediaId: number;
  staffId: number;
  role: StaffRole;
  customRole?: string | null;
  staff?: ActorV2Entity;
}

export interface RelationEntity {
  id: number;
  animeId?: number | null;
  mangaId?: number | null;
  relatedAnimeId?: number | null;
  relatedMangaId?: number | null;
  relationType?: string | null;
  relatedAnime?: AnimeEntity;
  relatedManga?: any;
  anime?: AnimeEntity;
  manga?: any;
}

export interface AnimeSearchEntity {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: AnimeFormat;
  status: AnimeStatus;
  isAdult: boolean;
  averageScore: number | null;
  seasonYear?: number | null;
  episodes?: number | null;
}

export interface AnimeEntity {
  id: number;
  anilistId?: number | null;
  malId?: number | null;
  aniDBId?: number | null;
  tvDBId?: number | null;
  bangumiId?: number | null;

  titlePrimary: string;
  titleSecondary?: string | null;
  titleNative?: string | null;

  coverImage?: string | null;
  bannerImage?: string | null;
  images?: any;

  description?: string | null;
  hashtag?: string | null;
  countryOfOrigin?: string | null;

  episodeCount?: number | null;
  episodeDuration?: number | null;

  startDateYear: number;
  startDateMonth?: number | null;
  startDateDay?: number | null;

  endDateYear?: number | null;
  endDateMonth?: number | null;
  endDateDay?: number | null;

  genres: string[];
  source: AnimeSource;
  format: AnimeFormat;
  status: AnimeStatus;
  seasonSeason: AnimeSeason;
  seasonYear: number;

  averageScore?: number | null;
  favorites: number;
  popularity: number;
  totalScoreSum?: number | null;
  scoredCount?: number | null;
  statusDistribution?: any;
  scoreDistribution?: any;

  alAverageScore?: number | null;
  alFavorites?: number | null;
  alPopularity?: number | null;

  malAverageScore?: number | null;
  malFavorites?: number | null;
  malPopularity?: number | null;

  isAdult: boolean;
  synonyms: string[];
  trailers?: any;
  locked: boolean;

  siteUrl?: string | null;
  externalLinks?: any;
  sources?: any;
  themeSongs?: any;
  ageRating?: string | null;
  ageRatingGuide?: string | null;

  nextAiringEpisodeNumber?: number | null;
  nextAiringAt?: Date | null;

  alUpdatedAt?: number | null;
  malUpdatedAt?: number | null;
  anidbUpdatedAt?: number | null;

  createdAt: Date;
  updatedAt: Date;

  episodes?: EpisodeEntity[];
  airingSchedule?: AiringScheduleEntity[];
  characters?: MediaCharacterV2Entity[];
  studios?: MediaStudioV2Entity[];
  staff?: MediaStaffV2Entity[];
  relations?: any[];
}
