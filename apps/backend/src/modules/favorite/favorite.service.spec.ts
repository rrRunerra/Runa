import { Test, TestingModule } from '@nestjs/testing';

import { FavoriteService } from './favorite.service';
import { FavoriteRepository } from './favorite.repository';

jest.mock('@runa/database', () => ({
  FavoriteType: {
    ANIME: 'ANIME',
    MANGA: 'MANGA',
    TV: 'TV',
    MOVIE: 'MOVIE',
    GAME: 'GAME',
    BOOK: 'BOOK',
    USER: 'USER',
    CHARACTER: 'CHARACTER',
    ACTOR: 'ACTOR',
    STAFF: 'STAFF',
    STUDIO: 'STUDIO',
    MUSIC: 'MUSIC',
  },
  prisma: {
    $extends: jest.fn().mockReturnValue({}),
  },
  Prisma: {
    getExtensionContext: jest.fn(),
  },
}));

import { FavoriteType } from '@runa/database';
import { MediaStatsService } from '../list/media-stats.service';

const mockRepo = {
  findUnique: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
  findManyByUserId: jest.fn(),
  findUserByUsername: jest.fn(),
  resolveMedia: jest.fn(),
};

const mockMediaStatsService = {
  recalculateFavorites: jest.fn(),
};

describe('FavoriteService', () => {
  let service: FavoriteService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoriteService,
        { provide: FavoriteRepository, useValue: mockRepo },
        { provide: MediaStatsService, useValue: mockMediaStatsService },
      ],
    }).compile();

    service = module.get<FavoriteService>(FavoriteService);
  });

  // ---------------------------------------------------------------------------
  // addFavorite
  // ---------------------------------------------------------------------------

  describe('addFavorite', () => {
    it('should throw conflict if already favorited', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'fav-1' });

      await expect(
        service.addFavorite('user-1', {
          type: FavoriteType.ANIME,
          targetId: '10',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('should create and return entity if not yet favorited', async () => {
      mockRepo.findUnique.mockResolvedValue(null);
      const raw = {
        id: 'fav-2',
        userId: 'user-1',
        type: 'ANIME',
        mediaId: '11',
        createdAt: new Date(),
      };
      mockRepo.create.mockResolvedValue(raw);

      const result = await service.addFavorite('user-1', {
        type: FavoriteType.ANIME,
        targetId: '11',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(
        'user-1',
        FavoriteType.ANIME,
        '11',
      );
      expect(result).toMatchObject({
        targetId: '11',
        type: FavoriteType.ANIME,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // removeFavorite
  // ---------------------------------------------------------------------------

  describe('removeFavorite', () => {
    it('should return success on delete', async () => {
      mockRepo.delete.mockResolvedValue(undefined);
      const result = await service.removeFavorite(
        'user-1',
        FavoriteType.ANIME,
        '10',
      );
      expect(result).toEqual({ success: true });
    });

    it('should throw 404 if delete fails', async () => {
      mockRepo.delete.mockRejectedValue(new Error('not found'));
      await expect(
        service.removeFavorite('user-1', FavoriteType.ANIME, '10'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  // ---------------------------------------------------------------------------
  // getFavorites
  // ---------------------------------------------------------------------------

  describe('getFavorites', () => {
    it('should return mapped entities', async () => {
      const raw = [
        {
          id: 'fav-1',
          userId: 'u1',
          type: 'ANIME',
          mediaId: '5',
          createdAt: new Date(),
        },
      ];
      mockRepo.findManyByUserId.mockResolvedValue(raw);

      const result = await service.getFavorites('u1', FavoriteType.ANIME);

      expect(mockRepo.findManyByUserId).toHaveBeenCalledWith(
        'u1',
        FavoriteType.ANIME,
      );
      expect(result[0]).toMatchObject({ targetId: '5', type: 'ANIME' });
    });
  });

  // ---------------------------------------------------------------------------
  // getFavoriteStatus
  // ---------------------------------------------------------------------------

  describe('getFavoriteStatus', () => {
    it('should return favorited: true when record exists', async () => {
      mockRepo.findUnique.mockResolvedValue({ id: 'fav-1' });
      expect(
        await service.getFavoriteStatus('u1', FavoriteType.ANIME, '10'),
      ).toEqual({
        favorited: true,
      });
    });

    it('should return favorited: false when record is null', async () => {
      mockRepo.findUnique.mockResolvedValue(null);
      expect(
        await service.getFavoriteStatus('u1', FavoriteType.ANIME, '10'),
      ).toEqual({
        favorited: false,
      });
    });
  });

  // ---------------------------------------------------------------------------
  // getFavoritesByUsername
  // ---------------------------------------------------------------------------

  describe('getFavoritesByUsername', () => {
    it('should throw 404 if user not found', async () => {
      mockRepo.findUserByUsername.mockResolvedValue(null);
      await expect(
        service.getFavoritesByUsername('ghost'),
      ).rejects.toMatchObject({
        status: 404,
      });
    });

    it('should resolve media and return enriched entities', async () => {
      mockRepo.findUserByUsername.mockResolvedValue({ id: 'u1' });
      const createdAt = new Date();
      mockRepo.findManyByUserId.mockResolvedValue([
        { id: 'fav-1', userId: 'u1', type: 'ANIME', mediaId: '100', createdAt },
      ]);
      mockRepo.resolveMedia.mockResolvedValue({
        titleEnglish: 'Test Anime',
        coverImageLarge: 'http://img.test',
      });

      const result = await service.getFavoritesByUsername('testuser');

      expect(result[0]).toMatchObject({
        targetId: '100',
        title: 'Test Anime',
        image: 'http://img.test',
      });
    });

    it('should handle USER type favorites with displayName', async () => {
      mockRepo.findUserByUsername.mockResolvedValue({ id: 'u1' });
      const createdAt = new Date();
      mockRepo.findManyByUserId.mockResolvedValue([
        {
          id: 'fav-2',
          userId: 'u1',
          type: 'USER',
          mediaId: 'other-user-id',
          createdAt,
        },
      ]);
      mockRepo.resolveMedia.mockResolvedValue({
        username: 'otheruser',
        displayName: 'Other User',
        avatarUrl: 'http://avatar.test',
      });

      const result = await service.getFavoritesByUsername('testuser');

      expect(result[0]).toMatchObject({
        targetId: 'other-user-id',
        title: 'Other User',
        image: 'http://avatar.test',
      });
    });

    it('should handle CHARACTER type favorites', async () => {
      mockRepo.findUserByUsername.mockResolvedValue({ id: 'u1' });
      const createdAt = new Date();
      mockRepo.findManyByUserId.mockResolvedValue([
        { id: 'fav-3', userId: 'u1', type: 'CHARACTER', mediaId: '200', createdAt },
      ]);
      mockRepo.resolveMedia.mockResolvedValue({
        nameFirst: 'Lappland',
        nameMiddle: '',
        nameLast: 'Saluzzo',
        nameNative: '拉普兰德',
        image: 'http://lappland.img',
      });

      const result = await service.getFavoritesByUsername('testuser');

      expect(result[0]).toMatchObject({
        targetId: '200',
        title: 'Lappland Saluzzo',
        image: 'http://lappland.img',
      });
    });

    it('should handle STAFF type favorites', async () => {
      mockRepo.findUserByUsername.mockResolvedValue({ id: 'u1' });
      const createdAt = new Date();
      mockRepo.findManyByUserId.mockResolvedValue([
        { id: 'fav-4', userId: 'u1', type: 'STAFF', mediaId: '300', createdAt },
      ]);
      mockRepo.resolveMedia.mockResolvedValue({
        name: 'Aoi Yuuki',
        personName: 'Yabusaki Aoi',
        image: 'http://aoi.img',
      });

      const result = await service.getFavoritesByUsername('testuser');

      expect(result[0]).toMatchObject({
        targetId: '300',
        title: 'Aoi Yuuki',
        image: 'http://aoi.img',
      });
    });
  });
});
