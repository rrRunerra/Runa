import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { FriendsRepository } from './friends.repository';
import { parsePrivacy } from '../user/user.service';
import {
  rrNotFoundException,
  rrConflictException,
  rrBadRequestException,
  rrForbiddenException,
} from 'src/providers/error';
import type { FriendRequestEntity, FriendEntity, FriendshipStateEntity, UserMiniEntity } from './friends.entities';
import type { UpdateFriendDto } from './friends.dto';

@Injectable()
export class FriendsService {
  private readonly logger = new Logger(FriendsService.name);
  private readonly moduleCode = 'FsSve-';

  constructor(
    private readonly friendsRepository: FriendsRepository,
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  public async sendFriendRequest(userId: string, targetUsername: string): Promise<FriendRequestEntity> {
    const targetUser = await this.friendsRepository.findUserByUsername(targetUsername);
    if (!targetUser) {
      throw new rrNotFoundException(`${this.moduleCode}UNF001`, {
        message: `User with username ${targetUsername} not found`,
      });
    }

    if (targetUser.id === userId) {
      throw new rrBadRequestException(`${this.moduleCode}CAYAF001`, {
        message: 'Cannot add yourself as a friend',
      });
    }

    const senderUser = await this.friendsRepository.findUserById(userId);
    if (!senderUser) {
      throw new rrNotFoundException(`${this.moduleCode}UNF002`, {
        message: 'Sender user not found',
      });
    }

    const existingFriendship = await this.friendsRepository.findFriendship(userId, targetUser.id);
    if (existingFriendship) {
      throw new rrConflictException(`${this.moduleCode}YAAF001`, {
        message: 'You are already friends with this user',
      });
    }

    const existingRequest = await this.friendsRepository.findFriendRequest(userId, targetUser.id);
    if (existingRequest) {
      throw new rrConflictException(`${this.moduleCode}AFRAE001`, {
        message: 'A friend request already exists between you and this user',
      });
    }

    const request = await this.friendsRepository.createFriendRequest(userId, targetUser.id);

    // Send notification to the target user
    try {
      await this.notificationService.create(targetUser.id, {
        title: 'Friend Request',
        message: `@${senderUser.username} sent you a friend request.`,
        type: 'CONFIRMATION',
        metadata: {
          type: 'friend_request',
          requestId: request.id,
          senderUsername: senderUser.username,
        },
      });
    } catch (e) {
      this.logger.error(`Failed to send friend request notification: ${e}`);
    }

    return {
      id: request.id,
      senderId: request.senderId,
      receiverId: request.receiverId,
      createdAt: request.createdAt,
    };
  }

  public async getIncomingRequests(userId: string): Promise<FriendRequestEntity[]> {
    const records = await this.friendsRepository.findIncomingRequests(userId);
    return records.map((r) => ({
      id: r.id,
      senderId: r.senderId,
      receiverId: r.receiverId,
      createdAt: r.createdAt,
      sender: r.sender,
    }));
  }

  public async getOutgoingRequests(userId: string): Promise<FriendRequestEntity[]> {
    const records = await this.friendsRepository.findOutgoingRequests(userId);
    return records.map((r) => ({
      id: r.id,
      senderId: r.senderId,
      receiverId: r.receiverId,
      createdAt: r.createdAt,
      receiver: r.receiver,
    }));
  }

  public async acceptRequest(requestId: string, userId: string): Promise<{ success: boolean }> {
    const request = await this.friendsRepository.findFriendRequestById(requestId);
    if (!request) {
      throw new rrNotFoundException(`${this.moduleCode}FRNF001`, {
        message: 'Friend request not found',
      });
    }

    if (request.receiverId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YANA001`, {
        message: 'You are not authorized to accept this friend request',
      });
    }

    // Create mutual friends and delete the request in transaction
    await this.friendsRepository.createMutualFriends(request.senderId, request.receiverId, request.id);

    // Sync notification
    await this.updateNotificationStatus(userId, requestId, 'APPROVED');

    return { success: true };
  }

  public async declineRequest(requestId: string, userId: string): Promise<{ success: boolean }> {
    const request = await this.friendsRepository.findFriendRequestById(requestId);
    if (!request) {
      throw new rrNotFoundException(`${this.moduleCode}FRNF002`, {
        message: 'Friend request not found',
      });
    }

    if (request.receiverId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YANA002`, {
        message: 'You are not authorized to decline this friend request',
      });
    }

    await this.friendsRepository.deleteFriendRequest(requestId);

    // Sync notification
    await this.updateNotificationStatus(userId, requestId, 'DENIED');

    return { success: true };
  }

  public async cancelRequest(requestId: string, userId: string): Promise<{ success: boolean }> {
    const request = await this.friendsRepository.findFriendRequestById(requestId);
    if (!request) {
      throw new rrNotFoundException(`${this.moduleCode}FRNF003`, {
        message: 'Friend request not found',
      });
    }

    if (request.senderId !== userId) {
      throw new rrForbiddenException(`${this.moduleCode}YANA003`, {
        message: 'You are not authorized to cancel this friend request',
      });
    }

    await this.friendsRepository.deleteFriendRequest(requestId);

    // Delete receiver's notification
    try {
      const pendingNotifs = await this.prisma.client.notification.findMany({
        where: {
          userId: request.receiverId,
          status: 'PENDING',
          type: 'CONFIRMATION',
        },
      });
      const targetNotif = pendingNotifs.find((n) => {
        const meta = n.metadata as any;
        return meta && meta.type === 'friend_request' && meta.requestId === request.id;
      });
      if (targetNotif) {
        await this.notificationService.delete(request.receiverId, targetNotif.id);
      }
    } catch (e) {
      this.logger.error(`Failed to delete receiver notification on cancel: ${e}`);
    }

    return { success: true };
  }

  public async getFriends(userId: string): Promise<FriendEntity[]> {
    const friendships = await this.friendsRepository.findFriendships(userId);
    return friendships.map((f) => ({
      id: f.id,
      friendId: f.friendId,
      username: f.friend.username,
      displayName: f.friend.displayName,
      avatarUrl: f.friend.avatarUrl,
      nickname: f.nickname,
      note: f.note,
      createdAt: f.createdAt,
    }));
  }

  public async updateFriend(userId: string, friendId: string, dto: UpdateFriendDto): Promise<FriendEntity> {
    const friendship = await this.friendsRepository.findFriendship(userId, friendId);
    if (!friendship) {
      throw new rrNotFoundException(`${this.moduleCode}FNF001`, {
        message: 'Friend not found',
      });
    }

    const updated = await this.friendsRepository.updateFriend(userId, friendId, {
      nickname: dto.nickname,
      note: dto.note,
    });

    const friendUser = await this.friendsRepository.findUserById(friendId);

    return {
      id: updated.id,
      friendId: updated.friendId,
      username: friendUser?.username || '',
      displayName: friendUser?.displayName || null,
      avatarUrl: friendUser?.avatarUrl || null,
      nickname: updated.nickname,
      note: updated.note,
      createdAt: updated.createdAt,
    };
  }

  public async removeFriend(userId: string, friendId: string): Promise<{ success: boolean }> {
    const friendship = await this.friendsRepository.findFriendship(userId, friendId);
    if (!friendship) {
      throw new rrNotFoundException(`${this.moduleCode}FNF002`, {
        message: 'Friend not found',
      });
    }

    await this.friendsRepository.deleteMutualFriends(userId, friendId);
    return { success: true };
  }

  public async getPublicFriends(username: string): Promise<UserMiniEntity[]> {
    const targetUser = await this.friendsRepository.findUserByUsername(username);
    if (!targetUser) {
      throw new rrNotFoundException(`${this.moduleCode}UNF003`, {
        message: `User ${username} not found`,
      });
    }

    const privacy = parsePrivacy(targetUser.privacy);
    if (privacy.profile) {
      throw new rrForbiddenException(`${this.moduleCode}UPIP001`, {
        message: 'User profile is private',
      });
    }

    if (privacy.friends) {
      throw new rrForbiddenException(`${this.moduleCode}FLIP001`, {
        message: 'Friends list is private',
      });
    }

    const friendships = await this.friendsRepository.findFriendships(targetUser.id);
    return friendships.map((f) => ({
      id: f.friend.id,
      username: f.friend.username,
      displayName: f.friend.displayName,
      avatarUrl: f.friend.avatarUrl,
    }));
  }

  public async getFriendshipState(userId: string, targetUsername: string): Promise<FriendshipStateEntity> {
    const targetUser = await this.friendsRepository.findUserByUsername(targetUsername);
    if (!targetUser) {
      return { state: 'NONE' };
    }

    if (targetUser.id === userId) {
      return { state: 'SELF' };
    }

    const friendship = await this.friendsRepository.findFriendship(userId, targetUser.id);
    if (friendship) {
      return { state: 'FRIENDS' };
    }

    const request = await this.friendsRepository.findFriendRequest(userId, targetUser.id);
    if (request) {
      if (request.senderId === userId) {
        return { state: 'PENDING_OUTGOING', requestId: request.id };
      } else {
        return { state: 'PENDING_INCOMING', requestId: request.id };
      }
    }

    return { state: 'NONE' };
  }

  private async updateNotificationStatus(userId: string, requestId: string, status: 'APPROVED' | 'DENIED'): Promise<void> {
    try {
      const pendingNotifs = await this.prisma.client.notification.findMany({
        where: {
          userId,
          status: 'PENDING',
          type: 'CONFIRMATION',
        },
      });
      const targetNotif = pendingNotifs.find((n) => {
        const meta = n.metadata as any;
        return meta && meta.type === 'friend_request' && meta.requestId === requestId;
      });
      if (targetNotif) {
        await this.notificationService.updateStatus(userId, targetNotif.id, status);
      }
    } catch (e) {
      this.logger.error(`Failed to update notification status for request ${requestId}: ${e}`);
    }
  }

  public async getFriendsMediaProgress(
    userId: string,
    mediaId: string,
    mediaType: string,
    limit?: number,
    offset?: number,
  ): Promise<any[]> {
    const parsedMediaId = parseInt(mediaId, 10);
    if (isNaN(parsedMediaId)) {
      throw new rrBadRequestException(`${this.moduleCode}IVID001`, {
        message: 'Invalid media ID, must be an integer',
      });
    }

    // Get list of friends first
    const friendships = await this.friendsRepository.findFriendships(userId);
    if (friendships.length === 0) {
      return [];
    }

    // Map friend usernames and store their user info
    const friendsMap = new Map<string, { id: string; username: string; displayName: string | null; avatarUrl: string | null; nickname: string | null }>();
    for (const f of friendships) {
      friendsMap.set(f.friend.username, {
        id: f.friend.id,
        username: f.friend.username,
        displayName: f.friend.displayName,
        avatarUrl: f.friend.avatarUrl,
        nickname: f.nickname || null,
      });
    }

    const usernames = Array.from(friendsMap.keys());
    const queryLimit = limit !== undefined ? limit : 5;
    const queryOffset = offset !== undefined ? offset : 0;

    const entries = await this.friendsRepository.findFriendsMediaProgress(
      parsedMediaId,
      mediaType,
      usernames,
      queryLimit,
      queryOffset,
    );

    return entries.map((entry) => {
      const friendInfo = friendsMap.get(entry.username);
      return {
        id: entry.id,
        username: entry.username,
        status: entry.status,
        progress: entry.progress ?? entry.chapters ?? null,
        volumes: entry.volumes ?? null,
        score: entry.score ?? null,
        updatedAt: entry.updatedAt,
        friend: friendInfo ? {
          id: friendInfo.id,
          username: friendInfo.username,
          displayName: friendInfo.displayName,
          avatarUrl: friendInfo.avatarUrl,
          nickname: friendInfo.nickname,
        } : null,
      };
    });
  }
}
