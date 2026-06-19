import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { FavoriteService } from './favorite.service';
import { PrismaService } from '../../providers/database/prisma.service';

// Mock FavoriteType enum from @runa/database
jest.mock('@runa/database', () => ({
  FavoriteType: {
    ANIME: 'ANIME',
    MANGA: 'MANGA',
    TV: 'TV',
    MOVIE: 'MOVIE',
    GAME: 'GAME',
    BOOK: 'BOOK',
  },
}));

import { FavoriteType } from '@runa/database';

describe('FavoriteService', () => {
  let service: FavoriteService;

  const mockPrismaClient = {
    favorite: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    aquilaAnime: { findUnique: jest.fn() },
    aquilaManga: { findUnique: jest.fn() },
    aquilaTv: { findUnique: jest.fn() },
    aquilaMovie: { findUnique: jest.fn() },
    aquilaGame: { findUnique: jest.fn() },
    aquilaBook: { findUnique: jest.fn() },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  describe('addFavorite', () => {
    it('should return existing favorite if already added', async () => {
      const mockExisting = { id: 'fav-1', userId: 'user-1', type: 'ANIME', mediaId: '10' };
      mockPrismaClient.favorite.findUnique.mockResolvedValue(mockExisting);

      const result = await service.addFavorite('user-1', { type: FavoriteType.ANIME, mediaId: '10' });

      expect(mockPrismaClient.favorite.findUnique).toHaveBeenCalled();
      expect(mockPrismaClient.favorite.create).not.toHaveBeenCalled();
      expect(result).toBe(mockExisting);
    });

    it('should create new favorite if it does not exist', async () => {
      mockPrismaClient.favorite.findUnique.mockResolvedValue(null);
      const mockNew = { id: 'fav-2', userId: 'user-1', type: 'ANIME', mediaId: '11' };
      mockPrismaClient.favorite.create.mockResolvedValue(mockNew);

      const result = await service.addFavorite('user-1', { type: FavoriteType.ANIME, mediaId: '11' });

      expect(mockPrismaClient.favorite.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', type: FavoriteType.ANIME, mediaId: '11' },
      });
      expect(result).toBe(mockNew);
    });
  });

  describe('removeFavorite', () => {
    it('should delete favorite and return success', async () => {
      mockPrismaClient.favorite.delete.mockResolvedValue({});

      const result = await service.removeFavorite('user-1', FavoriteType.ANIME, '10');

      expect(mockPrismaClient.favorite.delete).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });

    it('should throw NotFoundException if delete fails', async () => {
      mockPrismaClient.favorite.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.removeFavorite('user-1', FavoriteType.ANIME, '10')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFavorites', () => {
    it('should fetch favorites filtering by type if specified', async () => {
      mockPrismaClient.favorite.findMany.mockResolvedValue([]);

      const result = await service.getFavorites('user-1', FavoriteType.ANIME);

      expect(mockPrismaClient.favorite.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: FavoriteType.ANIME },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([]);
    });
  });

  describe('getFavoriteStatus', () => {
    it('should return favorited: true if record exists', async () => {
      mockPrismaClient.favorite.findUnique.mockResolvedValue({ id: 'fav-1' });

      const result = await service.getFavoriteStatus('user-1', FavoriteType.ANIME, '10');

      expect(result).toEqual({ favorited: true });
    });

    it('should return favorited: false if record does not exist', async () => {
      mockPrismaClient.favorite.findUnique.mockResolvedValue(null);

      const result = await service.getFavoriteStatus('user-1', FavoriteType.ANIME, '10');

      expect(result).toEqual({ favorited: false });
    });
  });

  describe('getFavoritesByUsername', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(service.getFavoritesByUsername('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should fetch and resolve favorites with titles and images', async () => {
      const mockUser = { id: 'user-1', username: 'testuser' };
      mockPrismaClient.user.findUnique.mockResolvedValue(mockUser);

      const mockFavorites = [
        { id: 'fav-1', userId: 'user-1', type: FavoriteType.ANIME, mediaId: '100', createdAt: new Date() },
      ];
      mockPrismaClient.favorite.findMany.mockResolvedValue(mockFavorites);

      const mockAnimeDetails = { anilistId: 100, titleEnglish: 'Anime English', coverImageLarge: 'image-large' };
      mockPrismaClient.aquilaAnime.findUnique.mockResolvedValue(mockAnimeDetails);

      const result = await service.getFavoritesByUsername('testuser', FavoriteType.ANIME);

      expect(mockPrismaClient.aquilaAnime.findUnique).toHaveBeenCalledWith({ where: { anilistId: 100 } });
      expect(result).toEqual([
        {
          id: 'fav-1',
          userId: 'user-1',
          type: FavoriteType.ANIME,
          mediaId: '100',
          createdAt: mockFavorites[0].createdAt,
          title: 'Anime English',
          image: 'image-large',
        },
      ]);
    });
  });
});
