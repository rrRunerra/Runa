import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ListService } from './list.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { StatsService } from '../stats/stats.service';
import { ListExternal } from './list.external';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';
import { AnimeService } from '../anime/anime.service';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaService } from '../manga/manga.service';
import { GameService } from '../game/game.service';
import { BookService } from '../book/book.service';
import { NotificationService } from '../notification/notification.service';
import { MediaStatsService } from './media-stats.service';

jest.mock('@runa/database', () => ({
  prisma: {
    $extends: jest.fn(() => ({})),
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
  $Enums: {
    AnimeListStatus: {
      WATCHING: 'WATCHING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
      PLANNING: 'PLANNING',
    },
    MangaListStatus: {
      READING: 'READING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
      PLANNING: 'PLANNING',
    },
    MovieListStatus: {
      PLANNING: 'PLANNING',
      WATCHING: 'WATCHING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
    },
    TvListStatus: {
      PLANNING: 'PLANNING',
      WATCHING: 'WATCHING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
    },
    GameListStatus: {
      PLANNING: 'PLANNING',
      PLAYING: 'PLAYING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
    },
    BookListStatus: {
      PLANNING: 'PLANNING',
      READING: 'READING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
    },
  },
}));

import { $Enums } from '@runa/database';

describe('ListService', () => {
  let service: ListService;

  const createModelMock = () => ({
    paginate: jest.fn().mockResolvedValue({
      data: [],
      pageInfo: { nextCursor: null, hasMore: false, count: 0 },
    }),
    findMany: jest.fn().mockResolvedValue([]),
    findFirst: jest.fn().mockResolvedValue(null),
    findUnique: jest.fn().mockResolvedValue(null),
    upsert: jest.fn().mockResolvedValue({}),
    create: jest.fn().mockResolvedValue({}),
    delete: jest.fn().mockResolvedValue({}),
    groupBy: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({}),
    count: jest.fn().mockResolvedValue(0),
  });

  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    aquilaAnimeUserListV2: createModelMock(),
    aquilaMangaUserListV2: createModelMock(),
    aquilaMovieUserListV2: createModelMock(),
    aquilaTvUserListV2: createModelMock(),
    aquilaGameUserListV2: createModelMock(),
    aquilaBookUserListV2: createModelMock(),
    aquilaTvWatchedEpisodeV2: {
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
  };

  const mockPrisma = {
    client: mockPrismaClient,
  };

  const mockConnectionsManager = {
    syncAnime: jest.fn().mockResolvedValue({}),
    deleteAnime: jest.fn().mockResolvedValue({}),
    syncManga: jest.fn().mockResolvedValue({}),
    deleteManga: jest.fn().mockResolvedValue({}),
    syncMovie: jest.fn().mockResolvedValue({}),
    deleteMovie: jest.fn().mockResolvedValue({}),
    syncTv: jest.fn().mockResolvedValue({}),
    deleteTv: jest.fn().mockResolvedValue({}),
  };

  const mockStatsService = {
    recalculate: jest.fn(),
  };

  const mockMovieService = { ensureMovie: jest.fn().mockResolvedValue({ id: 1 }) };
  const mockTvService = { ensureTv: jest.fn().mockResolvedValue({ id: 1 }) };
  const mockAnimeService = { ensureAnime: jest.fn().mockResolvedValue({ id: 1 }) };
  const mockAnimeQueueService = { addUpsertJob: jest.fn().mockResolvedValue(undefined) };
  const mockMangaService = { ensureManga: jest.fn().mockResolvedValue({ id: 1 }) };
  const mockGameService = { ensureGame: jest.fn().mockResolvedValue({ id: 1 }) };
  const mockBookService = { ensureBook: jest.fn().mockResolvedValue({ id: 1 }) };
  const mockNotificationService = { create: jest.fn().mockResolvedValue({}) };
  const mockMediaStatsService = {
    updateStatsIncremental: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ListExternal, useValue: mockConnectionsManager },
        { provide: StatsService, useValue: mockStatsService },
        { provide: MovieService, useValue: mockMovieService },
        { provide: TvService, useValue: mockTvService },
        { provide: AnimeService, useValue: mockAnimeService },
        { provide: AnimeQueueService, useValue: mockAnimeQueueService },
        { provide: MangaService, useValue: mockMangaService },
        { provide: GameService, useValue: mockGameService },
        { provide: BookService, useValue: mockBookService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: MediaStatsService, useValue: mockMediaStatsService },
      ],
    }).compile();

    service = module.get<ListService>(ListService);
  });

  describe('getUserId', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      await expect(
        service.upsertAnimeList('testuser', { animeId: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAnimeList', () => {
    it('should throw NotFoundException if user not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      await expect(service.getAnimeList('testuser')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if list is private and requester is not owner', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        privacy: { animeList: true },
      });
      await expect(
        service.getAnimeList('testuser', 'otheruser'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return paginated list and status counts if authorized', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        privacy: { animeList: false },
      });
      const mockList = [
        {
          id: 5,
          animeId: 1,
          status: 'WATCHING',
          progress: 5,
          score: 8,
          updatedAt: new Date(),
          createdAt: new Date(),
          anime: {
            titlePrimary: 'Anime English',
            titleSecondary: null,
            titleNative: null,
            coverImage: 'image-url',
            episodeCount: 12,
            format: 'TV',
            status: 'FINISHED',
          },
        },
      ];
      mockPrismaClient.aquilaAnimeUserListV2.paginate.mockResolvedValue({
        data: mockList,
        pageInfo: { nextCursor: null, hasMore: false, count: 1 },
      });
      mockPrismaClient.aquilaAnimeUserListV2.groupBy.mockResolvedValue([
        { status: 'WATCHING', _count: { status: 1 } },
      ]);

      const result = await service.getAnimeList('testuser', 'otheruser', {
        status: 'watching',
        search: 'Anime',
        format: 'TV',
        sort: 'title',
      });

      expect(result.entries[0].title).toBe('Anime English');
      expect(result.counts).toEqual({ all: 1, watching: 1 });
      expect(result.pageInfo).toEqual({ nextCursor: null, hasMore: false, count: 1 });
      expect(mockPrismaClient.aquilaAnimeUserListV2.paginate).toHaveBeenCalled();
    });
  });

  describe('getAnimeListEntry', () => {
    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaClient.aquilaAnimeUserListV2.findUnique.mockResolvedValue(null);
      await expect(service.getAnimeListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return entry if found', async () => {
      const entry = { animeId: 1, status: 'WATCHING' };
      mockPrismaClient.aquilaAnimeUserListV2.findUnique.mockResolvedValue(entry);
      const result = await service.getAnimeListEntry('testuser', 1);
      expect(result).toBe(entry);
    });
  });

  describe('upsertAnimeList', () => {
    it('should successfully upsert anime list entry and recalculate stats', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaAnimeUserListV2.upsert.mockResolvedValue({});

      const result = await service.upsertAnimeList('testuser', {
        animeId: 1,
        status: $Enums.AnimeListStatus.WATCHING,
        updateConnection: true,
        connections: { anilist: 100 },
      });

      expect(result).toEqual({
        success: true,
        message: 'Anime list updated successfully',
      });
      expect(mockPrismaClient.aquilaAnimeUserListV2.upsert).toHaveBeenCalled();
      expect(mockConnectionsManager.syncAnime).toHaveBeenCalledWith(
        'anilist',
        'testuser',
        100,
        expect.any(Object),
      );
      expect(mockStatsService.recalculate).toHaveBeenCalledWith(
        'user-1',
        'anime',
      );
    });

    it('should handle errors and return failure status', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaAnimeUserListV2.upsert.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.upsertAnimeList('testuser', { animeId: 1 });
      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to update anime list');
    });
  });

  describe('deleteAnimeList', () => {
    it('should successfully delete anime list entry', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaAnimeUserListV2.findUnique.mockResolvedValue({
        connections: { mal: 200 },
      });
      mockPrismaClient.aquilaAnimeUserListV2.delete.mockResolvedValue({});
      mockConnectionsManager.deleteAnime.mockResolvedValue({});

      const result = await service.deleteAnimeList('testuser', 1);

      expect(result.success).toBe(true);
      expect(mockPrismaClient.aquilaAnimeUserListV2.delete).toHaveBeenCalled();
      expect(mockConnectionsManager.deleteAnime).toHaveBeenCalledWith(
        'mal',
        'testuser',
        200,
      );
      expect(mockStatsService.recalculate).toHaveBeenCalledWith(
        'user-1',
        'anime',
      );
    });

    it('should return failure if deletion fails', async () => {
      mockPrismaClient.aquilaAnimeUserListV2.findUnique.mockRejectedValue(
        new Error('Fail'),
      );
      const result = await service.deleteAnimeList('testuser', 1);
      expect(result.success).toBe(false);
    });
  });

  describe('Manga Operations', () => {
    it('should get manga list and status counts', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaMangaUserListV2.paginate.mockResolvedValue({
        data: [
          {
            id: 10,
            mangaId: 10,
            status: 'READING',
            chaptersProgress: 5,
            volumesProgress: 1,
            score: 10,
            updatedAt: new Date(),
            createdAt: new Date(),
            manga: {
              titlePrimary: 'Manga Primary',
              titleSecondary: null,
              titleNative: null,
              coverImage: '',
              chapterCount: 20,
              format: 'MANGA',
            },
          },
        ],
        pageInfo: { nextCursor: null, hasMore: false, count: 1 },
      });
      mockPrismaClient.aquilaMangaUserListV2.groupBy.mockResolvedValue([]);

      const result = await service.getMangaList('testuser', 'testuser');
      expect(result.entries[0].title).toBe('Manga Primary');
    });

    it('should throw NotFoundException on getMangaListEntry if not found', async () => {
      mockPrismaClient.aquilaMangaUserListV2.findUnique.mockResolvedValue(null);
      await expect(service.getMangaListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upsert manga list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaMangaUserListV2.upsert.mockResolvedValue({});

      const result = await service.upsertMangaList('testuser', {
        mangaId: 1,
        status: $Enums.MangaListStatus.READING,
      });

      expect(result.success).toBe(true);
    });

    it('should delete manga list entry successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaMangaUserListV2.findUnique.mockResolvedValue({
        connections: { mal: 200 },
      });
      mockPrismaClient.aquilaMangaUserListV2.delete.mockResolvedValue({});

      const result = await service.deleteMangaList('testuser', 1);
      expect(result.success).toBe(true);
    });
  });

  describe('Movie Operations', () => {
    it('should get movie list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaMovieUserListV2.paginate.mockResolvedValue({
        data: [
          {
            id: 1,
            movieId: 1,
            status: 'COMPLETED',
            score: 8,
            updatedAt: new Date(),
            createdAt: new Date(),
            movie: {
              titlePrimary: 'Movie Title',
              titleSecondary: null,
              coverImage: '',
            },
          },
        ],
        pageInfo: { nextCursor: null, hasMore: false, count: 1 },
      });

      const result = await service.getMovieList('testuser');
      expect(result.entries[0].title).toBe('Movie Title');
    });

    it('should throw NotFoundException on getMovieListEntry if not found', async () => {
      mockPrismaClient.aquilaMovieUserListV2.findUnique.mockResolvedValue(null);
      await expect(service.getMovieListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('TV Operations', () => {
    it('should get TV list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaTvUserListV2.paginate.mockResolvedValue({
        data: [
          {
            id: 1,
            tvId: 1,
            status: 'WATCHING',
            score: 7,
            updatedAt: new Date(),
            createdAt: new Date(),
            tv: {
              titlePrimary: 'TV Show',
              titleSecondary: null,
              coverImage: '',
              episodeCount: 10,
            },
          },
        ],
        pageInfo: { nextCursor: null, hasMore: false, count: 1 },
      });

      const result = await service.getTvList('testuser');
      expect(result.entries[0].title).toBe('TV Show');
      expect(result.entries[0].episodes).toBe(10);
    });

    it('should toggle episode watched', async () => {
      mockPrismaClient.aquilaTvUserListV2.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        tvId: 123,
      });
      mockPrismaClient.aquilaTvWatchedEpisodeV2.findUnique.mockResolvedValue(null);
      mockPrismaClient.aquilaTvWatchedEpisodeV2.create.mockResolvedValue({});
      mockPrismaClient.aquilaTvWatchedEpisodeV2.count.mockResolvedValue(1);

      const result = await service.toggleEpisodeWatched('testuser', 123, 1, 2);
      expect(result.watched).toBe(true);
    });

    it('should toggle season watched with objects or numbers', async () => {
      mockPrismaClient.aquilaTvUserListV2.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        tvId: 123,
      });
      mockPrismaClient.aquilaTvWatchedEpisodeV2.createMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.aquilaTvWatchedEpisodeV2.count.mockResolvedValue(2);

      const result = await service.toggleSeasonWatched(
        'testuser',
        123,
        1,
        [{ number: 1 }, { episodeNum: 2 }, 3],
        true,
      );

      expect(mockPrismaClient.aquilaTvWatchedEpisodeV2.createMany).toHaveBeenCalledWith({
        data: [
          { listId: 1, seasonNum: 1, episodeNum: 1 },
          { listId: 1, seasonNum: 1, episodeNum: 2 },
          { listId: 1, seasonNum: 1, episodeNum: 3 },
        ],
        skipDuplicates: true,
      });
      expect(result.count).toBe(2);
    });

    it('should delete season watched when watched is false', async () => {
      mockPrismaClient.aquilaTvUserListV2.findUnique.mockResolvedValue({
        id: 1,
        username: 'testuser',
        tvId: 123,
      });
      mockPrismaClient.aquilaTvWatchedEpisodeV2.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaClient.aquilaTvWatchedEpisodeV2.count.mockResolvedValue(0);

      const result = await service.toggleSeasonWatched('testuser', 123, 1, [], false);
      expect(mockPrismaClient.aquilaTvWatchedEpisodeV2.deleteMany).toHaveBeenCalledWith({
        where: { listId: 1, seasonNum: 1 },
      });
      expect(result.count).toBe(0);
    });
  });

  describe('Game Operations', () => {
    it('should get game list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaGameUserListV2.findMany.mockResolvedValueOnce([
        {
          id: 1,
          gameId: 1,
          status: 'PLAYING',
          progress: 10,
          score: 9,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: {
            titlePrimary: 'Witcher 3',
            coverImage: '',
          },
        },
      ]);

      const result = await service.getGameList('testuser');
      expect(result.entries[0].title).toBe('Witcher 3');
    });
  });

  describe('Book Operations', () => {
    it('should get book list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaBookUserListV2.findMany.mockResolvedValueOnce([
        {
          id: 1,
          bookId: 1,
          status: 'READING',
          progressChapters: 5,
          score: 8,
          updatedAt: new Date(),
          createdAt: new Date(),
          book: {
            titlePrimary: 'Book One',
            coverImage: '',
          },
        },
      ]);

      const result = await service.getBookList('testuser');
      expect(result.entries[0].title).toBe('Book One');
    });
  });

  describe('Radarr / Sonarr Operations', () => {
    it('should format getRadarrMovieList correctly with real tmdbId and imdbId, not tvDBId', async () => {
      mockPrismaClient.aquilaMovieUserListV2.findMany.mockResolvedValue([
        {
          id: 10,
          status: 'PLANNING',
          movie: {
            titlePrimary: 'Inception',
            tvDBId: 78901,
            imdbId: 'tt1375666',
            tmdbId: 27205,
            releaseDateYear: 2010,
            sources: [{ provider: 'TMDB', externalId: '27205' }],
          },
        },
        {
          id: 11,
          status: 'COMPLETED',
          movie: {
            titlePrimary: 'Matrix',
            tvDBId: 54321,
            imdbId: 'tt0133093',
            tmdbId: null,
            releaseDateYear: 1999,
            sources: null,
          },
        },
      ]);

      const result = await service.getRadarrMovieList('testuser');
      expect(mockPrismaClient.aquilaMovieUserListV2.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser', status: 'PLANNING' },
        include: { movie: true },
      });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        title: 'Inception',
        imdbId: 'tt1375666',
        tmdbId: 27205,
        year: 2010,
        hasFile: false,
        monitored: true,
      });
      // Matrix has no tmdbId in record or sources, so tmdbId should be undefined (not tvDBId 54321!)
      expect(result[1]).toEqual({
        title: 'Matrix',
        imdbId: 'tt0133093',
        tmdbId: undefined,
        year: 1999,
        hasFile: true,
        monitored: true,
      });
    });
    it('should handle fetchSonarrSeries for anime without tvDBId by notifying user and queuing update', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-123' });
      mockPrismaClient.aquilaAnimeUserListV2.findMany.mockResolvedValue([
        {
          id: 1,
          anime: {
            id: 101,
            anilistId: 101,
            titlePrimary: 'Naruto',
            tvDBId: 78857,
          },
        },
        {
          id: 2,
          anime: {
            id: 102,
            anilistId: 102,
            titlePrimary: 'Bleach',
            tvDBId: null,
          },
        },
      ]);

      const result = await service.fetchSonarrSeries('testuser', false, true);
      expect(result).toEqual([
        {
          title: 'Naruto',
          tvdbId: 78857,
          monitored: true,
        },
      ]);
      expect(mockNotificationService.create).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          title: 'Missing TVDB ID for Anime',
          message: expect.stringContaining('Bleach'),
        }),
      );
      expect(mockAnimeQueueService.addUpsertJob).toHaveBeenCalledWith(102, {
        force: true,
        skipRelations: true,
      });
    });
  });

  describe('getUserListFilters', () => {
    it('should aggregate genres, formats, years, and statuses for anime list', async () => {
      mockPrismaClient.aquilaAnimeUserListV2.findMany.mockResolvedValue([
        {
          anime: {
            genres: ['Action', 'Adventure'],
            format: 'TV',
            startDateYear: 2021,
            status: 'FINISHED',
          },
        },
        {
          anime: {
            genres: ['Action', 'Fantasy'],
            format: 'MOVIE',
            startDateYear: 2023,
            status: 'RELEASING',
          },
        },
      ]);

      const result = await service.getUserListFilters('testuser', 'anime');

      expect(mockPrismaClient.aquilaAnimeUserListV2.findMany).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: {
          anime: {
            select: {
              genres: true,
              format: true,
              startDateYear: true,
              status: true,
            },
          },
        },
      });

      expect(result).toEqual({
        genres: ['Action', 'Adventure', 'Fantasy'],
        formats: ['MOVIE', 'TV'],
        years: [2023, 2021],
        statuses: ['FINISHED', 'RELEASING'],
      });
    });
  });

  describe('Status-ordered Media List Pagination (All Tab)', () => {
    it('should fetch across status groups in prioritized order (Playing -> On Hold -> Completed -> Dropped -> Planning)', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaGameUserListV2.groupBy.mockResolvedValue([
        { status: 'PLAYING', _count: { status: 2 } },
        { status: 'ON_HOLD', _count: { status: 1 } },
        { status: 'COMPLETED', _count: { status: 5 } },
      ]);

      // First status PLAYING returns 2 items
      mockPrismaClient.aquilaGameUserListV2.findMany.mockResolvedValueOnce([
        {
          id: 10,
          gameId: 101,
          status: 'PLAYING',
          progress: 5,
          score: 9,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game Playing 1', coverImage: '' },
        },
        {
          id: 11,
          gameId: 102,
          status: 'PLAYING',
          progress: 8,
          score: 8,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game Playing 2', coverImage: '' },
        },
      ]);

      // Second status ON_HOLD returns 1 item
      mockPrismaClient.aquilaGameUserListV2.findMany.mockResolvedValueOnce([
        {
          id: 20,
          gameId: 201,
          status: 'ON_HOLD',
          progress: 2,
          score: 7,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game On Hold 1', coverImage: '' },
        },
      ]);

      // Third status COMPLETED returns 2 items
      mockPrismaClient.aquilaGameUserListV2.findMany.mockResolvedValueOnce([
        {
          id: 30,
          gameId: 301,
          status: 'COMPLETED',
          progress: 50,
          score: 10,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game Completed 1', coverImage: '' },
        },
        {
          id: 31,
          gameId: 302,
          status: 'COMPLETED',
          progress: 30,
          score: 9,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game Completed 2', coverImage: '' },
        },
      ]);

      // Fourth status DROPPED returns 0
      mockPrismaClient.aquilaGameUserListV2.findMany.mockResolvedValueOnce([]);
      // Fifth status PLANNING returns 0
      mockPrismaClient.aquilaGameUserListV2.findMany.mockResolvedValueOnce([]);

      const result = await service.getGameList('testuser', undefined, {
        limit: 30,
      });

      expect(result.entries).toHaveLength(5);
      expect(result.entries[0].status).toBe('PLAYING');
      expect(result.entries[1].status).toBe('PLAYING');
      expect(result.entries[2].status).toBe('ON_HOLD');
      expect(result.entries[3].status).toBe('COMPLETED');
      expect(result.entries[4].status).toBe('COMPLETED');
      expect(result.pageInfo.hasMore).toBe(false);
      expect(result.pageInfo.nextCursor).toBeNull();
    });

    it('should paginate with compound cursor s_{statusIndex}_{id} when page limit is reached', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaGameUserListV2.groupBy.mockResolvedValue([]);

      // Status PLAYING returns 3 items when limit is 2 -> slice to 2 and set nextCursor
      mockPrismaClient.aquilaGameUserListV2.findMany.mockResolvedValueOnce([
        {
          id: 10,
          gameId: 101,
          status: 'PLAYING',
          progress: 5,
          score: 9,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game Playing 1', coverImage: '' },
        },
        {
          id: 11,
          gameId: 102,
          status: 'PLAYING',
          progress: 8,
          score: 8,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game Playing 2', coverImage: '' },
        },
        {
          id: 12,
          gameId: 103,
          status: 'PLAYING',
          progress: 3,
          score: 7,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: { titlePrimary: 'Game Playing 3', coverImage: '' },
        },
      ]);

      const result = await service.getGameList('testuser', undefined, {
        limit: 2,
      });

      expect(result.entries).toHaveLength(2);
      expect(result.pageInfo.hasMore).toBe(true);
      expect(result.pageInfo.nextCursor).toBe('s_0_11');
    });
  });
});
