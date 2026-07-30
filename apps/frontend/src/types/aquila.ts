export enum MediaType {
  ANIME = "ANIME",
  MANGA = "MANGA",
  MOVIE = "MOVIE",
  TV = "TV",
  GAME = "GAME",
  BOOK = "BOOK",
  MUSIC = "MUSIC",
  OTHER = "OTHER",
  UNKNOWN = "UNKNOWN",
}

export interface MediaItem {
  id: number | string;
  title: string;
  image: string;
  progress: number;
  episodes: number | null;
  format: string;
  status: string;
  last_updated: string;
  type: "anime" | "manga" | "tv" | "movie" | "game" | "book";
  meta?: {
    season?: number;
    episode?: number;
  };
}

export interface MediaSectionProps {
  title: string;
  icon: React.ReactNode;
  items: MediaItem[];
  onIncrement: (item: MediaItem) => void;
  updatingId: string | null;
  onRefresh: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export interface SearchResult {
  id: string | number;
  title: string | {
    romaji: string;
    english?: string;
  };
  secondaryTitle?: string | null;
  coverImage?: string | {
    large: string;
  } | null;
  format: string;
  status: string;
  isAdult: boolean;
}

export interface Episode {
  id: string;
  number: number;
  name: string;
  overview?: string;
  image?: string;
  airDate?: string;
}

export interface Season {
  id: string;
  number: number;
  name: string;
  image?: string;
  episodeCount: number;
  episodes: Episode[];
}

export interface MediaCharacter {
  name: string;
  personName?: string;
  image: string;
  role?: string;
  voiceActor?: {
    name: string;
    image: string;
  } | null;
}

export interface MediaStudio {
  id?: string;
  name: string;
  isAnimationStudio?: boolean;
}

export interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

export interface MediaRelation {
  id: string;
  relationType: string;
  title: {
    romaji: string;
    english?: string;
  };
  format: string;
  type: string;
}

export interface MediaExternalLink {
  id: string;
  url: string;
  site: string;
}

export interface Media {
  id: string | number;
  title?: {
    romaji: string;
    english?: string;
    native?: string;
  };
  titlePrimary?: string | null;
  titleSecondary?: string | null;
  coverImage?: string | {
    extraLarge?: string;
    large: string;
    color?: string;
  } | null;
  bannerImage?: string;
  images?: any;
  format: string;
  status: string;
  description: string;
  genres: string[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  studios?: MediaStudio[];
  seasons?: Season[];
  relations?: MediaRelation[];
  externalLinks?: MediaExternalLink[];
  staff?: { id: string; name: string; role: string }[];
  originalCountry?: string;
  originalLanguage?: string;
  tvType?: string;
  averageRuntime?: number;
  runtime?: number;
  contentRating?: string;
  startDate?: { year: number; month?: number | null; day?: number | null };
  endDate?: { year: number; month?: number | null; day?: number | null };
  season?: string;
  seasonYear?: number;
  episodes?: number;
  duration?: number;
  chapters?: number;
  volumes?: number;
  source?: string;

  // Flat API properties mapping compatibility
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  titleNative?: string | null;
  titleString?: string | null;
  coverImageLarge?: string | null;
  backgroundImage?: string | null;
  animeCharacters?: any[];
  mangaCharacters?: any[];
  animeRelations?: any[];
  relatedAnimeRelations?: any[];
  mangaMangaRelations?: any[];
  mangaRelatedMangaRelations?: any[];
  released?: string | null;
  releasedYear?: number | null;
  releasedMonth?: number | null;
  releasedDay?: number | null;
  developers?: string[];
  platforms?: string[];
  authors?: string[];
  artists?: string[];
  publishers?: string[];
  tags?: { id: string; name: string; rank?: number }[];
  averageScore?: number;
  popularity?: number;
  favourites?: number;
  trending?: number;
  meanScore?: number;
  synonyms?: string[];
  hashtag?: string;
  nextAiringEpisode?: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  } | null;
  countryOfOrigin?: string;
  locked?: boolean;
  pages?: number | null;
  subtitle?: string | null;
  publishedDate?: string | null;
  averageRating?: number | null;
  ratingsCount?: number | null;
  language?: string | null;
  isbn10?: string | null;
  isbn13?: string | null;
  previewLink?: string | null;
  infoLink?: string | null;
  buyLink?: string | null;
  retailPrice?: number | null;
  retailPriceCurrency?: string | null;
  maturityRating?: string | null;
  publisher?: string | null;
}
