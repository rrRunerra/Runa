import { GameStatus } from '@runa/database';

export interface GameSearchEntity {
  id: number;
  rawgId?: number | null;
  igdbId?: number | null;
  steamAppId?: number | null;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format: string;
  status: string;
  isAdult: boolean;
  averageScore: number | null;
  releaseDateYear?: number | null;
}

export interface GameEntity {
  id: number;
  rawgId?: number | null;
  igdbId?: number | null;
  steamAppId?: number | null;
  giantbombId?: string | null;
  vndbId?: string | null;

  titlePrimary: string;
  titleSecondary?: string | null;
  titleNative?: string | null;
  slug?: string | null;
  tagline?: string | null;

  coverImage?: string | null;
  bannerImage?: string | null;
  backgroundImage?: string | null;
  images?: any;

  description?: string | null;
  originalLanguage?: string | null;
  countryOfOrigin?: string | null;
  website?: string | null;
  siteUrl?: string | null;

  releaseDateYear?: number | null;
  releaseDateMonth?: number | null;
  releaseDateDay?: number | null;
  releaseDate?: Date | null;

  genres: string[];
  tags: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
  franchise?: string | null;
  gameModes: string[];
  playerPerspectives: string[];
  status: GameStatus;
  isAdult: boolean;
  synonyms: string[];
  trailers?: any;
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

  requirements?: any;
  languages?: string[];
  controllerSupport?: string | null;
  achievements?: any;

  favorites: number;
  popularity: number;
  totalScoreSum?: number | null;
  scoredCount?: number | null;
  statusDistribution?: any;
  scoreDistribution?: any;

  averagePlaytime?: number | null;
  totalPlaytimeSum?: number | null;
  playtimeCount?: number | null;

  sources?: any;

  esrbRating?: string | null;
  pegiRating?: string | null;
  ageRating?: string | null;
  ageRatingGuide?: string | null;
  contentRatings?: any;

  rawgUpdatedAt?: number | null;
  igdbUpdatedAt?: number | null;
  steamUpdatedAt?: number | null;

  createdAt: Date;
  updatedAt: Date;

  characters?: any[];
  studios?: any[];
  staff?: any[];
  relations?: any[];
}
