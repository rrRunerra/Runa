import { RankingSourceOption } from './rankings.types';

export interface RankedMediaItemEntity {
  rank: number;
  id: number | string;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  bannerImage?: string | null;
  format: string;
  status: string;
  year: number | null;
  season?: string | null;
  genres: string[];
  averageScore: number | null;
  externalScore?: number | null;
  externalScoreSource?: string | null;
  externalScoreMax?: number | null;
  popularity?: number | null;
  favorites?: number | null;
  scoredCount?: number | null;
  isAdult?: boolean;
}

export interface RankingsMetadataEntity {
  totalCount: number;
  limit: number;
  page: number;
  source: string;
  hasMore: boolean;
}

export interface RankingsResponse {
  items: RankedMediaItemEntity[];
  metadata: RankingsMetadataEntity;
}

export interface RankingsMetaResponse {
  sources: RankingSourceOption[];
  genres: string[];
  years: number[];
  seasons: string[];
  formats: string[];
  statuses: string[];
}
