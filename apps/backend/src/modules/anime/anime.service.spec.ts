import { Test, TestingModule } from '@nestjs/testing';
import { AnimeService } from './anime.service';
import { AnimeRepository } from './anime.repository';
import { AnimeExternal } from './anime.external';
import { AnimeQueueService } from './anime-queue.service';
import { CacheService } from '../../providers/cache/cache.service';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import type { AnimeSearchEntity, AnimeEntity } from './anime.entities';

import { MangaQueueService } from '../manga/manga-queue.service';

describe('AnimeService', () => {
  let service: AnimeService;
  let repository: AnimeRepository;
  let external: AnimeExternal;
  let queueService: AnimeQueueService;
  let cacheService: CacheService;

  const mockRepository = {
    find: jest.fn(),
    search: jest.fn(),
    upsertV2Record: jest.fn(),
  };

  const mockExternal = {
    search: jest.fn(),
    fetchFullV2Record: jest.fn(),
  };

  const mockQueueService = {
    addSearchUpserts: jest.fn(),
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

  async function createModule(): Promise<void> {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimeService,
        { provide: AnimeRepository, useValue: mockRepository },
        { provide: AnimeExternal, useValue: mockExternal },
        { provide: AnimeQueueService, useValue: mockQueueService },
        { provide: MangaQueueService, useValue: mockMangaQueueService },
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
      format: 'TV' as any,
      status: 'FINISHED' as any,
      isAdult: false,
      averageScore: 85,
    },
  ];

  describe('search', () => {
    beforeEach(async () => {
      await createModule();
    });

    it('should return cached search results if available', async () => {
      mockCacheService.get.mockResolvedValue(mockSearchResults);

      const result = await service.search('Test Name');

      expect(mockCacheService.get).toHaveBeenCalledWith(
        service.cacheKeys.animeSearch('Test Name'),
      );
      expect(mockRepository.search).not.toHaveBeenCalled();
      expect(mockExternal.search).not.toHaveBeenCalled();
      expect(result).toEqual(mockSearchResults);
    });

    it('should query local repository first on cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.search.mockResolvedValue(mockSearchResults);

      const result = await service.search('Test Name');

      expect(mockRepository.search).toHaveBeenCalledWith('Test Name');
      expect(mockExternal.search).not.toHaveBeenCalled();
      expect(result).toEqual(mockSearchResults);
    });

    it('should fallback to external search if local returns 0 results and queue background upserts', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.search.mockResolvedValue([]);
      mockExternal.search.mockResolvedValue(mockSearchResults);

      const result = await service.search('Test Name');

      expect(mockRepository.search).toHaveBeenCalledWith('Test Name');
      expect(mockExternal.search).toHaveBeenCalledWith('Test Name');
      expect(mockQueueService.addSearchUpserts).toHaveBeenCalledWith([1]);
      expect(result).toEqual(mockSearchResults);
    });
  });

  describe('getAnime', () => {
    const mockAnime: AnimeEntity = {
      id: 1,
      anilistId: 1,
      malId: 10,
      titlePrimary: 'English Title',
      titleSecondary: 'Romaji Title',
      titleNative: 'Native Title',
      coverImage: 'cover.jpg',
      bannerImage: 'banner.jpg',
      description: 'A description',
      startDateYear: 2020,
      startDateMonth: 1,
      startDateDay: 1,
      endDateYear: 2020,
      endDateMonth: 12,
      endDateDay: 31,
      seasonSeason: 'WINTER' as any,
      seasonYear: 2020,
      episodeCount: 24,
      episodeDuration: 24,
      genres: ['Action'],
      source: 'ORIGINAL' as any,
      format: 'TV' as any,
      status: 'FINISHED' as any,
      isAdult: false,
      averageScore: 85,
      favorites: 100,
      popularity: 500,
      synonyms: [],
      hashtag: '#anime',
      countryOfOrigin: 'JP',
      locked: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      episodes: [],
      characters: [],
      studios: [],
      staff: [],
    };

    beforeEach(async () => {
      await createModule();
    });

    it('should throw BadRequestException for NaN id', async () => {
      await expect(service.getAnime(NaN)).rejects.toThrow(BadRequestException);
    });

    it('should return cached anime if available without calling repository', async () => {
      mockCacheService.get.mockResolvedValue(mockAnime);

      const result = await service.getAnime(1);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        service.cacheKeys.animeDetail(1),
      );
      expect(mockRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual(mockAnime);
    });

    it('should fetch from repository on cache miss and cache the result', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(mockAnime);

      const result = await service.getAnime(1);

      expect(mockRepository.find).toHaveBeenCalledWith(1);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        service.cacheKeys.animeDetail(1),
        mockAnime,
        expect.any(Number),
      );
      expect(result).toEqual(mockAnime);
    });

    it('should throw NotFoundException when anime not found in cache or database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(null);

      await expect(service.getAnime(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('refreshAnime', () => {
    const existingAnime: any = {
      id: 1,
      anilistId: 100,
      titlePrimary: 'Old Title',
      locked: false,
    };

    beforeEach(async () => {
      await createModule();
    });

    it('should throw BadRequestException for NaN id', async () => {
      await expect(service.refreshAnime(NaN)).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException when refresh is on cooldown', async () => {
      mockCacheService.get.mockResolvedValue(true);

      await expect(service.refreshAnime(1)).rejects.toThrow(HttpException);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        service.cacheKeys.refreshCooldown(1),
      );
      expect(mockRepository.find).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when anime not in database', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue(null);

      await expect(service.refreshAnime(1)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when anime has no anilistId', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue({
        ...existingAnime,
        anilistId: null,
      });

      await expect(service.refreshAnime(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when anime is locked', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find.mockResolvedValue({
        ...existingAnime,
        locked: true,
      });

      await expect(service.refreshAnime(1)).rejects.toThrow(ConflictException);
    });

    it('should fetch fresh data, bust cache, set cooldown, and return updated anime', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockRepository.find
        .mockResolvedValueOnce(existingAnime)
        .mockResolvedValueOnce(existingAnime);
      mockExternal.fetchFullV2Record.mockResolvedValue({ titlePrimary: 'New Title' });
      mockRepository.upsertV2Record.mockResolvedValue(existingAnime);

      const result = await service.refreshAnime(1);

      expect(mockExternal.fetchFullV2Record).toHaveBeenCalledWith(100);
      expect(mockCacheService.del).toHaveBeenCalledWith(
        service.cacheKeys.animeDetail(1),
      );
      expect(mockCacheService.set).toHaveBeenCalledWith(
        service.cacheKeys.refreshCooldown(1),
        true,
        300,
      );
      expect(mockRepository.find).toHaveBeenCalledTimes(2);
      expect(result).toEqual(existingAnime);
    });

    it('should pass force and skipRelations options to relation jobs on force refresh', async () => {
      mockRepository.find
        .mockResolvedValueOnce(existingAnime)
        .mockResolvedValueOnce(existingAnime);
      mockExternal.fetchFullV2Record.mockResolvedValue({
        titlePrimary: 'New Title',
        relations: [
          { targetType: 'ANIME', targetAnilistId: 200 },
          { targetType: 'MANGA', targetAnilistId: 300 },
        ],
      });
      mockRepository.upsertV2Record.mockResolvedValue(existingAnime);

      await service.refreshAnime(1, true);

      expect(mockQueueService.addUpsertJob).toHaveBeenCalledWith(200, {
        force: true,
        skipRelations: true,
      });
      expect(mockMangaQueueService.addUpsertJob).toHaveBeenCalledWith(300, {
        force: true,
        skipRelations: true,
      });
    });
  });
});
