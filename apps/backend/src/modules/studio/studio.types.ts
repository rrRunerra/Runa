import { MediaType } from '@runa/database';

export interface StudioMediaRelease {
  id: number;
  mediaType: MediaType | 'ANIME' | 'MANGA' | 'MOVIE' | 'TV' | 'GAME' | 'BOOK';
  titlePrimary: string;
  titleSecondary: string | null;
  coverImage: string | null;
  format: string | null;
  status: string | null;
  year: number | null;
  month: number | null;
  day: number | null;
  isMain: boolean;
  averageScore: number | null;
}

export interface StudioDetailData {
  id: number;
  anilistId: number | null;
  malId: number | null;
  aniDBId: number | null;
  tvDBId: number | null;
  bangumiId: number | null;
  name: string;
  isAnimationStudio: boolean;
  siteUrl: string | null;
  favorites: number | null;
  alFavorites: number | null;
  releases: StudioMediaRelease[];
}

export interface StudioSearchItem {
  id: number;
  anilistId: number | null;
  malId: number | null;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  isAnimationStudio: boolean;
}
