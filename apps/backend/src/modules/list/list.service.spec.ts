import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ListService } from './list.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { StatsService } from '../stats/stats.service';
import { ListExternal } from './list.external';
import { MovieService } from '../movie/movie.service';
import { TvService } from '../tv/tv.service';
import { AnimeService } from '../anime/anime.service';
import { MangaService } from '../manga/manga.service';
import { GameService } from '../game/game.service';
import { BookService } from '../book/book.service';
import { NotificationService } from '../notification/notification.service';

// Mock database $Enums and prisma client
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
      PLAN_TO_WATCH: 'PLAN_TO_WATCH',
    },
    MangaListStatus: {
      READING: 'READING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
      PLAN_TO_READ: 'PLAN_TO_READ',
    },
    MovieListStatus: {
      PLAN_TO_WATCH: 'PLAN_TO_WATCH',
      WATCHING: 'WATCHING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
    },
    TvListStatus: {
      PLAN_TO_WATCH: 'PLAN_TO_WATCH',
      WATCHING: 'WATCHING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
    },
    GameListStatus: {
      PLAN_TO_PLAY: 'PLAN_TO_PLAY',
      PLAYING: 'PLAYING',
      COMPLETED: 'COMPLETED',
      ON_HOLD: 'ON_HOLD',
      DROPPED: 'DROPPED',
    },
    BookListStatus: {
      PLAN_TO_READ: 'PLAN_TO_READ',
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

  const mockPrismaClient = {
    user: {
      findUnique: jest.fn(),
    },
    aquilaAnimeUserList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    aquilaMangaUserList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    aquilaMovieUserList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    aquilaTvUserList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    aquilaGameUserList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    aquilaBookUserList: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      groupBy: jest.fn(),
      update: jest.fn(),
    },
    aquilaTvWatchedEpisode: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
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

  const mockMovieService = {
    ensureMovie: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const mockTvService = {
    ensureTv: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const mockAnimeService = {
    ensureAnime: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const mockMangaService = {
    ensureManga: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const mockGameService = {
    ensureGame: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const mockBookService = {
    ensureBook: jest.fn().mockResolvedValue({ id: 1 }),
  };
  const mockNotificationService = {
    create: jest.fn().mockResolvedValue({}),
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
        { provide: MangaService, useValue: mockMangaService },
        { provide: GameService, useValue: mockGameService },
        { provide: BookService, useValue: mockBookService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    }).compile();

    service = module.get<ListService>(ListService);
  });

  describe('getUserId', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      await expect(
        service.upsertAnimeList('testuser', { animeId: 1 }),
      ).rejects.toThrow(new NotFoundException('User testuser not found'));
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

    it('should return list and status counts if authorized', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        privacy: { animeList: false },
      });
      const mockList = [
        {
          animeId: 1,
          status: 'WATCHING',
          progress: 5,
          score: 8,
          updatedAt: new Date(),
          createdAt: new Date(),
          anime: {
            titleEnglish: 'Anime English',
            titleRomaji: null,
            titleNative: null,
            coverImageLarge: 'image-large',
            episodes: 12,
            format: 'TV',
          },
        },
      ];
      mockPrismaClient.aquilaAnimeUserList.findMany.mockResolvedValue(mockList);
      mockPrismaClient.aquilaAnimeUserList.groupBy.mockResolvedValue([
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
      expect(mockPrismaClient.aquilaAnimeUserList.findMany).toHaveBeenCalled();
    });
  });

  describe('getAnimeListEntry', () => {
    it('should throw NotFoundException if entry not found', async () => {
      mockPrismaClient.aquilaAnimeUserList.findUnique.mockResolvedValue(null);
      await expect(service.getAnimeListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return entry if found', async () => {
      const entry = { animeId: 1, status: 'WATCHING' };
      mockPrismaClient.aquilaAnimeUserList.findUnique.mockResolvedValue(entry);
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
      mockPrismaClient.aquilaAnimeUserList.upsert.mockResolvedValue({});

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
      expect(mockPrismaClient.aquilaAnimeUserList.upsert).toHaveBeenCalled();
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
      mockPrismaClient.aquilaAnimeUserList.upsert.mockRejectedValue(
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
      mockPrismaClient.aquilaAnimeUserList.findUnique.mockResolvedValue({
        connections: { mal: 200 },
      });
      mockPrismaClient.aquilaAnimeUserList.delete.mockResolvedValue({});
      mockConnectionsManager.deleteAnime.mockResolvedValue({});

      const result = await service.deleteAnimeList('testuser', 1);

      expect(result.success).toBe(true);
      expect(mockPrismaClient.aquilaAnimeUserList.delete).toHaveBeenCalled();
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
      mockPrismaClient.aquilaAnimeUserList.findUnique.mockRejectedValue(
        new Error('Fail'),
      );
      const result = await service.deleteAnimeList('testuser', 1);
      expect(result.success).toBe(false);
    });
  });

  describe('Manga Operations', () => {
    it('should get manga list and status counts', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaMangaUserList.findMany.mockResolvedValue([
        {
          mangaId: 10,
          status: 'READING',
          chapters: 5,
          volumes: 1,
          score: 10,
          updatedAt: new Date(),
          createdAt: new Date(),
          manga: {
            titleEnglish: null,
            titleRomaji: 'Manga Romaji',
            titleNative: null,
            coverImageLarge: '',
            chapters: 20,
            format: 'Manga',
          },
        },
      ]);
      mockPrismaClient.aquilaMangaUserList.groupBy.mockResolvedValue([]);

      const result = await service.getMangaList('testuser', 'testuser');
      expect(result.entries[0].title).toBe('Manga Romaji');
    });

    it('should throw NotFoundException on getMangaListEntry if not found', async () => {
      mockPrismaClient.aquilaMangaUserList.findUnique.mockResolvedValue(null);
      await expect(service.getMangaListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upsert manga list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaMangaUserList.upsert.mockResolvedValue({});

      const result = await service.upsertMangaList('testuser', {
        mangaId: 1,
        status: $Enums.MangaListStatus.READING,
        updateConnection: true,
        connections: { mal: { id: 22, chaptersOffset: 2 } as any },
      });

      expect(result.success).toBe(true);
      expect(mockConnectionsManager.syncManga).toHaveBeenCalled();
    });

    it('should delete manga list entry successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaMangaUserList.findUnique.mockResolvedValue({
        connections: { mal: 200 },
      });
      mockPrismaClient.aquilaMangaUserList.delete.mockResolvedValue({});

      const result = await service.deleteMangaList('testuser', 1);
      expect(result.success).toBe(true);
    });
  });

  describe('Movie Operations', () => {
    it('should get movie list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaMovieUserList.findMany.mockResolvedValue([
        {
          tvdbId: 1,
          status: 'COMPLETED',
          score: 8,
          updatedAt: new Date(),
          createdAt: new Date(),
          movie: {
            titleEnglish: 'Movie Title',
            titleRomaji: null,
            coverImage: '',
          },
        },
      ]);
      mockPrismaClient.aquilaMovieUserList.groupBy.mockResolvedValue([]);

      const result = await service.getMovieList('testuser');
      expect(result.entries[0].title).toBe('Movie Title');
    });

    it('should throw NotFoundException on getMovieListEntry if not found', async () => {
      mockPrismaClient.aquilaMovieUserList.findUnique.mockResolvedValue(null);
      await expect(service.getMovieListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upsert movie list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaMovieUserList.upsert.mockResolvedValue({});

      const result = await service.upsertMovieList('testuser', {
        movieId: 1,
        status: $Enums.MovieListStatus.COMPLETED,
        updateConnection: true,
        connections: { mal: 300 },
      });

      expect(result.success).toBe(true);
      expect(mockConnectionsManager.syncMovie).toHaveBeenCalled();
    });

    it('should delete movie list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaMovieUserList.findUnique.mockResolvedValue({
        connections: { mal: 300 },
      });
      mockPrismaClient.aquilaMovieUserList.delete.mockResolvedValue({});

      const result = await service.deleteMovieList('testuser', 1);
      expect(result.success).toBe(true);
    });
  });

  describe('TV Operations', () => {
    it('should get TV list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaTvUserList.findMany.mockResolvedValue([
        {
          tvdbId: 1,
          status: 'WATCHING',
          score: 7,
          updatedAt: new Date(),
          createdAt: new Date(),
          tv: {
            titleEnglish: 'TV Show',
            titleRomaji: null,
            coverImage: '',
            seasons: [{ seasonNumber: 1, episodeCount: 10 }],
          },
          _count: {
            watchedEpisodes: 3,
          },
        },
      ]);
      mockPrismaClient.aquilaTvUserList.groupBy.mockResolvedValue([]);

      const result = await service.getTvList('testuser');
      expect(result.entries[0].title).toBe('TV Show');
      expect(result.entries[0].episodes).toBe(10);
    });

    it('should throw NotFoundException on getTvListEntry if not found', async () => {
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue(null);
      await expect(service.getTvListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upsert TV list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaTvUserList.upsert.mockResolvedValue({});
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        watchedEpisodes: [],
      });

      const result = await service.upsertTvList('testuser', {
        tvId: 1,
        status: $Enums.TvListStatus.WATCHING,
        updateConnection: true,
        connections: { mal: 400 },
      });

      expect(result.success).toBe(true);
      expect(mockConnectionsManager.syncTv).toHaveBeenCalled();
    });

    it('should delete TV list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        connections: { mal: 400 },
      });
      mockPrismaClient.aquilaTvUserList.delete.mockResolvedValue({});

      const result = await service.deleteTvList('testuser', 1);
      expect(result.success).toBe(true);
    });

    it('should toggle episode watched - create watched record if it does not exist', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        id: 'list-1',
        connections: {},
      });
      mockPrismaClient.aquilaTvWatchedEpisode.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaClient.aquilaTvWatchedEpisode.create.mockResolvedValue({});

      const result = await service.toggleEpisodeWatched('testuser', 1, 1, 1);
      expect(result).toEqual({ watched: true });
      expect(mockPrismaClient.aquilaTvWatchedEpisode.create).toHaveBeenCalled();
    });

    it('should toggle episode watched - delete watched record if it exists', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        id: 'list-1',
        connections: {},
      });
      mockPrismaClient.aquilaTvWatchedEpisode.findUnique.mockResolvedValue({
        id: 'ep-1',
      });
      mockPrismaClient.aquilaTvWatchedEpisode.delete.mockResolvedValue({});

      const result = await service.toggleEpisodeWatched('testuser', 1, 1, 1);
      expect(result).toEqual({ watched: false });
      expect(mockPrismaClient.aquilaTvWatchedEpisode.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException in toggleEpisodeWatched if TV show not in list', async () => {
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue(null);
      await expect(
        service.toggleEpisodeWatched('testuser', 1, 1, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should toggle season watched to true - upsert all episodes', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        id: 'list-1',
        connections: {},
      });
      mockPrismaClient.aquilaTvWatchedEpisode.upsert.mockResolvedValue({});

      const result = await service.toggleSeasonWatched(
        'testuser',
        1,
        1,
        [{ number: 1 }, { number: 2 }],
        true,
      );
      expect(result).toEqual({ success: true });
      expect(
        mockPrismaClient.aquilaTvWatchedEpisode.upsert,
      ).toHaveBeenCalledTimes(2);
    });

    it('should toggle season watched to false - delete many episodes', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        id: 'list-1',
        connections: {},
      });
      mockPrismaClient.aquilaTvWatchedEpisode.deleteMany.mockResolvedValue({});

      const result = await service.toggleSeasonWatched(
        'testuser',
        1,
        1,
        [{ number: 1 }, { number: 2 }],
        false,
      );
      expect(result).toEqual({ success: true });
      expect(
        mockPrismaClient.aquilaTvWatchedEpisode.deleteMany,
      ).toHaveBeenCalledWith({
        where: { listId: 'list-1', seasonNum: 1 },
      });
    });
  });

  describe('Game Operations', () => {
    it('should get game list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaGameUserList.findMany.mockResolvedValue([
        {
          gameId: 1,
          status: 'PLAYING',
          progress: 10,
          score: 9,
          updatedAt: new Date(),
          createdAt: new Date(),
          game: {
            titleString: 'Witcher 3',
            coverImage: '',
          },
        },
      ]);
      mockPrismaClient.aquilaGameUserList.groupBy.mockResolvedValue([]);

      const result = await service.getGameList('testuser');
      expect(result.entries[0].title).toBe('Witcher 3');
    });

    it('should throw NotFoundException on getGameListEntry if not found', async () => {
      mockPrismaClient.aquilaGameUserList.findUnique.mockResolvedValue(null);
      await expect(service.getGameListEntry('testuser', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should upsert game list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaGameUserList.upsert.mockResolvedValue({});

      const result = await service.upsertGameList('testuser', {
        gameId: 1,
        status: $Enums.GameListStatus.PLAYING,
      });

      expect(result.success).toBe(true);
    });

    it('should delete game list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaGameUserList.delete.mockResolvedValue({});

      const result = await service.deleteGameList('testuser', 1);
      expect(result.success).toBe(true);
    });
  });

  describe('Book Operations', () => {
    it('should get book list', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ privacy: {} });
      mockPrismaClient.aquilaBookUserList.findMany.mockResolvedValue([
        {
          bookId: 'book-1',
          status: 'READING',
          chapters: 5,
          volumes: 1,
          score: 8,
          updatedAt: new Date(),
          createdAt: new Date(),
          book: {
            titleString: 'Book One',
            coverImage: '',
          },
        },
      ]);
      mockPrismaClient.aquilaBookUserList.groupBy.mockResolvedValue([]);

      const result = await service.getBookList('testuser');
      expect(result.entries[0].title).toBe('Book One');
    });

    it('should throw NotFoundException on getBookListEntry if not found', async () => {
      mockPrismaClient.aquilaBookUserList.findUnique.mockResolvedValue(null);
      await expect(
        service.getBookListEntry('testuser', 'book-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should upsert book list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: 'user-1',
        privacy: {},
      });
      mockPrismaClient.aquilaBookUserList.upsert.mockResolvedValue({});

      const result = await service.upsertBookList('testuser', {
        bookId: 'book-1',
        status: $Enums.BookListStatus.READING,
      });

      expect(result.success).toBe(true);
    });

    it('should delete book list successfully', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaBookUserList.delete.mockResolvedValue({});

      const result = await service.deleteBookList('testuser', 'book-1');
      expect(result.success).toBe(true);
    });
  });

  describe('getWatchingList', () => {
    it('should retrieve consolidated reading/watching/playing list sorted by updatedAt desc', async () => {
      const date1 = new Date('2026-06-19T10:00:00.000Z');
      const date2 = new Date('2026-06-19T12:00:00.000Z');

      mockPrismaClient.aquilaAnimeUserList.findMany.mockResolvedValue([
        {
          animeId: 1,
          score: 9,
          progress: 4,
          updatedAt: date1,
          createdAt: date1,
          status: 'WATCHING',
          anime: {
            titleEnglish: 'Anime English',
            titleRomaji: null,
            titleNative: null,
            coverImageLarge: '',
            episodes: 12,
            format: 'TV',
          },
        },
      ]);
      mockPrismaClient.aquilaMangaUserList.findMany.mockResolvedValue([]);
      mockPrismaClient.aquilaTvUserList.findMany.mockResolvedValue([
        {
          tvdbId: 2,
          score: 8,
          updatedAt: date2,
          createdAt: date2,
          status: 'WATCHING',
          tv: {
            titleEnglish: 'TV English',
            titleRomaji: null,
            coverImage: '',
            seasons: [{ seasonNumber: 1, episodeCount: 5 }],
          },
          watchedEpisodes: [{ seasonNum: 1, episodeNum: 2 }],
        },
      ]);
      mockPrismaClient.aquilaGameUserList.findMany.mockResolvedValue([]);
      mockPrismaClient.aquilaBookUserList.findMany.mockResolvedValue([]);

      const result = await service.getWatchingList('testuser');

      expect(result.length).toBe(2);
      // Sorted by updatedAt desc, so index 0 should be date2 (TV)
      expect(result[0].id).toBe(2);
      expect(result[1].id).toBe(1);
    });
  });

  describe('incrementProgress', () => {
    it('should throw error for invalid game ID in incrementProgress', async () => {
      await expect(
        service.incrementProgress('testuser', 'game', NaN),
      ).rejects.toThrow('Invalid game ID');
    });

    it('should increment progress for game', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaGameUserList.findUnique.mockResolvedValue({
        id: 'list-game-1',
        progress: 5,
      });
      mockPrismaClient.aquilaGameUserList.update.mockResolvedValue({});

      const result = await service.incrementProgress('testuser', 'game', 1, 3);

      expect(result).toEqual({ success: true, message: 'Progress updated' });
      expect(mockPrismaClient.aquilaGameUserList.update).toHaveBeenCalledWith({
        where: { id: 'list-game-1' },
        data: { progress: 8 },
      });
    });

    it('should throw NotFoundException if game not in list', async () => {
      mockPrismaClient.aquilaGameUserList.findUnique.mockResolvedValue(null);
      await expect(
        service.incrementProgress('testuser', 'game', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should increment progress for book and mark completed if chapters limit reached', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaBookUserList.findUnique.mockResolvedValue({
        id: 'list-book-1',
        chapters: 8,
        status: 'READING',
        book: { chapters: 10 },
      });
      mockPrismaClient.aquilaBookUserList.update.mockResolvedValue({});

      const result = await service.incrementProgress(
        'testuser',
        'book',
        'book-1',
        2,
      );

      expect(result.success).toBe(true);
      expect(mockPrismaClient.aquilaBookUserList.update).toHaveBeenCalledWith({
        where: { id: 'list-book-1' },
        data: {
          chapters: 10,
          status: $Enums.BookListStatus.COMPLETED,
          endDate: expect.any(Number),
        },
      });
    });

    it('should increment progress for anime, sync connection and mark completed', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaAnimeUserList.findUnique.mockResolvedValue({
        id: 'list-anime-1',
        progress: 11,
        status: 'WATCHING',
        anime: { episodes: 12 },
        connections: {
          anilist: { id: 100, progress: 11 },
        },
      });
      mockPrismaClient.aquilaAnimeUserList.update.mockResolvedValue({});

      const result = await service.incrementProgress('testuser', 'anime', 1, 1);

      expect(result.success).toBe(true);
      expect(mockPrismaClient.aquilaAnimeUserList.update).toHaveBeenCalledWith({
        where: { id: 'list-anime-1' },
        data: {
          progress: 12,
          status: $Enums.AnimeListStatus.COMPLETED,
          endDate: expect.any(Number),
          connections: {
            anilist: { id: 100, progress: 12 },
          },
        },
      });
      expect(mockConnectionsManager.syncAnime).toHaveBeenCalled();
    });

    it('should increment progress for manga', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaMangaUserList.findUnique.mockResolvedValue({
        id: 'list-manga-1',
        chapters: 5,
        status: 'READING',
        manga: { chapters: 10 },
        connections: {
          anilist: { id: 100, chapters: 5 },
        },
      });
      mockPrismaClient.aquilaMangaUserList.update.mockResolvedValue({});

      const result = await service.incrementProgress('testuser', 'manga', 1, 2);

      expect(result.success).toBe(true);
      expect(mockPrismaClient.aquilaMangaUserList.update).toHaveBeenCalledWith({
        where: { id: 'list-manga-1' },
        data: {
          chapters: 7,
          status: 'READING',
          connections: {
            anilist: { id: 100, chapters: 7 },
          },
        },
      });
    });

    it('should increment progress for tv', async () => {
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        id: 'list-tv-1',
        status: 'WATCHING',
        tv: {
          seasons: [
            {
              number: 1,
              episodes: [{ number: 1 }, { number: 2 }],
              episodeCount: 2,
            },
          ],
        },
        watchedEpisodes: [],
      });
      mockPrismaClient.aquilaTvWatchedEpisode.createMany.mockResolvedValue({});

      const result = await service.incrementProgress('testuser', 'tv', 1, 1);

      expect(result.success).toBe(true);
      expect(
        mockPrismaClient.aquilaTvWatchedEpisode.createMany,
      ).toHaveBeenCalledWith({
        data: [{ listId: 'list-tv-1', seasonNum: 1, episodeNum: 1 }],
      });
    });

    it('should return failure if all tv episodes already watched', async () => {
      mockPrismaClient.aquilaTvUserList.findUnique.mockResolvedValue({
        id: 'list-tv-1',
        status: 'WATCHING',
        tv: {
          seasons: [
            {
              number: 1,
              episodes: [{ number: 1 }],
              episodeCount: 1,
            },
          ],
        },
        watchedEpisodes: [{ seasonNum: 1, episodeNum: 1 }],
      });

      const result = await service.incrementProgress('testuser', 'tv', 1, 1);

      expect(result).toEqual({
        success: false,
        message: 'All episodes already watched',
      });
    });
  });
});
