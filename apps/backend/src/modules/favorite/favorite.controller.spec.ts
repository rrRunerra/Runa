import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { FavoriteController } from './favorite.controller';
import { FavoriteService } from './favorite.service';
import { DualAuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

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

describe('FavoriteController', () => {
  let controller: FavoriteController;
  let service: FavoriteService;

  const mockFavoriteService = {
    addFavorite: jest.fn(),
    removeFavorite: jest.fn(),
    getFavorites: jest.fn(),
    getFavoritesByUsername: jest.fn(),
    getFavoriteStatus: jest.fn(),
  };

  const mockDualAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FavoriteController],
      providers: [
        { provide: FavoriteService, useValue: mockFavoriteService },
        Reflector,
      ],
    })
      .overrideGuard(DualAuthGuard)
      .useValue(mockDualAuthGuard)
      .compile();

    controller = module.get<FavoriteController>(FavoriteController);
    service = module.get<FavoriteService>(FavoriteService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('addFavorite', () => {
    it('should call favoriteService.addFavorite', async () => {
      const mockReq = { user: { id: 'user-123' } };
      const dto = { type: 'ANIME' as any, mediaId: '1' };
      mockFavoriteService.addFavorite.mockResolvedValue({ id: 'fav-1' });

      const result = await controller.addFavorite(mockReq, dto);

      expect(service.addFavorite).toHaveBeenCalledWith('user-123', dto);
      expect(result).toEqual({ id: 'fav-1' });
    });
  });

  describe('removeFavorite', () => {
    it('should throw BadRequestException if type is invalid', async () => {
      const mockReq = { user: { id: 'user-123' } };
      await expect(controller.removeFavorite(mockReq, 'INVALID_TYPE', '1')).rejects.toThrow(BadRequestException);
    });

    it('should call favoriteService.removeFavorite with valid inputs', async () => {
      const mockReq = { user: { id: 'user-123' } };
      mockFavoriteService.removeFavorite.mockResolvedValue({ success: true });

      const result = await controller.removeFavorite(mockReq, 'anime', '1');

      expect(service.removeFavorite).toHaveBeenCalledWith('user-123', 'ANIME', '1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getFavorites', () => {
    it('should return favorites for current user', async () => {
      const mockReq = { user: { id: 'user-123' } };
      mockFavoriteService.getFavorites.mockResolvedValue([]);

      const result = await controller.getFavorites(mockReq, 'anime');

      expect(service.getFavorites).toHaveBeenCalledWith('user-123', 'ANIME');
      expect(result).toEqual([]);
    });
  });

  describe('getUserFavorites', () => {
    it('should return favorites by username', async () => {
      mockFavoriteService.getFavoritesByUsername.mockResolvedValue([]);

      const result = await controller.getUserFavorites('testuser', 'manga');

      expect(service.getFavoritesByUsername).toHaveBeenCalledWith('testuser', 'MANGA');
      expect(result).toEqual([]);
    });
  });

  describe('getFavoriteStatus', () => {
    it('should return check status for a media item', async () => {
      const mockReq = { user: { id: 'user-123' } };
      mockFavoriteService.getFavoriteStatus.mockResolvedValue({ favorited: true });

      const result = await controller.getFavoriteStatus(mockReq, 'movie', '2');

      expect(service.getFavoriteStatus).toHaveBeenCalledWith('user-123', 'MOVIE', '2');
      expect(result).toEqual({ favorited: true });
    });
  });
});
