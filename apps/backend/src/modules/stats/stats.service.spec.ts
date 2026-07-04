import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { StatsService } from './stats.service';
import { StatsRepository } from './stats.repository';
import { CacheService } from '../../providers/cache/cache.service';
import { PrismaService } from '../../providers/database/prisma.service';

describe('StatsService', () => {
  let service: StatsService;

  const mockPrismaClient = {
    user: { findUnique: jest.fn() },
    userStats: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    aquilaAnimeUserList: { findMany: jest.fn() },
    aquilaMangaUserList: { findMany: jest.fn() },
    aquilaTvUserList: { findMany: jest.fn() },
    aquilaMovieUserList: { findMany: jest.fn() },
    aquilaGameUserList: { findMany: jest.fn() },
    aquilaBookUserList: { findMany: jest.fn() },
  };

  const mockPrisma = { client: mockPrismaClient };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        StatsRepository,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
  });

  // ---------------------------------------------------------------------------
  // recalculate (debounce)
  // ---------------------------------------------------------------------------

  describe('recalculate', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should debounce multiple recalculate calls and execute doRecalculate once', async () => {
      const doRecalculateSpy = jest
        .spyOn(service, 'doRecalculate')
        .mockResolvedValue();

      service.recalculate('user-1', 'anime');
      service.recalculate('user-1', 'anime');
      service.recalculate('user-1', 'anime');

      expect(doRecalculateSpy).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(doRecalculateSpy).toHaveBeenCalledTimes(1);
      expect(doRecalculateSpy).toHaveBeenCalledWith('user-1', 'anime');
    });
  });

  // ---------------------------------------------------------------------------
  // doRecalculate
  // ---------------------------------------------------------------------------

  describe('doRecalculate', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);

      await expect(service.doRecalculate('user-1', 'anime')).rejects.toThrow(
        new NotFoundException('User with ID user-1 not found'),
      );
    });

    it('should throw Error if mediaType is unsupported', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });

      await expect(
        service.doRecalculate('user-1', 'invalid-type'),
      ).rejects.toThrow('Unsupported media type: invalid-type');
    });

    it('should calculate and upsert anime stats', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });
      mockPrismaClient.aquilaAnimeUserList.findMany.mockResolvedValue([
        {
          progress: 5,
          score: 8,
          status: 'WATCHING',
          anime: {
            episodes: 12,
            duration: 25,
            format: 'TV',
            countryOfOrigin: 'JP',
          },
        },
        {
          progress: 12,
          score: 10,
          status: 'COMPLETED',
          anime: {
            episodes: 12,
            duration: 25,
            format: 'TV',
            countryOfOrigin: 'JP',
          },
        },
      ]);
      mockPrismaClient.userStats.upsert.mockResolvedValue({});

      await service.doRecalculate('user-1', 'anime');

      expect(mockCacheService.del).toHaveBeenCalledWith('stats:testuser:anime');
      expect(mockPrismaClient.userStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_mediaType: { userId: 'user-1', mediaType: 'anime' },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          mediaType: 'anime',
          statsData: expect.objectContaining({
            count: 2,
            episodesWatched: 17,
            meanScore: 9.0,
            standardDeviation: 1.0,
          }),
        }),
        update: expect.objectContaining({
          statsData: expect.any(Object),
        }),
      });
    });

    it('should calculate and upsert manga stats', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });
      mockPrismaClient.aquilaMangaUserList.findMany.mockResolvedValue([
        {
          chapters: 15,
          volumes: 2,
          score: 7,
          status: 'READING',
          manga: {
            chapters: 50,
            volumes: 5,
            format: 'MANGA',
            countryOfOrigin: 'JP',
          },
        },
      ]);
      mockPrismaClient.userStats.upsert.mockResolvedValue({});

      await service.doRecalculate('user-1', 'manga');

      expect(mockCacheService.del).toHaveBeenCalledWith('stats:testuser:manga');
      expect(mockPrismaClient.userStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_mediaType: { userId: 'user-1', mediaType: 'manga' },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          mediaType: 'manga',
          statsData: expect.objectContaining({
            count: 1,
            chaptersRead: 15,
            volumesRead: 2,
            meanScore: 7,
            standardDeviation: 0,
          }),
        }),
        update: expect.any(Object),
      });
    });

    it('should calculate and upsert TV stats', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });
      mockPrismaClient.aquilaTvUserList.findMany.mockResolvedValue([
        {
          score: 8,
          status: 'WATCHING',
          tv: { averageRuntime: 60, originalCountry: 'US' },
          watchedEpisodes: [{ id: 'ep-1' }, { id: 'ep-2' }],
        },
      ]);
      mockPrismaClient.userStats.upsert.mockResolvedValue({});

      await service.doRecalculate('user-1', 'tv');

      expect(mockPrismaClient.userStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_mediaType: { userId: 'user-1', mediaType: 'tv' },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          mediaType: 'tv',
          statsData: expect.objectContaining({
            count: 1,
            episodesWatched: 2,
            hoursWatched: 2.0,
            meanScore: 8,
          }),
        }),
        update: expect.any(Object),
      });
    });

    it('should calculate and upsert movie stats', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });
      mockPrismaClient.aquilaMovieUserList.findMany.mockResolvedValue([
        {
          score: 9,
          status: 'COMPLETED',
          movie: { runtime: 120, originalCountry: 'FR' },
        },
      ]);
      mockPrismaClient.userStats.upsert.mockResolvedValue({});

      await service.doRecalculate('user-1', 'movie');

      expect(mockPrismaClient.userStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_mediaType: { userId: 'user-1', mediaType: 'movie' },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          mediaType: 'movie',
          statsData: expect.objectContaining({
            count: 1,
            hoursWatched: 2.0,
            meanScore: 9,
          }),
        }),
        update: expect.any(Object),
      });
    });

    it('should calculate and upsert game stats', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });
      mockPrismaClient.aquilaGameUserList.findMany.mockResolvedValue([
        {
          progress: 45,
          score: 10,
          status: 'PLAYING',
          game: { platforms: ['PC'], genres: ['RPG'] },
        },
      ]);
      mockPrismaClient.userStats.upsert.mockResolvedValue({});

      await service.doRecalculate('user-1', 'game');

      expect(mockPrismaClient.userStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_mediaType: { userId: 'user-1', mediaType: 'game' },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          mediaType: 'game',
          statsData: expect.objectContaining({
            count: 1,
            hoursPlayed: 45,
            meanScore: 10,
          }),
        }),
        update: expect.any(Object),
      });
    });

    it('should calculate and upsert book stats', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
      });
      mockPrismaClient.aquilaBookUserList.findMany.mockResolvedValue([
        {
          chapters: 10,
          volumes: 1,
          score: 8,
          status: 'COMPLETED',
          book: { pages: 300 },
        },
      ]);
      mockPrismaClient.userStats.upsert.mockResolvedValue({});

      await service.doRecalculate('user-1', 'book');

      expect(mockPrismaClient.userStats.upsert).toHaveBeenCalledWith({
        where: {
          userId_mediaType: { userId: 'user-1', mediaType: 'book' },
        },
        create: expect.objectContaining({
          userId: 'user-1',
          mediaType: 'book',
          statsData: expect.objectContaining({
            count: 1,
            chaptersRead: 10,
            volumesRead: 1,
            pagesRead: 300,
            meanScore: 8,
          }),
        }),
        update: expect.any(Object),
      });
    });
  });
});
