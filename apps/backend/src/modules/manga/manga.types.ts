import type {
  AniListCharacterNode,
  AniListStudioNode,
  AniListRelationNode,
  AniListFuzzyDate,
} from '../anime/anime.types';

export {
  AniListCharacterNode,
  AniListStudioNode,
  AniListRelationNode,
  AniListFuzzyDate,
};

export interface AniListMangaSearchResponse {
  data: {
    Page: {
      pageInfo: {
        total: number;
        currentPage: number;
        lastPage: number;
        hasNextPage: boolean;
        perPage: number;
      };
      media: AniListMangaMedia[];
    };
  };
}

export interface AniListMangaMedia {
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
  chapters: number | null;
  volumes: number | null;
  countryOfOrigin: string | null;
  source: string | null;
  hashtag: string | null;
  coverImage: { large: string | null } | null;
  bannerImage: string | null;
  genres: string[];
  synonyms: string[];
  averageScore: number | null;
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
  siteUrl: string | null;
  updatedAt: number | null;
}
