import { Test, TestingModule } from '@nestjs/testing';
import { AnimeService } from './anime.service';
import { AnimeRepository } from './anime.repository';
import { AnimeExternal } from './anime.external';
import { AnimeQueueService } from './anime-queue.service';
import { CacheService } from '../../providers/cache/cache.service';
import {
  rrError,
  rrNotFoundException,
  rrTooManyRequestsException,
  rrConflictException,
} from 'src/providers/error';
import type { AnimeSearchEntity, AnimeEntity } from './anime.entities';

describe('AnimeService', () => {
  let service: AnimeService;
  let repository: AnimeRepository;
  let external: AnimeExternal;
  let queueService: AnimeQueueService;
  let cacheService: CacheService;

  const mockRepository = {
    find: jest.fn(),
    search: jest.fn(),
  };

  const mockExternal = {
    search: jest.fn(),
    fetchAndUpsertAnime: jest.fn(),
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
        AnimeService,
        { provide: AnimeRepository, useValue: mockRepository },
        { provide: AnimeExternal, useValue: mockExternal },
        { provide: AnimeQueueService, useValue: mockQueueService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AnimeService>(AnimeService);
    repository = module.get<AnimeRepository>(AnimeRepository);
    external = module.get<AnimeExternal>(AnimeExternal);
    queueService = module.get<AnimeQueueService>(AnimeQueueService);
    cacheService = module.get<CacheService>(CacheService);
  }

  const mockSearchResults: AnimeSearchEntity[] = [
    {
      id: 1,
      title: 'Romaji Title',
      secondaryTitle: null,
      coverImage: 'image-large',
      format: 'TV',
      status: 'FINISHED',
      isAdult: false,
      averageScore: 85,
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

        const result = await service.search('Test Name');

        expect(mockCacheService.get).toHaveBeenCalledWith(
          'anime-search:testname',
        );
        expect(mockExternal.search).not.toHaveBeenCalled();
        expect(result).toEqual(mockSearchResults);
      });

      it('should search external on cache miss and cache results', async () => {
        mockCacheService.get.mockResolvedValue(null);
        mockExternal.search.mockResolvedValue(mockSearchResults);

        const result = await service.search('Test Name');

        expect(mockExternal.search).toHaveBeenCalledWith('Test Name');
        expect(mockCacheService.set).toHaveBeenCalledWith(
          'anime-search:testname',
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
          'anime-search:naruto',
          JSON.stringify(mockSearchResults),
          expect.any(Number),
        );
        expect(mockQueueService.addSearchRefresh).toHaveBeenCalledWith(
          'Naruto',
          'anime-search:naruto',
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

  describe('getAnime', () => {
    const mockAnime: AnimeEntity = {
      id: 1,
      anilistId: 1,
      malId: 10,
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
      season: 'WINTER',
      seasonYear: 2020,
      episodes: 24,
      duration: 24,
      genres: ['Action'],
      tags: [{ name: 'Exciting', rank: 90 }],
      source: 'ORIGINAL',
      format: 'TV',
      status: 'FINISHED',
      isAdult: false,
      averageScore: 85,
      favourites: 100,
      synonyms: [],
      hashtag: '#anime',
      countryOfOrigin: 'JP',
      nextAiringEpisode: { airingAt: 0, timeUntilAiring: 0, episode: 0 },
      trailers: { id: 'yt-id', site: 'youtube', thumbnail: 'thumb.jpg' },
      locked: false,
      anilistUpdatedAt: null,
      updatedAt: new Date(),
      animeCharacters: [],
      animeStudios: [],
      animeRelations: [],
    };

    beforeEach(async () => {
      delete process.env.USE_LOCAL_MEDIA_ONLY;
      await createModule();
    });

    it('should throw rrError for NaN id', async () => {
      await expect(service.getAnime(NaN)).rejects.toThrow(rrError);
    });

    it('should return cached anime if available without calling repository', async () => {
      mockCacheService.get.mockResolvedValue(mockAnime);

      const result = await service.getAnime(1);

      expect(mockCacheService.get).toHaveBeenCalledWith('anime:1');
      expect(mockRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual(mockAnime);
    });

    it('should fetch from repository on cache miss and cache the result', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(mockAnime);

      const result = await service.getAnime(1);

      expect(mockRepository.find).toHaveBeenCalledWith(1);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'anime:1',
        mockAnime,
        expect.any(Number),
      );
      expect(result).toEqual(mockAnime);
    });

    it('should throw rrNotFoundException when anime not found in cache or database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(null);

      await expect(service.getAnime(1)).rejects.toThrow(rrNotFoundException);
    });
  });

  describe('refreshAnime', () => {
    const existingAnime = {
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
      season: null,
      seasonYear: null,
      episodes: null,
      duration: null,
      genres: [],
      tags: null,
      source: null,
      format: 'TV',
      status: 'FINISHED',
      isAdult: false,
      averageScore: null,
      favourites: null,
      synonyms: [],
      hashtag: null,
      countryOfOrigin: null,
      nextAiringEpisode: null,
      trailers: null,
      locked: false,
      anilistUpdatedAt: null,
      updatedAt: new Date(),
      animeCharacters: [],
      animeStudios: [],
      animeRelations: [],
    };

    beforeEach(async () => {
      delete process.env.USE_LOCAL_MEDIA_ONLY;
      await createModule();
    });

    it('should throw rrError for NaN id', async () => {
      await expect(service.refreshAnime(NaN)).rejects.toThrow(rrError);
    });

    it('should throw rrTooManyRequestsException when refresh is on cooldown', async () => {
      mockCacheService.get.mockResolvedValue(true); // cooldown active

      await expect(service.refreshAnime(1)).rejects.toThrow(
        rrTooManyRequestsException,
      );

      expect(mockCacheService.get).toHaveBeenCalledWith(
        'cooldown:refresh:anime:1',
      );
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('should throw rrNotFoundException when anime not in database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(null);

      await expect(service.refreshAnime(1)).rejects.toThrow(
        rrNotFoundException,
      );
    });

    it('should throw rrError when anime has no anilistId', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue({
        ...existingAnime,
        anilistId: null,
      });

      await expect(service.refreshAnime(1)).rejects.toThrow(rrError);
    });

    it('should throw rrConflictException when anime is locked', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue({
        ...existingAnime,
        locked: true,
      });

      await expect(service.refreshAnime(1)).rejects.toThrow(
        rrConflictException,
      );
    });

    it('should fetch fresh data, bust cache, set cooldown, and return updated anime', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find
        .mockResolvedValueOnce(existingAnime) // first call: lookup
        .mockResolvedValueOnce(existingAnime); // second call: return after refresh
      mockExternal.fetchAndUpsertAnime.mockResolvedValue(undefined);

      const result = await service.refreshAnime(1);

      expect(mockExternal.fetchAndUpsertAnime).toHaveBeenCalledWith(100);
      expect(mockCacheService.del).toHaveBeenCalledWith('anime:1');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'cooldown:refresh:anime:1',
        true,
        300,
      );
      expect(mockRepository.find).toHaveBeenCalledTimes(2);
      expect(result).toEqual(existingAnime);
    });
  });
});
