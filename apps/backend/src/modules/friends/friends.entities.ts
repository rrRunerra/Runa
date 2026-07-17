import { FriendshipState } from './friends.types';

export interface UserMiniEntity {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface FriendRequestEntity {
  id: string;
  senderId: string;
  receiverId: string;
  createdAt: Date;
  sender?: UserMiniEntity;
  receiver?: UserMiniEntity;
}

export interface FriendEntity {
  id: string;
  friendId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  nickname: string | null;
  note: string | null;
  createdAt: Date;
}

export interface FriendshipStateEntity {
  state: FriendshipState;
  requestId?: string;
}
