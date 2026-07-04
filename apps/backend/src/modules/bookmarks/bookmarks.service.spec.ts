import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { CacheService } from '../../providers/cache/cache.service';
import { NotificationGateway } from '../notification/notification.gateway';

describe('BookmarksService', () => {
  let service: BookmarksService;

  const mockPrismaClient = {
    polarisUserBookMarks: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockNotificationGateway = {
    sendToUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCache.get.mockResolvedValue(null);
    mockCache.set.mockResolvedValue(undefined);
    mockCache.del.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCache },
        { provide: NotificationGateway, useValue: mockNotificationGateway },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
  });

  describe('createOrUpdateBookmark', () => {
    const dto = {
      name: 'Test Bookmark',
      description: 'Bookmark Description',
      redirect: 'https://runa.com',
      stars: [4],
      connections: [] as number[][],
      icon: 'bookmark-icon',
      connectionColor: '#ff0000',
      starColor: '#00ff00',
    };

    it('should update bookmark if it already exists', async () => {
      const existing = { id: 'bookmark-1', name: 'Test Bookmark', userId: 'user-1' };
      mockPrismaClient.polarisUserBookMarks.findFirst.mockResolvedValue(existing);
      mockPrismaClient.polarisUserBookMarks.update.mockResolvedValue({ id: 'bookmark-1', ...dto });

      const result = await service.createOrUpdateBookmark('user-1', dto);

      expect(mockPrismaClient.polarisUserBookMarks.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-1', name: 'Test Bookmark' },
      });
      expect(mockPrismaClient.polarisUserBookMarks.update).toHaveBeenCalledWith({
        where: { id: 'bookmark-1' },
        data: {
          description: dto.description,
          redirect: dto.redirect,
          stars: dto.stars,
          connections: dto.connections,
          icon: dto.icon,
          connectionColor: dto.connectionColor,
          starColor: dto.starColor,
        },
      });
      expect(mockCache.del).toHaveBeenCalled();
      expect(result.id).toBe('bookmark-1');
    });

    it('should create new bookmark if it does not exist', async () => {
      mockPrismaClient.polarisUserBookMarks.findFirst.mockResolvedValue(null);
      mockPrismaClient.polarisUserBookMarks.create.mockResolvedValue({ id: 'bookmark-2', ...dto });

      const result = await service.createOrUpdateBookmark('user-1', dto);

      expect(mockPrismaClient.polarisUserBookMarks.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: dto.name,
          description: dto.description,
          redirect: dto.redirect,
          stars: dto.stars,
          connections: dto.connections,
          icon: dto.icon,
          connectionColor: dto.connectionColor,
          starColor: dto.starColor,
        },
      });
      expect(mockCache.del).toHaveBeenCalled();
      expect(result.id).toBe('bookmark-2');
    });
  });

  describe('getBookmarks', () => {
    it('should return cached bookmarks if available', async () => {
      const cached = [{ id: 'bookmark-1' }];
      mockCache.get.mockResolvedValue(cached);

      const result = await service.getBookmarks('user-1');

      expect(mockCache.get).toHaveBeenCalled();
      expect(mockPrismaClient.polarisUserBookMarks.findMany).not.toHaveBeenCalled();
      expect(result).toBe(cached);
    });

    it('should retrieve bookmarks list for a user sorted by createdAt desc and cache result', async () => {
      const mockList = [{ id: 'bookmark-1', createdAt: new Date() }];
      mockPrismaClient.polarisUserBookMarks.findMany.mockResolvedValue(mockList);

      const result = await service.getBookmarks('user-1');

      expect(mockPrismaClient.polarisUserBookMarks.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(mockCache.set).toHaveBeenCalled();
      expect(result).toBe(mockList);
    });
  });

  describe('deleteBookmark', () => {
    it('should successfully delete an existing bookmark owned by user', async () => {
      const bookmark = { id: 'bookmark-1', userId: 'user-1' };
      mockPrismaClient.polarisUserBookMarks.findFirst.mockResolvedValue(bookmark);
      mockPrismaClient.polarisUserBookMarks.delete.mockResolvedValue({});

      const result = await service.deleteBookmark('user-1', 'bookmark-1');

      expect(mockPrismaClient.polarisUserBookMarks.findFirst).toHaveBeenCalledWith({
        where: { id: 'bookmark-1', userId: 'user-1' },
      });
      expect(mockPrismaClient.polarisUserBookMarks.delete).toHaveBeenCalledWith({
        where: { id: 'bookmark-1' },
      });
      expect(mockCache.del).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if bookmark is not found or not owned by user', async () => {
      mockPrismaClient.polarisUserBookMarks.findFirst.mockResolvedValue(null);

      await expect(service.deleteBookmark('user-1', 'bookmark-1')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrismaClient.polarisUserBookMarks.delete).not.toHaveBeenCalled();
    });
  });
});
