import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MovieService } from './movie.service';
import { PrismaService } from '../../providers/database/prisma.service';
import { MovieRepository } from './movie.repository';
import { MovieQueueService } from './movie-queue.service';
import { CacheService } from 'src/providers/cache/cache.service';
import { MovieExternal } from './movie.external';

describe('MovieService', () => {
  let service: MovieService;
  let repository: MovieRepository;
  let queueService: MovieQueueService;

  const mockPrisma = {};

  const mockMovieRepository = {
    findByTvdbId: jest.fn(),
    toMedia: jest.fn(),
    upsert: jest.fn(),
  };

  const mockMovieQueueService = {
    addJob: jest.fn(),
  };

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMovieExternal = {
    search: jest.fn(),
    fetchAndUpsertMovie: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.THETVDB_KEY = 'mock-tvdb-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovieService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MovieRepository, useValue: mockMovieRepository },
        { provide: MovieQueueService, useValue: mockMovieQueueService },
        { provide: CacheService, useValue: mockCacheService },
        { provide: MovieExternal, useValue: mockMovieExternal },
      ],
    }).compile();

    service = module.get<MovieService>(MovieService);
    repository = module.get<MovieRepository>(MovieRepository);
    queueService = module.get<MovieQueueService>(MovieQueueService);
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
            type: 'movie',
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

      const result = await service.search('MovieName');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api4.thetvdb.com/v4/login',
        expect.any(Object),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api4.thetvdb.com/v4/search?query=MovieName&type=movie&language=eng',
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
          format: 'movie',
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
        }) // 1st login
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSearchError),
        }) // 1st search fails
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        }) // 2nd login (re-auth)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockSearchSuccess),
        }); // retry search succeeds

      const result = await service.search('MovieName');
      expect(result.length).toBe(1);
    });
  });

  describe('getMovie', () => {
    it('should throw error if ID is NaN', async () => {
      await expect(service.getMovie('not-a-number')).rejects.toThrow(
        'Invalid id format',
      );
    });

    it('should return cached movie if fresh and description is available', async () => {
      const dbMovie = {
        tvdbId: 123,
        description: 'Has description',
        updatedAt: new Date(),
      };
      mockMovieRepository.findByTvdbId.mockResolvedValue(dbMovie);
      const mappedMedia = { id: '123', title: { romaji: 'Cached Movie' } };
      mockMovieRepository.toMedia.mockReturnValue(mappedMedia);

      const result = await service.getMovie('123');

      expect(repository.findByTvdbId).toHaveBeenCalledWith(123);
      expect(repository.toMedia).toHaveBeenCalledWith(dbMovie);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(result).toBe(mappedMedia);
    });

    it('should fetch fresh data on cache miss', async () => {
      mockMovieRepository.findByTvdbId.mockResolvedValue(null);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      const mockMovieResponse = {
        data: {
          id: 123,
          name: 'TVDB Movie',
          image: 'img-url',
          runtime: 120,
          originalCountry: 'USA',
          originalLanguage: 'eng',
          artworks: [{ type: 16, image: 'banner-16' }],
          studios: [{ id: 1, name: 'Paramount' }],
          characters: [
            {
              name: 'Protagonist',
              personName: 'Actor',
              image: 'c-img',
              peopleType: 'Actor',
            },
          ],
          trailers: [
            {
              id: 1,
              name: 'Teaser',
              url: 'youtube.com/teaser',
              language: 'eng',
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

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockMovieResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockTransResponse),
        });

      const result = await service.getMovie('123');

      expect(queueService.addJob).toHaveBeenCalledWith(123);
      expect(result.title.english).toBe('Translated English Name');
      expect(result.description).toBe('Translated overview');
      expect(result.bannerImage).toBe('banner-16');
      expect(result.studios?.[0]?.name).toBe('Paramount');
      expect(result.characters?.[0]?.name).toBe('Protagonist');
    });

    it('should fall back to stale cached record if TVDB fetch throws error', async () => {
      const staleMovie = { tvdbId: 123, updatedAt: new Date(0) };
      mockMovieRepository.findByTvdbId.mockResolvedValue(staleMovie);
      const mapped = { id: '123', title: { romaji: 'Stale Fallback' } };
      mockMovieRepository.toMedia.mockReturnValue(mapped);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockRejectedValue(new Error('TVDB offline'));

      const result = await service.getMovie('123');
      expect(result).toBe(mapped);
    });

    it('should throw NotFoundException if fetch fails and no cached record exists', async () => {
      mockMovieRepository.findByTvdbId.mockResolvedValue(null);
      const mockLoginResponse = { data: { token: 'mock-token' } };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockRejectedValue(new Error('TVDB offline'));

      await expect(service.getMovie('123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('ensureMovie', () => {
    it('should return existing movie if description is already cached', async () => {
      const existing = { tvdbId: 123, description: 'Exist' };
      mockMovieRepository.findByTvdbId.mockResolvedValue(existing);

      const result = await service.ensureMovie(123);
      expect(result).toBe(existing);
      expect(mockMovieRepository.upsert).not.toHaveBeenCalled();
    });

    it('should fetch and upsert full details if not in DB', async () => {
      mockMovieRepository.findByTvdbId.mockResolvedValue(null);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      const mockMovieResponse = {
        data: { id: 123, name: 'Title', overview: 'Overview' },
      };
      const mockTransResponse = {
        data: { name: 'Eng Title', overview: 'Eng Overview' },
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockMovieResponse),
        })
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockTransResponse),
        });

      const upserted = { tvdbId: 123, titleEnglish: 'Eng Title' };
      mockMovieRepository.upsert.mockResolvedValue(upserted);

      const result = await service.ensureMovie(123);
      expect(result).toBe(upserted);
      expect(mockMovieRepository.upsert).toHaveBeenCalledWith(
        123,
        expect.objectContaining({ description: 'Eng Overview' }),
      );
    });

    it('should fall back to upserting stub and queuing sync job if full TVDB fetch fails', async () => {
      mockMovieRepository.findByTvdbId.mockResolvedValue(null);

      const mockLoginResponse = { data: { token: 'mock-token' } };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: jest.fn().mockResolvedValue(mockLoginResponse),
        })
        .mockRejectedValue(new Error('TVDB offline'));

      const stub = { tvdbId: 123, titleRomaji: 'Stub Title' };
      mockMovieRepository.upsert.mockResolvedValue(stub);

      const result = await service.ensureMovie(123, 'Stub Title', 'stub-cover');

      expect(result).toBe(stub);
      expect(mockMovieRepository.upsert).toHaveBeenCalledWith(123, {
        tvdbId: 123,
        titleRomaji: 'Stub Title',
        coverImage: 'stub-cover',
      });
      expect(queueService.addJob).toHaveBeenCalledWith(123);
    });
  });
});
