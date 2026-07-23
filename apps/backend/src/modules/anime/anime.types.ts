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
      media: AniListMedia[];
    };
  };
}

export interface AniListFuzzyDate {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface AniListCharacterNode {
  id: number;
  name: {
    first: string | null;
    middle: string | null;
    last: string | null;
    full: string | null;
    native: string | null;
    alternative: string[];
    alternativeSpoiler: string[];
  };
  image: { large: string | null } | null;
  description: string | null;
  gender: string | null;
  age: string | null;
  bloodType: string | null;
  dateOfBirth: AniListFuzzyDate | null;
}

export interface AniListStudioNode {
  id: number;
  name: string;
  isAnimationStudio: boolean;
  siteUrl: string | null;
}

export interface AniListRelationNode {
  id: number;
  idMal: number | null;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  format: string | null;
  type: 'ANIME' | 'MANGA';
  status: string | null;
  description: string | null;
  coverImage: { large: string | null } | null;
  bannerImage: string | null;
  startDate: AniListFuzzyDate | null;
  endDate: AniListFuzzyDate | null;
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  duration: number | null;
  countryOfOrigin: string | null;
  source: string | null;
  averageScore: number | null;
  favourites: number | null;
  genres: string[];
  synonyms: string[];
  hashtag: string | null;
  isAdult: boolean | null;
  siteUrl: string | null;
  updatedAt: number | null;
}

export interface AniListMedia {
  id: number;
  idMal: number | null;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  };
  format: string | null;
  status: string | null;
  description: string | null;
  startDate: AniListFuzzyDate | null;
  endDate: AniListFuzzyDate | null;
  season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL' | null;
  seasonYear: number | null;
  episodes: number | null;
  duration: number | null;
  countryOfOrigin: string | null;
  source: string | null;
  hashtag: string | null;
  coverImage: { large: string | null } | null;
  bannerImage: string | null;
  genres: string[];
  synonyms: string[];
  averageScore: number | null;
  favourites: number | null;
  trailer: { id: string; site: string; thumbnail: string } | null;
  relations: {
    edges: {
      id: number;
      relationType: string;
      node: AniListRelationNode;
    }[];
  } | null;
  characters: {
    pageInfo?: {
      hasNextPage: boolean;
    };
    edges: {
      role: 'MAIN' | 'SUPPORTING' | 'BACKGROUND';
      node: AniListCharacterNode;
      voiceActors: {
        id: number;
        name: { full: string | null };
        image: { large: string | null } | null;
      }[];
    }[];
  } | null;
  studios: {
    edges: {
      isMain: boolean;
      node: AniListStudioNode;
    }[];
  } | null;
  isAdult: boolean | null;
  nextAiringEpisode: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  } | null;
  updatedAt: number | null;
}
