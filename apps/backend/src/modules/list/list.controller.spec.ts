import { Test, TestingModule } from '@nestjs/testing';
import { ListController } from './list.controller';
import { ListService } from './list.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Reflector } from '@nestjs/core';

describe('ListController', () => {
  let controller: ListController;
  let service: ListService;

  const mockListService = {
    getAnimeList: jest.fn(),
    getAnimeListEntry: jest.fn(),
    upsertAnimeList: jest.fn(),
    deleteAnimeList: jest.fn(),
    getMangaList: jest.fn(),
    getMangaListEntry: jest.fn(),
    upsertMangaList: jest.fn(),
    deleteMangaList: jest.fn(),
    getMovieList: jest.fn(),
    getMovieListEntry: jest.fn(),
    upsertMovieList: jest.fn(),
    deleteMovieList: jest.fn(),
    getTvList: jest.fn(),
    getTvListEntry: jest.fn(),
    upsertTvList: jest.fn(),
    deleteTvList: jest.fn(),
    getGameList: jest.fn(),
    getGameListEntry: jest.fn(),
    upsertGameList: jest.fn(),
    deleteGameList: jest.fn(),
    getBookList: jest.fn(),
    getBookListEntry: jest.fn(),
    upsertBookList: jest.fn(),
    deleteBookList: jest.fn(),
    getWatchingList: jest.fn(),
    incrementProgress: jest.fn(),
    toggleEpisodeWatched: jest.fn(),
    toggleSeasonWatched: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListController],
      providers: [
        { provide: ListService, useValue: mockListService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<ListController>(ListController);
    service = module.get<ListService>(ListService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAnimeList', () => {
    it('should retrieve anime list by username', async () => {
      const mockReq = { user: { username: 'viewer' } };
      mockListService.getAnimeList.mockResolvedValue([]);

      const result = await controller.getAnimeList(
        'testuser',
        mockReq,
        '10',
        '0',
        'WATCHING',
        'search',
        'TV',
        'score',
      );

      expect(service.getAnimeList).toHaveBeenCalledWith('testuser', 'viewer', {
        limit: 10,
        offset: 0,
        status: 'WATCHING',
        search: 'search',
        format: 'TV',
        sort: 'score',
      });
      expect(result).toEqual([]);
    });
  });

  describe('saveAnimeListEntry', () => {
    it('should save anime list entry', async () => {
      const mockReq = { user: { username: 'testuser' } };
      const body = { animeId: 1, progress: 10 };
      mockListService.upsertAnimeList.mockResolvedValue({
        success: true,
        message: 'Saved',
      });

      const result = await controller.saveAnimeListEntry(mockReq, body);

      expect(service.upsertAnimeList).toHaveBeenCalledWith('testuser', body);
      expect(result).toEqual({ success: true, message: 'Saved' });
    });
  });

  describe('deleteAnimeListEntry', () => {
    it('should delete anime list entry', async () => {
      const mockReq = { user: { username: 'testuser' } };
      mockListService.deleteAnimeList.mockResolvedValue({
        success: true,
        message: 'Deleted',
      });

      const result = await controller.deleteAnimeListEntry('1', mockReq);

      expect(service.deleteAnimeList).toHaveBeenCalledWith('testuser', 1);
      expect(result).toEqual({ success: true, message: 'Deleted' });
    });
  });

  describe('incrementProgress', () => {
    it('should increment progress for media item', async () => {
      const mockReq = { user: { username: 'testuser' } };
      const body = { mediaType: 'anime' as const, id: 1, count: 1 };
      mockListService.incrementProgress.mockResolvedValue({ success: true });

      const result = await controller.incrementProgress(mockReq, body);

      expect(service.incrementProgress).toHaveBeenCalledWith(
        'testuser',
        'anime',
        1,
        1,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('toggleEpisode', () => {
    it('should toggle episode status for TV', async () => {
      const mockReq = { user: { username: 'testuser' } };
      const body = { seasonNum: 1, episodeNum: 2 };
      mockListService.toggleEpisodeWatched.mockResolvedValue({ success: true });

      const result = await controller.toggleEpisode('123', mockReq, body);

      expect(service.toggleEpisodeWatched).toHaveBeenCalledWith(
        'testuser',
        123,
        1,
        2,
      );
      expect(result).toEqual({ success: true });
    });
  });
});
