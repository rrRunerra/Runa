import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../providers/cache/cache.service';
import { RankingsRepository } from './rankings.repository';
import { RankingsService } from './rankings.service';

describe('RankingsService', () => {
  let service: RankingsService;
  let repository: jest.Mocked<RankingsRepository>;
  let cacheService: jest.Mocked<CacheService>;

  const mockRankedItems = [
    {
      rank: 1,
      id: 1,
      title: 'Fullmetal Alchemist: Brotherhood',
      secondaryTitle: 'Hagane no Renkinjutsushi',
      coverImage: 'https://example.com/fma.jpg',
      bannerImage: null,
      format: 'TV',
      status: 'FINISHED',
      year: 2009,
      season: 'SPRING',
      genres: ['Action', 'Adventure', 'Drama', 'Fantasy'],
      averageScore: 91.2,
      externalScore: 91.2,
      externalScoreSource: 'Aquila',
      externalScoreMax: 100,
      popularity: 120000,
      favorites: 45000,
      scoredCount: 95000,
      isAdult: false,
    },
    {
      rank: 2,
      id: 2,
      title: 'Steins;Gate',
      secondaryTitle: null,
      coverImage: 'https://example.com/sg.jpg',
      bannerImage: null,
      format: 'TV',
      status: 'FINISHED',
      year: 2011,
      season: 'SPRING',
      genres: ['Drama', 'Sci-Fi', 'Suspense'],
      averageScore: 90.8,
      externalScore: 90.8,
      externalScoreSource: 'Aquila',
      externalScoreMax: 100,
      popularity: 110000,
      favorites: 42000,
      scoredCount: 88000,
      isAdult: false,
    },
  ];

  beforeEach(async () => {
    const mockRepo = {
      getRankings: jest.fn().mockResolvedValue({
        items: mockRankedItems,
        totalCount: 2,
      }),
      getMetadata: jest.fn().mockResolvedValue({
        sources: [
          { id: 'aquila', name: 'Aquila Average Score', maxScore: 100 },
          { id: 'anilist', name: 'AniList Score', maxScore: 100 },
        ],
        genres: ['Action', 'Adventure', 'Drama', 'Fantasy', 'Sci-Fi'],
        years: [2026, 2025, 2024, 2015, 2011, 2009],
        seasons: ['WINTER', 'SPRING', 'SUMMER', 'FALL'],
        formats: ['TV', 'MOVIE', 'OVA'],
        statuses: ['FINISHED', 'RELEASING'],
      }),
    };

    const mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingsService,
        { provide: RankingsRepository, useValue: mockRepo },
        { provide: CacheService, useValue: mockCache },
      ],
    }).compile();

    service = module.get<RankingsService>(RankingsService);
    repository = module.get(RankingsRepository);
    cacheService = module.get(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRankings', () => {
    it('should return ranked media items correctly', async () => {
      const result = await service.getRankings('anime', {
        genres: 'Action',
        year: 2015,
      });

      expect(result).toBeDefined();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].rank).toBe(1);
      expect(result.metadata.totalCount).toBe(2);
      expect(repository.getRankings).toHaveBeenCalledWith('anime', {
        genres: 'Action',
        year: 2015,
      });
      expect(cacheService.set).toHaveBeenCalled();
    });

    it('should return cached results if available', async () => {
      const cachedResponse = {
        items: mockRankedItems,
        metadata: {
          totalCount: 2,
          limit: 100,
          page: 1,
          source: 'aquila',
          hasMore: false,
        },
      };
      cacheService.get.mockResolvedValueOnce(cachedResponse);

      const result = await service.getRankings('anime', {});

      expect(result).toEqual(cachedResponse);
      expect(repository.getRankings).not.toHaveBeenCalled();
    });

    it('should throw rrBadRequestException for invalid media type', async () => {
      await expect(service.getRankings('invalid_type', {})).rejects.toThrow();
    });
  });

  describe('getMetadata', () => {
    it('should return rankings metadata', async () => {
      const meta = await service.getMetadata('anime');
      expect(meta).toBeDefined();
      expect(meta.sources).toHaveLength(2);
      expect(meta.genres).toContain('Action');
      expect(repository.getMetadata).toHaveBeenCalledWith('anime');
    });
  });
});
