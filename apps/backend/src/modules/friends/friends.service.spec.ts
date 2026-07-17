import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { FriendsRepository } from './friends.repository';
import { PrismaService } from '../../providers/database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import {
  rrNotFoundException,
  rrConflictException,
  rrBadRequestException,
} from 'src/providers/error';

describe('FriendsService', () => {
  let service: FriendsService;
  let repository: FriendsRepository;
  let notificationService: NotificationService;

  const mockFriendsRepository = {
    findUserByUsername: jest.fn(),
    findUserById: jest.fn(),
    findFriendRequest: jest.fn(),
    findFriendRequestById: jest.fn(),
    createFriendRequest: jest.fn(),
    deleteFriendRequest: jest.fn(),
    createMutualFriends: jest.fn(),
    deleteMutualFriends: jest.fn(),
    findFriendships: jest.fn(),
    findFriendship: jest.fn(),
    updateFriend: jest.fn(),
  };

  const mockNotificationService = {
    create: jest.fn(),
    updateStatus: jest.fn(),
    delete: jest.fn(),
  };

  const mockPrismaService = {
    client: {
      notification: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: FriendsRepository, useValue: mockFriendsRepository },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
    repository = module.get<FriendsRepository>(FriendsRepository);
    notificationService = module.get<NotificationService>(NotificationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendFriendRequest', () => {
    it('should successfully send a request and a notification', async () => {
      // Arrange
      const userId = 'user-a';
      const targetUsername = 'bob';
      const targetUser = { id: 'user-b', username: 'bob' };
      const senderUser = { id: 'user-a', username: 'alice' };
      const createdRequest = { id: 'req-1', senderId: userId, receiverId: targetUser.id, createdAt: new Date() };

      mockFriendsRepository.findUserByUsername.mockResolvedValue(targetUser);
      mockFriendsRepository.findUserById.mockResolvedValue(senderUser);
      mockFriendsRepository.findFriendship.mockResolvedValue(null);
      mockFriendsRepository.findFriendRequest.mockResolvedValue(null);
      mockFriendsRepository.createFriendRequest.mockResolvedValue(createdRequest);

      // Act
      const result = await service.sendFriendRequest(userId, targetUsername);

      // Assert
      expect(repository.findUserByUsername).toHaveBeenCalledWith(targetUsername);
      expect(repository.createFriendRequest).toHaveBeenCalledWith(userId, targetUser.id);
      expect(notificationService.create).toHaveBeenCalledWith(targetUser.id, {
        title: 'Friend Request',
        message: '@alice sent you a friend request.',
        type: 'CONFIRMATION',
        metadata: {
          type: 'friend_request',
          requestId: createdRequest.id,
          senderUsername: 'alice',
        },
      });
      expect(result.id).toBe(createdRequest.id);
    });

    it('should throw rrNotFoundException if target user does not exist', async () => {
      mockFriendsRepository.findUserByUsername.mockResolvedValue(null);

      await expect(service.sendFriendRequest('user-a', 'nonexistent')).rejects.toThrow(rrNotFoundException);
    });

    it('should throw rrBadRequestException if trying to add yourself', async () => {
      const user = { id: 'user-a', username: 'alice' };
      mockFriendsRepository.findUserByUsername.mockResolvedValue(user);

      await expect(service.sendFriendRequest('user-a', 'alice')).rejects.toThrow(rrBadRequestException);
    });

    it('should throw rrConflictException if already friends', async () => {
      const targetUser = { id: 'user-b', username: 'bob' };
      mockFriendsRepository.findUserByUsername.mockResolvedValue(targetUser);
      mockFriendsRepository.findFriendship.mockResolvedValue({ id: 'f-1' });

      await expect(service.sendFriendRequest('user-a', 'bob')).rejects.toThrow(rrConflictException);
    });
  });

  describe('acceptRequest', () => {
    it('should create mutual friendship and approve matching pending notifications', async () => {
      // Arrange
      const requestId = 'req-1';
      const userId = 'user-b'; // receiver
      const request = { id: requestId, senderId: 'user-a', receiverId: userId };
      const pendingNotifications = [
        { id: 'notif-1', type: 'CONFIRMATION', status: 'PENDING', metadata: { type: 'friend_request', requestId } },
      ];

      mockFriendsRepository.findFriendRequestById.mockResolvedValue(request);
      mockPrismaService.client.notification.findMany.mockResolvedValue(pendingNotifications);

      // Act
      const result = await service.acceptRequest(requestId, userId);

      // Assert
      expect(repository.createMutualFriends).toHaveBeenCalledWith(request.senderId, request.receiverId, request.id);
      expect(notificationService.updateStatus).toHaveBeenCalledWith(userId, 'notif-1', 'APPROVED');
      expect(result.success).toBe(true);
    });
  });
});
