import { MediaType, RecommendationVoteType } from '@runa/database';

export interface HydratedMediaSummary {
  id: number;
  type: MediaType;
  titlePrimary: string;
  titleSecondary?: string | null;
  coverImage?: string | null;
}

export interface RecommendationUserSummary {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface RecommendationItem {
  id: number;
  userId: string;
  user: RecommendationUserSummary;
  sourceType: MediaType;
  sourceId: number;
  targetType: MediaType;
  targetId: number;
  recommendedMedia: HydratedMediaSummary;
  body: string | null;
  upvotes: number;
  downvotes: number;
  score: number;
  userVote: RecommendationVoteType | null;
  createdAt: Date;
  updatedAt: Date;
}
