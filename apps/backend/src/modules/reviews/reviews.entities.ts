import { MediaType } from '@runa/database';

export interface ReviewUser {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface ReviewEntity {
  id: number;
  username: string;
  mediaType: MediaType;
  mediaId: number;
  summary: string;
  body: string;
  score: number;
  upvotes: number;
  isSpoiler: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: ReviewUser;
}

export interface PaginatedReviewsEntity {
  data: ReviewEntity[];
  pageInfo: {
    count: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
  userReview?: ReviewEntity | null;
}
