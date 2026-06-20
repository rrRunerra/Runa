import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { NotificationGateway } from './notification.gateway';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrismaClient = {
    notification: {
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockNotificationGateway = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('delete', () => {
    it('should delete notification if it exists and belong to the user', async () => {
      const mockNotif = { id: 'notif-1', userId: 'user-1' };
      mockPrismaClient.notification.findFirst.mockResolvedValue(mockNotif);
      mockPrismaClient.notification.delete.mockResolvedValue(mockNotif);

      await service.delete('user-1', 'notif-1');

      expect(mockPrismaClient.notification.findFirst).toHaveBeenCalledWith({
        where: { id: 'notif-1', userId: 'user-1' },
      });
      expect(mockPrismaClient.notification.delete).toHaveBeenCalledWith({
        where: { id: 'notif-1' },
      });
      expect(mockNotificationGateway.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'notification:deleted',
        { id: 'notif-1' },
      );
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      mockPrismaClient.notification.findFirst.mockResolvedValue(null);

      await expect(service.delete('user-1', 'notif-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaClient.notification.delete).not.toHaveBeenCalled();
      expect(mockNotificationGateway.sendToUser).not.toHaveBeenCalled();
    });
  });

  describe('deleteAll', () => {
    it('should delete all notifications for a user', async () => {
      mockPrismaClient.notification.deleteMany.mockResolvedValue({ count: 5 });

      await service.deleteAll('user-1');

      expect(mockPrismaClient.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(mockNotificationGateway.sendToUser).toHaveBeenCalledWith(
        'user-1',
        'notifications:cleared',
        {},
      );
    });
  });

  describe('deleteOldNotifications', () => {
    it('should delete notifications older than a week', async () => {
      mockPrismaClient.notification.deleteMany.mockResolvedValue({ count: 3 });

      const logSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.deleteOldNotifications();

      expect(mockPrismaClient.notification.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            lt: expect.any(Date),
          },
        },
      });
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Notification Cleanup] Deleted 3 notifications older than a week.'),
      );

      logSpy.mockRestore();
    });
  });
});
