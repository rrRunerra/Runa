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
