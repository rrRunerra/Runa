import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TvService } from './tv.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { TvRepository } from './tv.repository';
import { TvQueueService } from './tv-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { TvExternal } from './tv.external';
import { TvSearchEntity } from './tv.entities';

describe('TvService', () => {
  let service: TvService;
  let repository: TvRepository;
  let queueService: TvQueueService;

  const mockPrisma = {};

  const mockTvRepository = {
    find: jest.fn(),
    findByTvdbId: jest.fn(),
    search: jest.fn(),
    upsertV2Record: jest.fn(),
  };

  const mockTvQueueService = {
    addJob: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockTvExternal = {
    search: jest.fn(),
    fetchAndUpsertTv: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.THETVDB_KEY = 'mock-tvdb-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TvService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TvRepository, useValue: mockTvRepository },
        { provide: TvQueueService, useValue: mockTvQueueService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: TvExternal, useValue: mockTvExternal },
      ],
    }).compile();

    service = module.get<TvService>(TvService);
    repository = module.get<TvRepository>(TvRepository);
    queueService = module.get<TvQueueService>(TvQueueService);
  });

  describe('search', () => {
    it('should return repository search results if found in local DB', async () => {
      const mockResult: TvSearchEntity[] = [
        {
          id: 123,
          title: 'Show Title',
          secondaryTitle: null,
          coverImage: 'cover.jpg',
          format: 'TV',
          status: 'RETURNING_SERIES',
          isAdult: false,
          averageScore: null,
        },
      ];
      mockTvRepository.search.mockResolvedValue(mockResult);

      const result = await service.search('Show');
      expect(result).toEqual(mockResult);
    });

    it('should query TVDB when local search is empty', async () => {
      mockTvRepository.search.mockResolvedValue([]);
      const mockExternalResults: TvSearchEntity[] = [
        {
          id: 123,
          title: 'Show Title',
          secondaryTitle: null,
          coverImage: 'cover.jpg',
          format: 'TV',
          status: 'RETURNING_SERIES',
          isAdult: false,
          averageScore: null,
        },
      ];
      mockTvExternal.search.mockResolvedValue(mockExternalResults);

      const result = await service.search('Show');
      expect(mockTvExternal.search).toHaveBeenCalledWith('Show');
      expect(result).toEqual(mockExternalResults);
    });
  });

  describe('getTv', () => {
    it('should throw error if ID format is invalid', async () => {
      await expect(service.getTv(NaN)).rejects.toThrow(
        'ID must be a number',
      );
    });

    it('should return TV show from repository', async () => {
      const mockTv = { id: 123, titlePrimary: 'Family Guy', tvDBId: 75978 };
      mockTvRepository.find.mockResolvedValue(mockTv);

      const result = await service.getTv(123);
      expect(mockTvRepository.find).toHaveBeenCalledWith(123);
      expect(result).toEqual(mockTv);
    });

    it('should throw NotFoundException if TV not found anywhere', async () => {
      mockTvRepository.find.mockResolvedValue(null);
      mockTvRepository.findByTvdbId.mockResolvedValue(null);

      await expect(service.getTv(99999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ensureTv', () => {
    it('should return existing TV record if found and fresh', async () => {
      const existing = { id: 1, tvDBId: 123, tvdbUpdatedAt: Math.floor(Date.now() / 1000) };
      mockTvRepository.findByTvdbId.mockResolvedValue(existing);

      const result = await service.ensureTv(123);
      expect(result).toEqual(existing);
      expect(mockTvExternal.fetchAndUpsertTv).not.toHaveBeenCalled();
    });

    it('should fetch and upsert when TV is stale or missing', async () => {
      const updated = { id: 1, tvDBId: 123, tvdbUpdatedAt: Math.floor(Date.now() / 1000) };
      mockTvRepository.findByTvdbId
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(updated);

      const result = await service.ensureTv(123);
      expect(mockTvExternal.fetchAndUpsertTv).toHaveBeenCalledWith(123);
      expect(result).toEqual(updated);
    });
  });
});

