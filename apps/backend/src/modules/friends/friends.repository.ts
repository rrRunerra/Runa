import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/database/prisma.service';
import type { Friend, FriendRequest, User } from '@runa/database';

@Injectable()
export class FriendsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUserByUsername(username: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { username },
    });
  }

  async findUserById(id: string): Promise<User | null> {
    return this.prisma.client.user.findUnique({
      where: { id },
    });
  }

  async findFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest | null> {
    return this.prisma.client.friendRequest.findFirst({
      where: {
        OR: [
          { senderId, receiverId },
          { senderId: receiverId, receiverId: senderId },
        ],
      },
    });
  }

  async findFriendRequestById(id: string): Promise<FriendRequest | null> {
    return this.prisma.client.friendRequest.findUnique({
      where: { id },
    });
  }

  async createFriendRequest(senderId: string, receiverId: string): Promise<FriendRequest> {
    return this.prisma.client.friendRequest.create({
      data: {
        senderId,
        receiverId,
      },
    });
  }

  async deleteFriendRequest(id: string): Promise<FriendRequest> {
    return this.prisma.client.friendRequest.delete({
      where: { id },
    });
  }

  async findIncomingRequests(userId: string): Promise<any[]> {
    return this.prisma.client.friendRequest.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOutgoingRequests(userId: string): Promise<any[]> {
    return this.prisma.client.friendRequest.findMany({
      where: { senderId: userId },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMutualFriends(userId1: string, userId2: string, requestId: string): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.friend.create({
        data: { userId: userId1, friendId: userId2 },
      }),
      this.prisma.client.friend.create({
        data: { userId: userId2, friendId: userId1 },
      }),
      this.prisma.client.friendRequest.delete({
        where: { id: requestId },
      }),
    ]);
  }

  async deleteMutualFriends(userId1: string, userId2: string): Promise<void> {
    await this.prisma.client.$transaction([
      this.prisma.client.friend.deleteMany({
        where: {
          OR: [
            { userId: userId1, friendId: userId2 },
            { userId: userId2, friendId: userId1 },
          ],
        },
      }),
    ]);
  }

  async findFriendships(userId: string): Promise<any[]> {
    return this.prisma.client.friend.findMany({
      where: { userId },
      include: {
        friend: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findFriendship(userId: string, friendId: string): Promise<Friend | null> {
    return this.prisma.client.friend.findUnique({
      where: {
        userId_friendId: {
          userId,
          friendId,
        },
      },
    });
  }

  async updateFriend(userId: string, friendId: string, data: { nickname?: string; note?: string }): Promise<Friend> {
    return this.prisma.client.friend.update({
      where: {
        userId_friendId: {
          userId,
          friendId,
        },
      },
      data,
    });
  }

  async findFriendsMediaProgress(
    mediaId: number,
    mediaType: string,
    usernames: string[],
    limit: number,
    offset: number,
  ): Promise<any[]> {
    const typeLower = mediaType.toLowerCase();
    if (typeLower === 'anime') {
      return this.prisma.client.aquilaAnimeUserListV2.findMany({
        where: { animeId: mediaId, username: { in: usernames }, private: false },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
    }
    if (typeLower === 'tv') {
      return this.prisma.client.aquilaTvUserListV2.findMany({
        where: { tvId: mediaId, username: { in: usernames }, private: false },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
    }
    if (typeLower === 'manga') {
      return this.prisma.client.aquilaMangaUserListV2.findMany({
        where: { mangaId: mediaId, username: { in: usernames }, private: false },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
    }
    if (typeLower === 'movie') {
      return this.prisma.client.aquilaMovieUserListV2.findMany({
        where: { movieId: mediaId, username: { in: usernames }, private: false },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
    }
    if (typeLower === 'game') {
      return this.prisma.client.aquilaGameUserListV2.findMany({
        where: { gameId: mediaId, username: { in: usernames }, private: false },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
    }
    if (typeLower === 'book') {
      return this.prisma.client.aquilaBookUserListV2.findMany({
        where: { bookId: mediaId, username: { in: usernames }, private: false },
        skip: offset,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      });
    }
    return [];
  }
}
