import type { FavoriteType } from '@runa/database';

export interface FavoriteEntity {
  id: string;
  userId: string;
  type: FavoriteType;
  targetId: string;
  createdAt: Date;
}

export interface ResolvedFavoriteEntity {
  id: string;
  userId: string;
  type: FavoriteType;
  targetId: string;
  createdAt: Date;
  title: string;
  image: string;
}

export interface FavoriteStatusEntity {
  favorited: boolean;
}

export interface FavoriteSuccessEntity {
  success: boolean;
}
