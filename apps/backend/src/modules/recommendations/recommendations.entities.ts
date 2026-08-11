import { RecommendationItem } from './recommendations.types';

export type RecommendationEntity = RecommendationItem;

export interface PaginatedRecommendationsEntity {
  data: RecommendationEntity[];
  pageInfo: {
    count: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  userRecommendation?: RecommendationEntity | null;
}

export interface RecommendationVoteResultEntity {
  recommendationId: number;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: 'UPVOTE' | 'DOWNVOTE' | null;
}
