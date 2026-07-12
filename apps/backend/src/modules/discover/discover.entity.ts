export interface DiscoverItemEntity {
  id: number;
  title: string;
  secondaryTitle: string | null;
  coverImage: string | null;
  format?: string | null;
  status?: string | null;
  isAdult: boolean;
  year?: number | null;
  averageScore?: number | null;
}

export interface DiscoverResponse {
  items: DiscoverItemEntity[];
  metadata: {
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface DiscoverMetaResponse {
  years: number[];
  formats: string[];
  statuses: string[];
}

export interface CalendarItemEntity {
  id: string | number;
  title: string;
  coverImage: string | null;
  type: 'anime' | 'manga' | 'tv' | 'movie' | 'game' | 'book';
  airDate: string; // YYYY-MM-DD
  airingAt?: number; // Unix timestamp (for anime countdowns)
  episode?: number; // Episode number if applicable
  episodeTitle?: string; // TV episode title if applicable
  event: 'airing' | 'release' | 'premiere';
}

