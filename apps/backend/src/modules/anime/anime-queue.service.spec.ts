import { Test, TestingModule } from '@nestjs/testing';
import { AnimeQueueService } from './anime-queue.service';
import { AnimeExternal } from './anime.external';
import { CacheService } from '../../providers/cache/cache.service';
import type { AnimeSearchEntity } from './anime.entities';

describe('AnimeQueueService', () => {
  let service: AnimeQueueService;
  let animeExternal: AnimeExternal;
  let cacheService: CacheService;

  const mockAnimeExternal = {
    search: jest.fn(),
  };

  const mockCacheService = {
    set: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Fast-forward setTimeout so tests don't wait
    jest.spyOn(global, 'setTimeout').mockImplementation((cb: any) => {
      if (typeof cb === 'function') {
        cb();
      }
      return {} as any;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimeQueueService,
        { provide: AnimeExternal, useValue: mockAnimeExternal },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<AnimeQueueService>(AnimeQueueService);
    animeExternal = module.get<AnimeExternal>(AnimeExternal);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addSearchRefresh and search queue processing', () => {
    const mockSearchResults: AnimeSearchEntity[] = [
      {
        id: 1,
        title: 'Naruto',
        secondaryTitle: null,
        coverImage: 'cover.jpg',
        format: 'TV',
        status: 'FINISHED',
        isAdult: false,
        averageScore: 80,
      },
    ];

    it('should fetch from AnimeExternal and update cache on search refresh', async () => {
      mockAnimeExternal.search.mockResolvedValue(mockSearchResults);

      // Initialize the queue listener
      service.onModuleInit();
      service.addSearchRefresh('Naruto', 'anime-search:naruto');

      // Allow async pipeline to execute
      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.search).toHaveBeenCalledWith('Naruto');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'anime-search:naruto',
        JSON.stringify(mockSearchResults),
        60 * 60,
      );
    });

    it('should not update cache if search returns empty results', async () => {
      mockAnimeExternal.search.mockResolvedValue([]);

      service.onModuleInit();
      service.addSearchRefresh('Empty', 'anime-search:empty');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.search).toHaveBeenCalledWith('Empty');
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should deduplicate identical pending searches', async () => {
      // Slow enough that first hasn't completed when second is added
      let resolveSearch!: (value: AnimeSearchEntity[]) => void;
      mockAnimeExternal.search.mockImplementation(() => {
        return new Promise<AnimeSearchEntity[]>((resolve) => {
          resolveSearch = resolve;
        });
      });

      service.onModuleInit();
      service.addSearchRefresh('Naruto', 'anime-search:naruto');
      service.addSearchRefresh('Naruto', 'anime-search:naruto');

      // Only one job should have been queued (the second is deduped)
      // Wait for the observable pipe to process
      await new Promise((resolve) => process.nextTick(resolve));

      // There should only be one call - but the mergeMap hasn't resolved yet,
      // so let's resolve it and check the final state
      resolveSearch!(mockSearchResults);
      await new Promise((resolve) => process.nextTick(resolve));

      // External should only be called once despite adding the same search twice
      expect(mockAnimeExternal.search).toHaveBeenCalledTimes(1);
    });

    it('should handle search errors gracefully and not crash the queue', async () => {
      mockAnimeExternal.search.mockRejectedValue(new Error('API error'));

      service.onModuleInit();
      service.addSearchRefresh('Naruto', 'anime-search:naruto');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.search).toHaveBeenCalled();
      expect(mockCacheService.set).not.toHaveBeenCalled();

      // Queue should still work after error - add another search
      mockAnimeExternal.search.mockResolvedValue(mockSearchResults);
      service.addSearchRefresh('OnePiece', 'anime-search:onepiece');

      await new Promise((resolve) => process.nextTick(resolve));

      expect(mockAnimeExternal.search).toHaveBeenCalledWith('OnePiece');
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'anime-search:onepiece',
        JSON.stringify(mockSearchResults),
        60 * 60,
      );
    });

    it('should process searches sequentially (concurrency 1)', async () => {
      const callOrder: number[] = [];
      mockAnimeExternal.search.mockImplementation(
        (query: string) =>
          new Promise<AnimeSearchEntity[]>((resolve) => {
            callOrder.push(Number(query));
            const results: AnimeSearchEntity[] = [
              {
                id: Number(query),
                title: query,
                secondaryTitle: null,
                coverImage: null,
                format: 'TV',
                status: 'FINISHED',
                isAdult: false,
                averageScore: null,
              },
            ];
            resolve(results);
          }),
      );

      service.onModuleInit();
      service.addSearchRefresh('1', 'cache:1');
      service.addSearchRefresh('2', 'cache:2');

      await new Promise((resolve) => process.nextTick(resolve));
      await new Promise((resolve) => process.nextTick(resolve));

      expect(callOrder).toEqual([1, 2]);
      expect(mockAnimeExternal.search).toHaveBeenCalledTimes(2);
    });
  });
});
