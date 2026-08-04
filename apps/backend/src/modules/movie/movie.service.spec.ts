import { Test, TestingModule } from '@nestjs/testing';
import { MovieService } from './movie.service';
import { MovieRepository } from './movie.repository';
import { MovieQueueService } from './movie-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { MovieExternal } from './movie.external';
import { AnimeQueueService } from '../anime/anime-queue.service';
import { MangaQueueService } from '../manga/manga-queue.service';

describe('MovieService', () => {
  let service: MovieService;
  let repository: MovieRepository;
  let external: MovieExternal;

  const mockMovieRepository = {
    find: jest.fn(),
    search: jest.fn(),
    findByTvdbId: jest.fn(),
    upsertV2Record: jest.fn(),
    findSimilar: jest.fn(),
  };

  const mockMovieQueueService = {
    addSearchUpserts: jest.fn(),
    addUpsertJob: jest.fn(),
  };

  const mockAnimeQueueService = {
    addUpsertJob: jest.fn(),
  };

  const mockMangaQueueService = {
    addUpsertJob: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMovieExternal = {
    search: jest.fn(),
    fetchFullV2Record: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieService,
        { provide: MovieRepository, useValue: mockMovieRepository },
        { provide: MovieQueueService, useValue: mockMovieQueueService },
        { provide: AnimeQueueService, useValue: mockAnimeQueueService },
        { provide: MangaQueueService, useValue: mockMangaQueueService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: MovieExternal, useValue: mockMovieExternal },
      ],
    }).compile();

    service = module.get<MovieService>(MovieService);
    repository = module.get<MovieRepository>(MovieRepository);
    external = module.get<MovieExternal>(MovieExternal);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    it('should return cached search results if available', async () => {
      const cached = [{ id: 1, title: 'Inception' }];
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.search('Inception');
      expect(result).toEqual(cached);
      expect(mockMovieRepository.search).not.toHaveBeenCalled();
    });

    it('should query local repository if cache is empty', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const dbResults = [{ id: 1, title: 'Inception' }];
      mockMovieRepository.search.mockResolvedValue(dbResults);

      const result = await service.search('Inception');
      expect(result).toEqual(dbResults);
    });

    it('should trigger non-blocking background search refresh if not in cooldown', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const dbResults = [{ id: 1, title: 'Inception' }];
      mockMovieRepository.search.mockResolvedValue(dbResults);
      mockMovieExternal.search.mockResolvedValue([{ tvdbId: 100, title: 'Inception' }]);

      const result = await service.search('Inception');
      expect(result).toEqual(dbResults);

      // Wait a microtick for background promise
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'cooldown:search-refresh:movie:inception',
        true,
        3600,
      );
      expect(mockMovieExternal.search).toHaveBeenCalledWith('Inception');
      expect(mockMovieQueueService.addSearchUpserts).toHaveBeenCalledWith([100]);
    });
  });

  describe('getMovie', () => {
    it('should return cached movie if present', async () => {
      const cached = { id: 1, titlePrimary: 'Interstellar' };
      mockCacheService.get.mockResolvedValue(cached);

      const result = await service.getMovie(1);
      expect(result).toEqual(cached);
      expect(mockMovieRepository.find).not.toHaveBeenCalled();
    });

    it('should query repository on cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);
      const dbMovie = { id: 1, titlePrimary: 'Interstellar' };
      mockMovieRepository.find.mockResolvedValue(dbMovie);

      const result = await service.getMovie(1);
      expect(result).toEqual(dbMovie);
    });
  });
});
