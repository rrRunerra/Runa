import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PolarisService } from './polaris.service';
import { PrismaService } from '../../providers/database/prisma.service';

describe('PolarisService', () => {
  let service: PolarisService;

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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolarisService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PolarisService>(PolarisService);
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
      expect(result.id).toBe('bookmark-2');
    });
  });

  describe('getBookmarks', () => {
    it('should retrieve bookmarks list for a user sorted by createdAt desc', async () => {
      const mockList = [{ id: 'bookmark-1', createdAt: new Date() }];
      mockPrismaClient.polarisUserBookMarks.findMany.mockResolvedValue(mockList);

      const result = await service.getBookmarks('user-1');

      expect(mockPrismaClient.polarisUserBookMarks.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
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
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if bookmark is not found or not owned by user', async () => {
      mockPrismaClient.polarisUserBookMarks.findFirst.mockResolvedValue(null);

      await expect(service.deleteBookmark('user-1', 'bookmark-1')).rejects.toThrow(
        new NotFoundException('Bookmark with ID bookmark-1 not found'),
      );
      expect(mockPrismaClient.polarisUserBookMarks.delete).not.toHaveBeenCalled();
    });
  });
});
