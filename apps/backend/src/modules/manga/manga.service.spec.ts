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
import type { MangaSearchEntity, MangaEntity } from './manga.entities';

describe('MangaService', () => {
  let service: MangaService;
  let repository: MangaRepository;
  let external: MangaExternal;
  let queueService: MangaQueueService;
  let cacheService: CacheService;

  const mockRepository = {
    find: jest.fn(),
    search: jest.fn(),
  };

  const mockExternal = {
    search: jest.fn(),
    fetchAndUpsertManga: jest.fn(),
  };

  const mockQueueService = {
    addSearchRefresh: jest.fn(),
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

  const mockSearchResults: MangaSearchEntity[] = [
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
    describe('with USE_LOCAL_MEDIA_ONLY disabled (default)', () => {
      beforeEach(async () => {
        delete process.env.USE_LOCAL_MEDIA_ONLY;
        await createModule();
      });

      it('should return cached search results if available', async () => {
        mockCacheService.get.mockResolvedValue(mockSearchResults);

        const result = await service.search('Test Manga');

        expect(mockCacheService.get).toHaveBeenCalledWith(
          'manga-search:testmanga',
        );
        expect(mockExternal.search).not.toHaveBeenCalled();
        expect(result).toEqual(mockSearchResults);
      });

      it('should search external on cache miss and cache results', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockExternal.search.mockResolvedValue(mockSearchResults);

        const result = await service.search('Test Manga');

        expect(mockExternal.search).toHaveBeenCalledWith('Test Manga');
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'manga-search:testmanga',
          JSON.stringify(mockSearchResults),
          expect.any(Number),
        );
        expect(mockQueueService.addSearchRefresh).not.toHaveBeenCalled();
        expect(result).toEqual(mockSearchResults);
      });

      it('should not cache empty results', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockExternal.search.mockResolvedValue([]);

        const result = await service.search('Empty');

        expect(mockExternal.search).toHaveBeenCalled();
        expect(mockCacheService.set).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });

    describe('with USE_LOCAL_MEDIA_ONLY enabled', () => {
      beforeEach(async () => {
        process.env.USE_LOCAL_MEDIA_ONLY = 'true';
        await createModule();
      });

      afterEach(() => {
        delete process.env.USE_LOCAL_MEDIA_ONLY;
      });

      it('should return local results when available and queue a background refresh', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.search.mockResolvedValue(mockSearchResults);

        const result = await service.search('Naruto');

        expect(mockRepository.search).toHaveBeenCalledWith('Naruto');
        expect(mockExternal.search).not.toHaveBeenCalled();
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'manga-search:naruto',
          JSON.stringify(mockSearchResults),
          expect.any(Number),
        );
        expect(mockQueueService.addSearchRefresh).toHaveBeenCalledWith(
          'Naruto',
          'manga-search:naruto',
        );
        expect(result).toEqual(mockSearchResults);
      });

      it('should fall back to external when local search returns empty', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockRepository.search.mockResolvedValue([]);
        mockExternal.search.mockResolvedValue(mockSearchResults);

        const result = await service.search('Naruto');

        expect(mockRepository.search).toHaveBeenCalledWith('Naruto');
        expect(mockExternal.search).toHaveBeenCalledWith('Naruto');
        expect(mockQueueService.addSearchRefresh).not.toHaveBeenCalled();
        expect(result).toEqual(mockSearchResults);
      });
    });
  });

  describe('getManga', () => {
    const mockManga: MangaEntity = {
      id: 1,
      anilistId: 123,
      malId: 456,
      titleEnglish: 'English Title',
      titleRomaji: 'Romaji Title',
      titleNative: 'Native Title',
      coverImageLarge: 'cover.jpg',
      bannerImage: 'banner.jpg',
      description: 'A description',
      startDateYear: 2020,
      startDateMonth: 1,
      startDateDay: 1,
      endDateYear: 2020,
      endDateMonth: 12,
      endDateDay: 31,
      chapters: 100,
      volumes: 10,
      genres: ['Action'],
      source: 'ORIGINAL',
      format: 'MANGA',
      status: 'FINISHED',
      isAdult: false,
      averageScore: 85,
      favourites: 100,
      synonyms: [],
      hashtag: '#manga',
      countryOfOrigin: 'JP',
      locked: false,
      anilistUpdatedAt: null,
      updatedAt: new Date(),
      mangaCharacters: [],
      mangaStudios: [],
      mangaMangaRelations: [],
    };

    beforeEach(async () => {
      delete process.env.USE_LOCAL_MEDIA_ONLY;
      await createModule();
    });

    it('should throw rrError for NaN id', async () => {
      await expect(service.getManga(NaN)).rejects.toThrow(rrError);
    });

    it('should return cached manga if available without calling repository', async () => {
      mockCacheService.get.mockResolvedValue(mockManga);

      const result = await service.getManga(123);

      expect(mockCacheService.get).toHaveBeenCalledWith('manga:123');
      expect(mockRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual(mockManga);
    });

    it('should fetch from repository on cache miss and cache the result', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(mockManga);

      const result = await service.getManga(123);

      expect(mockRepository.find).toHaveBeenCalledWith(123);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'manga:123',
        mockManga,
        expect.any(Number),
      );
      expect(result).toEqual(mockManga);
    });

    it('should throw rrNotFoundException when manga not found in cache or database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(null);

      await expect(service.getManga(123)).rejects.toThrow(rrNotFoundException);
    });
  });

  describe('refreshManga', () => {
    const existingManga: MangaEntity = {
      id: 1,
      anilistId: 100,
      malId: null,
      titleEnglish: 'Old Title',
      titleRomaji: null,
      titleNative: null,
      coverImageLarge: null,
      bannerImage: null,
      description: null,
      startDateYear: null,
      startDateMonth: null,
      startDateDay: null,
      endDateYear: null,
      endDateMonth: null,
      endDateDay: null,
      chapters: null,
      volumes: null,
      genres: [],
      source: null,
      format: 'MANGA',
      status: 'FINISHED',
      isAdult: false,
      averageScore: null,
      favourites: null,
      synonyms: [],
      hashtag: null,
      countryOfOrigin: null,
      locked: false,
      anilistUpdatedAt: null,
      updatedAt: new Date(),
      mangaCharacters: [],
      mangaStudios: [],
      mangaMangaRelations: [],
    };

    beforeEach(async () => {
      delete process.env.USE_LOCAL_MEDIA_ONLY;
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
        'cooldown:refresh:manga:1',
      );
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('should throw rrNotFoundException when manga not in database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(null);

      await expect(service.refreshManga(1)).rejects.toThrow(
        rrNotFoundException,
      );
    });

    it('should throw rrError when manga has no anilistId', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue({
        ...existingManga,
        anilistId: null,
      });

      await expect(service.refreshManga(1)).rejects.toThrow(rrError);
    });

    it('should throw rrConflictException when manga is locked', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue({
        ...existingManga,
        locked: true,
      });

      await expect(service.refreshManga(1)).rejects.toThrow(
        rrConflictException,
      );
    });

    it('should fetch fresh data, bust cache, set cooldown, and return updated manga', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find
        .mockResolvedValueOnce(existingManga)
        .mockResolvedValueOnce(existingManga);
      mockExternal.fetchAndUpsertManga.mockResolvedValue(undefined);

      const result = await service.refreshManga(1);

      expect(mockExternal.fetchAndUpsertManga).toHaveBeenCalledWith(100);
      expect(mockCacheService.del).toHaveBeenCalledWith('manga:1');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'cooldown:refresh:manga:1',
        true,
        300,
      );
      expect(mockRepository.find).toHaveBeenCalledTimes(2);
      expect(result).toEqual(existingManga);
    });
  });
});
