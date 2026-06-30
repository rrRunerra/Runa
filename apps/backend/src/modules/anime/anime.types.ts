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
        format:
          | 'TV'
          | 'TV_SHORT'
          | 'MOVIE'
          | 'SPECIAL'
          | 'OVA'
          | 'ONA'
          | 'MUSIC';
        status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED';
        isAdult: boolean;
      }[];
    };
  };
}
