import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TvService } from './tv.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { TvRepository } from './tv.repository';
import { TvQueueService } from './tv-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { TvExternal } from './tv.external';

describe('TvService', () => {
  let service: TvService;
  let repository: TvRepository;
  let queueService: TvQueueService;

  const mockPrisma = {};

  const mockTvRepository = {
    findByTvdbId: jest.fn(),
    toMedia: jest.fn(),
    upsert: jest.fn(),
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
    it('should login and retrieve search results from TVDB API', async () => {
      const mockLoginResponse = { data: { token: 'mock-token-xyz' } };
      const mockSearchResponse = {
        data: [
          {
            tvdb_id: 123,
            name: 'Original Title',
            thumbnail: 'thumb-url',
            type: 'series',
            status: 'FINISHED',
            translations: { eng: 'English Title' },
          },
        ],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSearchResponse),
        });

      const result = await service.search('TvShowName');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api4.thetvdb.com/v4/login',
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api4.thetvdb.com/v4/search?query=TvShowName&type=series&language=eng',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-xyz',
          }),
        }),
      );

      expect(result).toEqual([
        {
          id: '123',
          title: { romaji: 'Original Title', english: 'English Title' },
          coverImage: { large: 'thumb-url' },
          format: 'series',
          status: 'FINISHED',
          isAdult: false,
        },
      ]);
    });

    it('should retry login if search response states error', async () => {
      const mockLoginResponse = { data: { token: 'mock-token' } };
      const mockSearchError = { status: 'error' };
      const mockSearchSuccess = {
        data: [{ tvdb_id: 123, name: 'Title', translations: {} }],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSearchError),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSearchSuccess),
        });

      const result = await service.search('TvShowName');
      expect(result.length).toBe(1);
    });
  });

  describe('getTv', () => {
    it('should throw error if ID format is invalid', async () => {
      await expect(service.getTv('not-a-number')).rejects.toThrow(
        'Invalid id format',
      );
    });

    it('should return cached TV show if fresh and description is available', async () => {
      const dbTv = {
        tvdbId: 123,
        description: 'Has description',
        updatedAt: new Date(),
      };
      mockTvRepository.findByTvdbId.mockResolvedValue(dbTv);
      const mappedMedia = { id: '123', title: { romaji: 'Cached TV' } };
      mockTvRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getTv('123');

      expect(repository.findByTvdbId).toHaveBeenCalledWith(123);
      expect(repository.toMedia).toHaveBeenCalledWith(dbTv);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe(mappedMedia);
    });

    it('should fetch fresh data on cache miss', async () => {
      mockTvRepository.findByTvdbId.mockResolvedValue(null);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      const mockSeriesResponse = {
        data: {
          id: 123,
          name: 'TVDB Series',
          image: 'img-url',
          averageRuntime: 45,
          originalCountry: 'USA',
          originalLanguage: 'eng',
          artworks: [{ type: 1, image: 'banner-1' }],
          companies: [{ id: 1, name: 'HBO', companyType: { name: 'Network' } }],
          characters: [
            {
              id: 10,
              name: 'Protagonist',
              personName: 'Actor',
              image: 'c-img',
              peopleType: 'Actor',
            },
          ],
          trailers: [
            {
              id: 1,
              name: 'Trailer',
              url: 'youtube.com/trailer',
              language: 'eng',
            },
          ],
          seasons: [
            {
              id: 55,
              number: 1,
              type: { id: 1 },
              nameTranslations: [],
              image: 'season-img',
            },
          ],
        },
      };
      const mockTransResponse = {
        data: {
          name: 'Translated English Name',
          overview: 'Translated overview',
        },
      };
      const mockEpisodesResponse = {
        data: {
          episodes: [
            {
              id: 999,
              number: 1,
              seasonNumber: 1,
              name: 'Episode 1',
              overview: 'Overview 1',
              image: 'ep-img',
              aired: '2026-06-19',
            },
          ],
        },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSeriesResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockTransResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockEpisodesResponse),
        });

      const result = await service.getTv('123');

      expect(queueService.addJob).toHaveBeenCalledWith(123);
      expect(result.title.english).toBe('Translated English Name');
      expect(result.description).toBe('Translated overview');
      expect(result.bannerImage).toBe('banner-1');
      expect(result.studios?.[0]?.name).toBe('HBO');
      expect(result.seasons?.[0]?.episodeCount).toBe(1);
      expect(result.seasons?.[0]?.episodes?.[0]?.name).toBe('Episode 1');
    });

    it('should fall back to stale cached record if TVDB fetch throws error', async () => {
      const staleTv = { tvdbId: 123, updatedAt: new Date(0) };
      mockTvRepository.findByTvdbId.mockResolvedValue(staleTv);
      const mapped = { id: '123', title: { romaji: 'Stale TV Fallback' } };
      mockTvRepository.toMedia.mockReturnValue(mapped);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockRejectedValue(new Error('TVDB offline'));

      const result = await service.getTv('123');
      expect(result).toBe(mapped);
    });

    it('should throw NotFoundException if fetch fails and no cached record exists', async () => {
      mockTvRepository.findByTvdbId.mockResolvedValue(null);
      const mockLoginResponse = { data: { token: 'mock-token' } };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockRejectedValue(new Error('TVDB offline'));

      await expect(service.getTv('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ensureTv', () => {
    it('should return existing TV show if description and seasons are already cached', async () => {
      const existing = { tvdbId: 123, description: 'Exist', seasons: [] };
      mockTvRepository.findByTvdbId.mockResolvedValue(existing);

      const result = await service.ensureTv(123);
      expect(result).toBe(existing);
      expect(mockTvRepository.upsert).not.toHaveBeenCalled();
    });

    it('should fetch and upsert full details if not in DB', async () => {
      mockTvRepository.findByTvdbId.mockResolvedValue(null);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      const mockSeriesResponse = {
        data: { id: 123, name: 'Title', overview: 'Overview', seasons: [] },
      };
      const mockTransResponse = {
        data: { name: 'Eng Title', overview: 'Eng Overview' },
      };
      const mockEpisodesResponse = { data: { episodes: [] } };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSeriesResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockTransResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockEpisodesResponse),
        });

      const upserted = { tvdbId: 123, titleEnglish: 'Eng Title' };
      mockTvRepository.upsert.mockResolvedValue(upserted);

      const result = await service.ensureTv(123);
      expect(result).toBe(upserted);
      expect(mockTvRepository.upsert).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ description: 'Eng Overview' }),
      );
    });

    it('should fall back to upserting stub and queuing sync job if full TVDB fetch fails', async () => {
      mockTvRepository.findByTvdbId.mockResolvedValue(null);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockRejectedValue(new Error('TVDB offline'));

      const stub = { tvdbId: 123, titleRomaji: 'Stub Title' };
      mockTvRepository.upsert.mockResolvedValue(stub);

      const result = await service.ensureTv(123, 'Stub Title', 'stub-cover');

      expect(result).toBe(stub);
      expect(mockTvRepository.upsert).toHaveBeenCalledWith(123, {
        tvdbId: 123,
        titleRomaji: 'Stub Title',
        coverImage: 'stub-cover',
      });
      expect(queueService.addJob).toHaveBeenCalledWith(123);
    });
  });
});
