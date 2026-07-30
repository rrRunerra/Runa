import { Test, TestingModule } from '@nestjs/testing';
import { MangaService } from './manga.service';
import { MangaRepository } from './manga.repository';
import { MangaExternal } from './manga.external';
import { MangaQueueService } from './manga-queue.service';
import { CacheService } from '../../providers/cache/cache.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
  rrConflictException,
} from 'src/providers/error';

describe('MangaService', () => {
  let service: MangaService;
  let repository: MangaRepository;
  let external: MangaExternal;
  let queueService: MangaQueueService;
  let cacheService: CacheService;

  const mockRepository = {
    find: jest.fn(),
    search: jest.fn(),
    findByAnilistId: jest.fn(),
    upsertV2Record: jest.fn(),
    findSimilar: jest.fn(),
  };

  const mockExternal = {
    search: jest.fn(),
    fetchFullV2Record: jest.fn(),
  };

  const mockQueueService = {
    addUpsertJob: jest.fn(),
    addSearchUpserts: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  async function createModule(): Promise<void> {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MangaService,
        { provide: MangaRepository, useValue: mockRepository },
        { provide: MangaExternal, useValue: mockExternal },
        { provide: MangaQueueService, useValue: mockQueueService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<MangaService>(MangaService);
    repository = module.get<MangaRepository>(MangaRepository);
    external = module.get<MangaExternal>(MangaExternal);
    queueService = module.get<MangaQueueService>(MangaQueueService);
    cacheService = module.get<CacheService>(CacheService);
  }

  const mockSearchResults: any[] = [
    {
      id: 1,
      title: 'Romaji Title',
      secondaryTitle: null,
      coverImage: 'cover-url',
      format: 'MANGA',
      status: 'RELEASING',
      isAdult: false,
      averageScore: 80,
    },
  ];

  describe('search', () => {
    beforeEach(async () => {
      await createModule();
    });

    it('should return cached search results if available', async () => {
      mockCacheService.get.mockResolvedValue(mockSearchResults);

      const result = await service.search('Test Manga');

      expect(mockCacheService.get).toHaveBeenCalledWith('manga:v2:search:Test Manga');
      expect(mockExternal.search).not.toHaveBeenCalled();
      expect(result).toEqual(mockSearchResults);
    });

    it('should search local DB first and return results if found', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.search.mockResolvedValue(mockSearchResults);

      const result = await service.search('Test Manga');

      expect(mockRepository.search).toHaveBeenCalledWith('Test Manga');
      expect(mockExternal.search).not.toHaveBeenCalled();
      expect(result).toEqual(mockSearchResults);
    });
  });

  describe('getManga', () => {
    const mockManga: any = {
      id: 1,
      anilistId: 123,
      titlePrimary: 'Sample Manga',
      format: 'MANGA',
      status: 'FINISHED',
    };

    beforeEach(async () => {
      await createModule();
    });

    it('should throw rrError for NaN id', async () => {
      await expect(service.getManga(NaN)).rejects.toThrow(rrError);
    });

    it('should return cached manga if available without calling repository', async () => {
      mockCacheService.get.mockResolvedValue(mockManga);

      const result = await service.getManga(123);

      expect(mockCacheService.get).toHaveBeenCalledWith('manga:v2:123');
      expect(mockRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual(mockManga);
    });

    it('should fetch from repository on cache miss and cache the result', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(mockManga);

      const result = await service.getManga(123);

      expect(mockRepository.find).toHaveBeenCalledWith(123);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'manga:v2:123',
        mockManga,
        expect.any(Number),
      );
      expect(result).toEqual(mockManga);
    });
  });

  describe('refreshManga', () => {
    const existingManga: any = {
      id: 1,
      anilistId: 100,
      titlePrimary: 'Old Title',
      locked: false,
    };

    beforeEach(async () => {
      await createModule();
    });

    it('should throw rrError for NaN id', async () => {
      await expect(service.refreshManga(NaN)).rejects.toThrow(rrError);
    });

    it('should throw rrTooManyRequestsException when refresh is on cooldown', async () => {
      mockCacheService.get.mockResolvedValue(true);

      await expect(service.refreshManga(1)).rejects.toThrow(
        rrTooManyRequestsException,
      );

      expect(mockCacheService.get).toHaveBeenCalledWith(
        'cooldown:refresh:manga:v2:1',
      );
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('should fetch fresh data, bust cache, set cooldown, and return updated manga', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find
        .mockResolvedValueOnce(existingManga)
        .mockResolvedValueOnce(existingManga);
      mockExternal.fetchFullV2Record.mockResolvedValue({
        anilistId: 100,
        titlePrimary: 'Fresh Title',
      });

      const result = await service.refreshManga(1);

      expect(mockExternal.fetchFullV2Record).toHaveBeenCalledWith(100);
      expect(mockCacheService.del).toHaveBeenCalledWith('manga:v2:1');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'cooldown:refresh:manga:v2:1',
        true,
        300,
      );
      expect(result).toEqual(existingManga);
    });
  });
});
