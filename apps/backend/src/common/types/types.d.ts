export interface SearchMedia {
  id: string;
  title: {
    romaji: string;
    english?: string;
  };
  coverImage: {
    large: string;
  };
  format: string;
  status: string;
  isAdult: boolean;
}

export interface MediaRelation {
  id: string;
  relationType: string;
  title: { romaji: string; english?: string };
  format: string;
  type: string;
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

export interface MediaTrailer {
  id: string;
  name: string;
  url: string;
  language?: string;
  site?: string;
}

export interface MediaExternalLink {
  id: string;
  url: string;
  site: string;
}

export interface MediaStudio {
  name: string;
}

export interface MediaSeason {
  id: string;
  number: number;
  name?: string;
  image?: string;
  episodeCount?: number;
  episodes?: MediaEpisode[];
}

export interface MediaEpisode {
  id: string;
  number: number;
  name: string;
  overview?: string;
  image?: string;
  airDate?: string;
}

export interface Media {
  id: string;
  malId?: number | null;
  anilistId?: number | null;
  title: {
    romaji: string;
    english?: string | null;
    native?: string | null;
  };
  coverImage: {
    extraLarge?: string | null;
    large: string | null;
  };
  bannerImage?: string | null;
  format: string;
  status: string;
  description: string;
  startDate?: { year: number | null; month: number | null; day: number | null };
  endDate?: { year: number | null; month: number | null; day: number | null };
  season?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  duration?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  runtime?: number | null;
  averageRuntime?: number | null;
  originalCountry?: string | null;
  originalLanguage?: string | null;
  tvType?: string | null;
  budget?: string | null;
  boxOffice?: string | null;
  genres: string[] | null;
  source?: string | null;
  tags?: { name: string; rank?: number }[] | null;
  averageScore?: number | null;
  popularity?: number | null;
  favourites?: number | null;
  trending?: number | null;
  meanScore?: number | null;
  synonyms?: string[] | null;
  hashtag?: string | null;
  nextAiringEpisode?: any | null;
  contentRating?: string | null;
  countryOfOrigin?: string | null;
  relations?: MediaRelation[];
  characters?: MediaCharacter[];
  trailers?: MediaTrailer[];
  externalLinks?: MediaExternalLink[];
  studios?: MediaStudio[];
  staff?: { id: string; name: string; role: string }[];
  seasons?: MediaSeason[];
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
  artists?: string[] | null;
}

export interface RemoteId {
  id: string;
  type: number;
  sourceName: string;
}

export interface Overviews {
  [languageCode: string]: string;
}

export interface Translations {
  [languageCode: string]: string;
}

export interface SearchMediaItem {
  objectID: string;
  aliases?: string[];
  country?: string;
  director?: string;
  extended_title?: string;
  genres?: string[];
  studios?: string[];
  id: string;
  image_url?: string;
  name: string;
  first_air_time?: string;
  overview?: string;
  primary_language?: string;
  primary_type?: string;
  status?: string;
  type?: string;
  tvdb_id?: string;
  year?: string;
  slug?: string;
  overviews?: Overviews;
  translations?: Translations;
  remote_ids?: RemoteId[];
  thumbnail?: string;
}

export interface SearchApiResponse {
  status: 'success' | 'error';
  data: SearchMediaItem[];
}

export interface AniListSearchResponse {
  data: {
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
        perPage: number;
      };
      media: {
        id: number;
        title: {
          romaji: string;
          english: string;
        };
        coverImage: {
          large: string;
        };
        averageScore: number;
        format: string;
        status: string;
        isAdult: boolean;
      }[];
    };
  };
}

export interface AniListGetResponse {
  data: {
    Media: {
      id: number;
      idMal: number;
      title: { romaji: string; english: string; native: string };
      coverImage: { extraLarge: string; large: string; color?: string };
      bannerImage: string;
      format: string;
      status: string;
      description: string;
      startDate: { year: number; month: number; day: number };
      endDate: { year: number; month: number; day: number };
      season: string;
      seasonYear: number;
      episodes: number;
      duration: number;
      chapters?: number;
      volumes?: number;
      countryOfOrigin: string;
      source: string;
      hashtag: string;
      averageScore: number;
      meanScore: number;
      popularity: number;
      trending: number;
      favourites: number;
      genres: string[];
      synonyms: string[];
      tags: {
        id?: number;
        name: string;
        description?: string;
        rank: number;
        isGeneralSpoiler?: boolean;
      }[];
      isAdult?: boolean;
      relations: {
        edges: {
          id: string;
          relationType: string;
          node: {
            id: number;
            title: { romaji: string };
            format: string;
            type: string;
          };
        }[];
      };
      characters: {
        edges: {
          id: string;
          role: string;
          node: {
            id: number;
            name: { full: string };
            image: { medium: string };
          };
          voiceActors: { name: { full: string }; image: { medium: string } }[];
        }[];
      };
      externalLinks?: { id: string; url: string; site: string }[];
      trailer: { id: string; site: string; thumbnail: string };
      nextAiringEpisode: {
        airingAt: number;
        timeUntilAiring: number;
        episode: number;
      };
      studios: {
        nodes: { id?: number; name: string; isAnimationStudio?: boolean }[];
      };
    };
  };
}
